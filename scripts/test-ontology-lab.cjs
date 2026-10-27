const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { scryptSync } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const compiled = path.join(root, "apps/server/dist/apps/server/src");
const { AppConfigService } = require(path.join(compiled, "config/app-config.service.js"));
const { PrismaService } = require(path.join(compiled, "prisma/prisma.service.js"));
const { SchedulerService } = require(path.join(compiled, "modules/scheduler/scheduler.service.js"));
const { CollectorsService } = require(path.join(compiled, "modules/collectors/collectors.service.js"));
const { WorksService } = require(path.join(compiled, "modules/works/works.service.js"));
const { AuthService } = require(path.join(compiled, "modules/auth/auth.service.js"));
const { validateEnvironment, seedLab, USER_ID, BRAND_ID } = require("./init-ontology-lab.cjs");

const env = {
  APP_ENVIRONMENT: "ontology-lab",
  APP_RUNTIME_MODE: "standard",
  SERVER_BOOT_MODE: "api",
  DATABASE_URL: `postgresql://ontology_lab:${"a1".repeat(32)}@ontology-postgres:5432/ontology_lab?schema=public`,
  AUTH_TOKEN_SECRET: "b2".repeat(32),
  OPENCLAW_INSTALL_TOKEN_SECRET: "c3".repeat(32),
  LAB_OPERATOR_PASSWORD: "d4".repeat(32),
  STORAGE_PROVIDER_MODE: "local",
  LOCAL_APP_DATA_ROOT: "/data",
  MANAGED_STORAGE_ROOT: "/data/storage",
  MATERIAL_LIBRARY_BASE_ROOT: "/data/materials",
  WEB_PUBLIC_BASE_URL: "http://127.0.0.1:23001",
  API_PUBLIC_BASE_URL: "http://127.0.0.1:23011/api",
  STANDARD_RUNTIME_UPDATE_MANIFEST_URL: "",
  DOCKER_STANDARD_UPDATE_MANIFEST_URL: "",
  OSS_ACCESS_KEY_ID: "",
  OSS_ACCESS_KEY_SECRET: "",
  OSS_BUCKET: "",
  OSS_REGION: "",
};

async function withEnv(overrides, fn) {
  const changes = { ...env, ...overrides };
  const previous = Object.fromEntries(Object.keys(changes).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(changes)) process.env[key] = value;
    return await fn(new AppConfigService());
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("valid lab config, init password and legacy scheduling", async () => {
  await withEnv({}, (config) => {
    config.assertOntologyLabSafety();
    assert.equal(config.shouldRunAutomaticJobs(), false);
    assert.equal(validateEnvironment(), env.LAB_OPERATOR_PASSWORD);
  });
  await withEnv({ APP_ENVIRONMENT: "" }, (config) => {
    assert.equal(config.shouldRunAutomaticJobs(), true);
    assert.throws(validateEnvironment, /explicit ontology-lab/);
  });
});

for (const [label, overrides] of Object.entries({
  "missing DB": { DATABASE_URL: "" },
  "original host": { DATABASE_URL: env.DATABASE_URL.replace("ontology-postgres", "postgres") },
  "original database": { DATABASE_URL: env.DATABASE_URL.replace("/ontology_lab?", "/ai_omni_ops?") },
  "foreign schema": { DATABASE_URL: env.DATABASE_URL.replace("schema=public", "schema=production") },
  "weak secret": { AUTH_TOKEN_SECRET: "ai-omni-ops-system-dev-secret" },
  "shared secrets": { OPENCLAW_INSTALL_TOKEN_SECRET: env.AUTH_TOKEN_SECRET },
  "worker": { SERVER_BOOT_MODE: "worker" },
  "local single user": { APP_RUNTIME_MODE: "local-single-user" },
  "shared storage": { MANAGED_STORAGE_ROOT: "/original/storage" },
  "old public URL": { API_PUBLIC_BASE_URL: "http://127.0.0.1:13011/api" },
  "inherited updater": { STANDARD_RUNTIME_UPDATE_MANIFEST_URL: "https://example.invalid/update" },
  "cloud storage": {
    OSS_ACCESS_KEY_ID: "test-only", OSS_ACCESS_KEY_SECRET: "test-only",
    OSS_BUCKET: "test-only", OSS_REGION: "test-only",
  },
})) {
  test(`reject ${label}`, () => withEnv(overrides, (config) => {
    assert.throws(() => config.assertOntologyLabSafety(), /LAB_CONFIG/);
  }));
}

test("initializer refuses an absent operator password before schema execution", () =>
  withEnv({ LAB_OPERATOR_PASSWORD: "" }, () => {
    assert.throws(validateEnvironment, /operator password/);
  }));

test("rejects an inaccessible explicit brand in lab and legacy environments", async () => {
  const auth = new AuthService({
    canUseDatabase: async () => true,
    user: { findUnique: async () => ({ id: USER_ID, status: "ACTIVE", systemRole: "USER" }) },
  });
  auth.verifyToken = () => ({ typ: "access", sub: USER_ID });
  auth.listAccessibleBrands = async () => [{ id: BRAND_ID }];
  const headers = { authorization: "Bearer test-only", "x-brand-id": "foreign-brand" };
  await withEnv({}, async () => {
    await assert.rejects(auth.resolveRequestAuthContext(headers), (error) => error.getStatus?.() === 403);
    const valid = await auth.resolveRequestAuthContext({ ...headers, "x-brand-id": BRAND_ID });
    assert.equal(valid.brandId, BRAND_ID);
    const inferred = await auth.resolveRequestAuthContext({ authorization: "Bearer test-only" });
    assert.equal(inferred.brandId, BRAND_ID);
  });
  await withEnv({ APP_ENVIRONMENT: "" }, async () => {
    await assert.rejects(auth.resolveRequestAuthContext(headers), (error) => error.getStatus?.() === 403);
  });
});

test("lab rejects missing and disconnected DB; legacy still returns false", async () => {
  for (const environment of ["ontology-lab", ""]) {
    for (const databaseUrl of ["", env.DATABASE_URL]) {
      await withEnv({ APP_ENVIRONMENT: environment, DATABASE_URL: databaseUrl }, async (config) => {
        const prisma = new PrismaService(config);
        prisma.$connect = async () => { throw new Error("simulated outage with private details"); };
        if (environment) {
          await assert.rejects(prisma.canUseDatabase(), (error) =>
            error.getStatus() === 503 && !error.message.includes("private details"));
        } else {
          assert.equal(await prisma.canUseDatabase(), false);
        }
        await prisma.$disconnect();
      });
    }
  }
});

test("healthy lab DB returns true", () => withEnv({}, async (config) => {
  const prisma = new PrismaService(config);
  prisma.$connect = async () => {};
  prisma.$queryRawUnsafe = async () => [{ "?column?": 1 }];
  assert.equal(await prisma.canUseDatabase(), true);
  await prisma.$disconnect();
}));

test("lab registers no timers or startup catch-up", () => withEnv({}, async (config) => {
  const scheduler = new SchedulerService(config);
  let called = 0;
  scheduler.registerDailyJob({
    name: "must-not-run", hour: 0, runOnStartupIfMissed: true,
    onTick: () => { called++; },
  });
  await new Promise(setImmediate);
  assert.equal(scheduler.dailyJobs.size, 0);
  assert.equal(called, 0);
  scheduler.onApplicationShutdown();
}));

test("legacy scheduler registration preserved", () => withEnv({ APP_ENVIRONMENT: "" }, (config) => {
  const scheduler = new SchedulerService(config);
  try {
    scheduler.registerDailyJob({ name: "legacy", hour: 23, onTick() {} });
    assert.equal(scheduler.dailyJobs.size, 1);
  } finally {
    scheduler.onApplicationShutdown();
  }
}));

test("actual collector and works hooks exit before recovery", () => withEnv({}, (config) => {
  const context = {
    appConfigService: config,
    logger: { log() {} },
    get heavyRecoveryPollingEnabled() { throw new Error("works recovery reached"); },
    isProductionStartupThrottleEnabled() { throw new Error("collector recovery reached"); },
  };
  CollectorsService.prototype.onModuleInit.call(context);
  WorksService.prototype.onModuleInit.call(context);
}));

function memoryPrisma() {
  const rows = { user: null, brand: null, brandMember: null };
  const tx = Object.fromEntries(Object.keys(rows).map((model) => [model, {
    async findUnique() { return rows[model]; },
    async create({ data }) { rows[model] = structuredClone(data); return rows[model]; },
  }]));
  return { rows, $transaction: (fn) => fn(tx) };
}

test("seed creates synthetic identity with real scrypt format, without provider keys", async () => {
  const db = memoryPrisma();
  assert.deepEqual(await seedLab(db, env.LAB_OPERATOR_PASSWORD), { userId: USER_ID, brandId: BRAND_ID });
  const [scheme, salt, digest] = db.rows.user.passwordHash.split("$");
  assert.equal(scheme, "scrypt");
  assert.equal(scryptSync(env.LAB_OPERATOR_PASSWORD, salt, 64).toString("hex"), digest);
  assert.equal(db.rows.user.pointsBalance, 0);
  assert.equal(db.rows.user.systemRole, "USER");
});

test("repeated seed preserves password, disabled status, balance and customized brand", async () => {
  const db = memoryPrisma();
  await seedLab(db, env.LAB_OPERATOR_PASSWORD);
  Object.assign(db.rows.user, { status: "DISABLED", passwordHash: "custom", pointsBalance: 7 });
  db.rows.brand.brandName = "Customized";
  db.rows.brandMember.status = "REMOVED";
  const before = structuredClone(db.rows);
  await seedLab(db, "different-password");
  assert.deepEqual(db.rows, before);
});

test("seed refuses identity or ownership conflicts", async () => {
  const db = memoryPrisma();
  db.rows.user = { id: USER_ID, email: "foreign@example.invalid" };
  await assert.rejects(seedLab(db, env.LAB_OPERATOR_PASSWORD), /identity conflict/);
  db.rows.user = null;
  db.rows.brand = { id: BRAND_ID, ownerUserId: "someone-else" };
  await assert.rejects(seedLab(db, env.LAB_OPERATOR_PASSWORD), /ownership conflict/);
  assert.equal(db.rows.user, null);
});

test("build context excludes secrets", () => {
  const ignore = readFileSync(path.join(root, ".dockerignore"), "utf8");
  assert.ok(ignore.split(/\r?\n/).includes("**/.env"));
  assert.ok(ignore.split(/\r?\n/).includes("**/.env.*"));
});

test("lab image checks OpenSSL and uses bounded cached dependency downloads", () => {
  const file = readFileSync(path.join(root, "docker/ontology-lab.Dockerfile"), "utf8");
  assert.match(file, /FROM node:22-bookworm AS dependencies/);
  assert.match(file, /FROM dependencies AS media-runtime/);
  assert.match(file, /openssl version && test -f \/etc\/ssl\/certs\/ca-certificates.crt/);
  assert.match(file, /type=cache,id=ontology-lab-npm/);
  assert.match(file, /--fetch-timeout=60000/);
  assert.match(file, /--fetch-retries=1/);
  assert.match(file, /ARG INSTALL_LOCAL_OCR=0/);
  assert.match(file, /ARG INSTALL_LOCAL_ASR=0/);
  assert.match(file, /ARG LOCAL_ASR_PRELOAD_WHISPER_MODEL=small/);
  assert.match(file, /docker\/local-ocr-requirements\.txt/);
  assert.match(file, /docker\/local-asr-requirements\.txt/);
  assert.match(file, /from faster_whisper import WhisperModel/);
  assert.match(file, /npm run prisma:generate && npm run build:server/);
});

test("resolved compose isolates resources, loopback ports, secrets and network", () => {
  const result = spawnSync("docker", [
    "compose", "-p", "ai-omni-ontology-lab",
    "-f", "docker/docker-compose.ontology-lab.yml", "config", "--format", "json",
  ], {
    cwd: root, encoding: "utf8", timeout: 30000,
    env: {
      ...process.env,
      LAB_DATABASE_PASSWORD: "a1".repeat(32),
      LAB_AUTH_TOKEN_SECRET: env.AUTH_TOKEN_SECRET,
      LAB_INSTALL_TOKEN_SECRET: env.OPENCLAW_INSTALL_TOKEN_SECRET,
      LAB_OPERATOR_PASSWORD: env.LAB_OPERATOR_PASSWORD,
    },
  });
  assert.equal(result.status, 0, "docker compose config must succeed");
  const config = JSON.parse(result.stdout);
  assert.equal(config.name, "ai-omni-ontology-lab");
  assert.equal(config.networks["lab-internal"].internal, true);
  assert.equal(config.services["ontology-postgres"].ports, undefined);
  assert.equal(config.services.server.environment.AUTH_TOKEN_SECRET, env.AUTH_TOKEN_SECRET);
  assert.equal(config.services.server.environment.LAB_OPERATOR_PASSWORD, undefined);
  assert.equal(config.services.server.environment.APP_ENVIRONMENT, "ontology-lab");
  assert.equal(config.services.server.environment.VIDEO_TRANSCRIPT_ASR_PRIMARY, "whisper");
  assert.equal(config.services.server.environment.VIDEO_TRANSCRIPT_ASR_FALLBACK, "whisper");
  assert.equal(config.services.server.environment.LOCAL_ASR_PYTHON_BIN, "python3");
  assert.equal(config.services.server.environment.WHISPER_MODEL_NAME, "small");
  assert.equal(config.services.server.environment.WHISPER_DEVICE, "cpu");
  assert.equal(config.services.server.environment.WHISPER_COMPUTE_TYPE, "int8");
  assert.equal(config.services.server.build.args.INSTALL_LOCAL_OCR, "1");
  assert.equal(config.services.server.build.args.INSTALL_LOCAL_ASR, "0");
  assert.equal(config.services.server.build.args.LOCAL_ASR_PRELOAD_WHISPER_MODEL, "small");
  for (const service of ["server", "db-init", "web"]) {
    assert.equal(config.services[service].build.dockerfile, "docker/ontology-lab.Dockerfile");
    assert.equal(config.services[service].build.target, service === "web" ? "web" : "server");
  }
  for (const [name, service] of Object.entries(config.services)) {
    assert.equal(service.container_name, undefined);
    assert.deepEqual(
      Object.keys(service.networks).sort(),
      name === "ingress" ? ["lab-ingress", "lab-internal"] : name === "server" ? ["lab-egress", "lab-internal"] : ["lab-internal"],
    );
    if (name !== "ingress") assert.equal(service.ports, undefined);
    for (const port of service.ports || []) assert.equal(port.host_ip, "127.0.0.1");
  }
  const serverVolumes = config.services.server.volumes || [];
  assert.equal(serverVolumes.find((v) => v.target === "/data")?.type, "volume");
  assert.equal(serverVolumes.find((v) => v.target === "/expert-source")?.type, "bind");
  assert.equal(serverVolumes.find((v) => v.target === "/expert-source")?.read_only, true);
  for (const [name, service] of Object.entries(config.services)) {
    if (name !== "server") {
      for (const volume of service.volumes || []) assert.equal(volume.type, "volume");
    }
  }
  assert.equal(config.services.ingress.environment, undefined);
  assert.equal(config.services.ingress.read_only, true);
  assert.deepEqual(config.services.ingress.cap_drop, ["ALL"]);
  assert.equal(config.services.ingress.sysctls["net.ipv4.ip_forward"], "0");
  assert.deepEqual(config.services.ingress.ports.map((port) => String(port.published)).sort(), ["23001", "23011"]);
  for (const volume of Object.values(config.volumes)) {
    assert.ok(volume.name.startsWith("ai-omni-ontology-lab_"));
  }
});

test("ingress only relays to fixed lab services", () => {
  const { routes } = require("./ontology-lab-ingress.cjs");
  assert.deepEqual(routes, [{ port: 3001, host: "web" }, { port: 3011, host: "server" }]);
  assert.ok(Object.isFrozen(routes) && routes.every(Object.isFrozen));
});
