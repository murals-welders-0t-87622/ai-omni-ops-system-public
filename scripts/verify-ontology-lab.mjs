import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = "D:/workbuddy-test-runtime/ai-omni-ontology-lab";
const api = "http://127.0.0.1:23011/api";
const brandId = "brand-demo-cleaning";
const topicId = "lab-m2-topic-20260926-04";
const outageTopicId = "lab-m2-outage-probe-20260926-04";
const mode = process.argv[2];
const comparisonBaseline = process.argv[3] === "after-runtime-restart"
  ? "original-containers-after-runtime-restart.json"
  : "original-containers-before.json";
const composeArgs = [
  "compose", "--env-file", `${runtime}/lab.env`, "-p", "ai-omni-ontology-lab",
  "-f", "docker/docker-compose.ontology-lab.yml",
];
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}
function docker(args) {
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8", timeout: 60000 });
  assert.equal(result.status, 0, `Docker command failed: ${args.slice(0, 2).join(" ")}`);
  return result.stdout.trim();
}
function originalContainers() {
  const format = '{"name":{{json .Name}},"id":{{json .Id}},"startedAt":{{json .State.StartedAt}},"status":{{json .State.Status}}}';
  return docker(["inspect", "ai-omni-server", "ai-omni-web", "ai-omni-postgres", "--format", format])
    .split(/\r?\n/).map(JSON.parse);
}
function save(name, value) {
  writeFileSync(path.join(runtime, name), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}
async function request(route, options = {}) {
  const response = await fetch(`${api}${route}`, { ...options, signal: AbortSignal.timeout(20000) });
  return { status: response.status, body: await response.json() };
}
async function rpc(method, params, headers = {}) {
  const result = await request("/openclaw/mcp", {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: `lab-${Date.now()}`, method, params }),
  });
  return result;
}
async function call(name, args, headers) {
  const result = await rpc("tools/call", { name, arguments: args }, headers);
  assert.ok([200, 201].includes(result.status), `${name}: HTTP status ${result.status}`);
  assert.equal(result.body.result?.isError, false, `${name}: tool error`);
  return JSON.parse(result.body.result.content[0].text);
}
function sql(query) {
  return docker([...composeArgs, "exec", "-T", "ontology-postgres",
    "psql", "-U", "ontology_lab", "-d", "ontology_lab", "-At", "-c", query]);
}
function seedFingerprint() {
  return sql(`SELECT md5(
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id)::text FROM "User" t) ||
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id)::text FROM "Brand" t) ||
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id)::text FROM "BrandMember" t)
  );`);
}
function topicCount(id = topicId) {
  return Number(sql(`SELECT count(*) FROM "BusinessAsset" a,
    jsonb_array_elements(a."metadataJson"->'items') i
    WHERE a."brandId"='${brandId}' AND a."metadataJson"->>'kind'='DOUYIN_TOPIC_LIBRARY'
    AND i->>'id'='${id}';`));
}
function headersFromSession() {
  const session = JSON.parse(readFileSync(`${runtime}/validation-session.json`, "utf8"));
  return { authorization: `Bearer ${session.accessToken}`, "x-brand-id": brandId };
}
function verifyResources() {
  const ids = docker([...composeArgs, "ps", "-a", "-q"]).split(/\r?\n/).filter(Boolean);
  const containers = JSON.parse(docker(["inspect", ...ids]));
  for (const service of ["ontology-postgres", "server", "web", "db-init", "ingress"]) {
    const container = containers.find((item) => item.Config.Labels["com.docker.compose.service"] === service);
    check(`${service} belongs to lab project`, container?.Config.Labels["com.docker.compose.project"] === "ai-omni-ontology-lab");
    const allowedNetworks = service === "ingress"
      ? ["ai-omni-ontology-lab_lab-ingress", "ai-omni-ontology-lab_lab-internal"]
      : ["ai-omni-ontology-lab_lab-internal"];
    check(`${service} only joins its designated networks`,
      JSON.stringify(Object.keys(container.NetworkSettings.Networks).sort()) === JSON.stringify(allowedNetworks));
    check(`${service} has no host bind mounts`, container.Mounts.every((mount) => mount.Type === "volume"
      && mount.Name.startsWith("ai-omni-ontology-lab_")));
    const bindings = container.HostConfig.PortBindings || {};
    if (service === "ingress") {
      check("ingress only publishes expected loopback ports", Object.keys(bindings).length === 2
        && [["3011/tcp", "23011"], ["3001/tcp", "23001"]].every(([internal, external]) =>
          bindings[internal]?.length === 1 && bindings[internal][0].HostIp === "127.0.0.1"
          && bindings[internal][0].HostPort === external));
      check("ingress has no credentials or data mounts", container.Mounts.length === 0
        && !container.Config.Env.some((entry) => /^(DATABASE_URL|AUTH_TOKEN_SECRET|LAB_|OPENCLAW_)/.test(entry)));
      check("ingress is non-root, read-only and cannot forward IP", container.Config.User === "node"
        && container.HostConfig.ReadonlyRootfs && container.HostConfig.CapDrop.includes("ALL")
        && container.HostConfig.Sysctls["net.ipv4.ip_forward"] === "0");
    } else {
      check(`${service} has no published ports`, Object.keys(bindings).length === 0);
    }
    if (service === "server" || service === "ontology-postgres") {
      const volume = service === "server" ? ["lab-storage", "/data"] : ["lab-postgres", "/var/lib/postgresql/data"];
      check(`${service} mounts its own data volume`, container.Mounts.length === 1
        && container.Mounts[0].Name === `ai-omni-ontology-lab_${volume[0]}`
        && container.Mounts[0].Destination === volume[1]);
    }
  }
}
async function baseline() {
  save("original-containers-before.json", originalContainers());
  const health = await fetch("http://127.0.0.1:13011/api/health", { signal: AbortSignal.timeout(15000) });
  const data = await health.json();
  check("original API healthy before deployment", health.ok && data.status === "ok");
  check("lab containers initially absent", !docker([...composeArgs, "ps", "-a", "-q"]));
  check("lab volumes initially absent", !docker(["volume", "ls", "--filter",
    "label=com.docker.compose.project=ai-omni-ontology-lab", "--format", "{{.Name}}"]));
}
async function seed() {
  check("isolated database identity", sql("SELECT current_database() || ':' || current_user;") === "ontology_lab:ontology_lab");
  check("one synthetic user and brand", sql('SELECT (SELECT count(*) FROM "User") || \':\' || (SELECT count(*) FROM "Brand");') === "1:1");
  const before = seedFingerprint();
  docker([...composeArgs, "run", "--rm", "--no-deps", "db-init"]);
  check("second real seed leaves user, brand and membership unchanged", seedFingerprint() === before);
}
async function smoke() {
  verifyResources();
  const health = await request("/health");
  check("lab database healthy", health.status === 200 && health.body.status === "ok" && health.body.database.reachable);
  const credentials = Object.fromEntries(readFileSync(`${runtime}/lab.env`, "utf8").trim().split(/\r?\n/).map((line) => line.split("=")));
  const login = await request("/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ account: "operator@ontology-lab.invalid", password: credentials.LAB_OPERATOR_PASSWORD }),
  });
  check("real login identifies synthetic operator", login.status === 201 && login.body.user?.id === "ontology_lab_operator");
  check("login binds lab brand", login.body.currentBrandId === brandId);
  if (!existsSync(`${runtime}/validation-session.json`)) {
    save("validation-session.json", { accessToken: login.body.accessToken });
  }
  const headers = { authorization: `Bearer ${login.body.accessToken}`, "x-brand-id": brandId };
  const unauthorized = await rpc("tools/call", { name: "get_current_brand_context", arguments: {} });
  check("anonymous business call rejected", unauthorized.body.result?.isError === true || unauthorized.status === 401);
  const tools = await rpc("tools/list");
  check("write tool discovered", tools.body.result?.tools?.some((tool) => tool.name === "create_brand_growth_topic_library_item"));
  const context = await call("get_current_brand_context", {}, headers);
  check("MCP returns lab identity", context.data?.brand?.id === brandId);
  const wrongBrand = await rpc("tools/call", { name: "get_brand_products", arguments: {} },
    { ...headers, "x-brand-id": "lab-nonexistent-brand" });
  check("foreign brand rejected", wrongBrand.body.result?.isError === true || [401, 403].includes(wrongBrand.status));
  await call("get_brand_products", {}, headers);
  const topic = {
    id: topicId, topicTitle: "Lab isolation validation",
    topicContent: "Synthetic test only. No real brand promise, generation or publishing.",
    topicPlatform: "抖音", contentFormat: "视频", presentationFormat: "Test record",
    topicGoal: "Verify isolated persistence", reusable: false,
    selectedAt: "2026-09-26T12:00:00.000Z",
  };
  const before = await call("get_brand_growth_topic_library_workspace", {}, headers);
  const items = before.data?.topicLibrary;
  assert.ok(Array.isArray(items), "topic workspace shape");
  if (!items.some((item) => item.id === topicId)) {
    // Persist intent before the one allowed write. Unknown results require read-back, not replay.
    if (existsSync(`${runtime}/topic-write-intent.json`)) throw new Error("Unknown prior write; reconcile without replay");
    save("topic-write-intent.json", { topicId, brandId, topic });
    await call("create_brand_growth_topic_library_item", { item: topic }, headers);
  }
  const after = await call("get_brand_growth_topic_library_workspace", {}, headers);
  const saved = after.data?.topicLibrary?.filter((item) => item.id === topicId) || [];
  check("single MCP topic read back", saved.length === 1 && saved[0].topicContent === topic.topicContent);
  check("topic present exactly once in PostgreSQL", topicCount() === 1);
  check("no generated business tasks", sql('SELECT count(*) FROM "Task";') === "0");
  const network = JSON.parse(docker(["network", "inspect", "ai-omni-ontology-lab_lab-internal"]));
  check("runtime network is internal", network[0].Internal === true);
  const outbound = docker([...composeArgs, "exec", "-T", "server", "node", "-e",
    "const n=require('net');const s=n.connect(443,'1.1.1.1');s.setTimeout(2000);s.on('connect',()=>{console.log('CONNECTED');s.destroy()});s.on('timeout',()=>{console.log('BLOCKED');s.destroy()});s.on('error',()=>console.log('BLOCKED'));"]);
  check("external TCP connection blocked", outbound === "BLOCKED");
  const runtimeCheck = JSON.parse(docker([...composeArgs, "exec", "-T", "server", "node", "-e",
    "const fs=require('fs');const {AppConfigService}=require('./apps/server/dist/apps/server/src/config/app-config.service.js');const c=new AppConfigService();c.assertOntologyLabSafety();console.log(JSON.stringify({lab:c.isOntologyLab(),automatic:c.shouldRunAutomaticJobs(),envInImage:fs.existsSync('/app/.env')||fs.existsSync('/app/.env.local'),uid:process.getuid()}));"]));
  check("running config and secrets pass lab safety checks", runtimeCheck.lab && !runtimeCheck.automatic);
  check("environment files absent from image", !runtimeCheck.envInImage);
  const web = await fetch("http://127.0.0.1:23001/login", { signal: AbortSignal.timeout(15000) });
  check("web login route served", web.status === 200 && (await web.text()).includes("<html"));
  const proxied = await fetch("http://127.0.0.1:23001/api/health", { signal: AbortSignal.timeout(15000) });
  check("web proxy reaches healthy lab API", proxied.ok && (await proxied.json()).status === "ok");
  save(`runtime-user-${Date.now()}.json`, { serverUid: runtimeCheck.uid });
}
async function outage() {
  const health = await request("/health");
  check("health fails closed while DB stopped", health.status === 503);
  const login = await request("/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ account: "operator@ontology-lab.invalid", password: "not-a-real-password" }),
  });
  check("login cannot fall back to mock while DB stopped", login.status === 503);
  const result = await rpc("tools/call", { name: "get_brand_products", arguments: {} }, headersFromSession());
  check("MCP business read fails while DB stopped", result.body.result?.isError === true || result.status === 503);
  const write = await rpc("tools/call", {
    name: "create_brand_growth_topic_library_item",
    arguments: { item: { id: outageTopicId, topicTitle: "Must not persist during outage", topicContent: "Negative persistence test" } },
  }, headersFromSession());
  check("MCP business write fails while DB stopped", write.body.result?.isError === true || write.status === 503);
}
async function recovery() {
  const health = await request("/health");
  check("database healthy after restart", health.status === 200 && health.body.status === "ok");
  const read = await call("get_brand_growth_topic_library_workspace", {}, headersFromSession());
  check("topic survives database restart", read.data?.topicLibrary?.filter((item) => item.id === topicId).length === 1 && topicCount() === 1);
  check("outage write was not persisted", topicCount(outageTopicId) === 0);
  assert.deepEqual(originalContainers(), JSON.parse(readFileSync(`${runtime}/${comparisonBaseline}`, "utf8")));
  check("original container IDs and start times unchanged", true);
  const original = await fetch("http://127.0.0.1:13011/api/health", { signal: AbortSignal.timeout(15000) });
  check("original API remains healthy", original.ok && (await original.json()).status === "ok");
}
async function paused() {
  for (const url of ["http://127.0.0.1:23011/api/health", "http://127.0.0.1:23001/login"]) {
    await assert.rejects(fetch(url, { signal: AbortSignal.timeout(5000) }));
  }
  check("lab endpoints are unavailable while lab is stopped", true);
  assert.deepEqual(originalContainers(), JSON.parse(readFileSync(`${runtime}/${comparisonBaseline}`, "utf8")));
  const original = await fetch("http://127.0.0.1:13011/api/health", { signal: AbortSignal.timeout(15000) });
  check("original containers unchanged and API healthy while lab stopped", original.ok && (await original.json()).status === "ok");
}
async function restartBaseline() {
  const before = JSON.parse(readFileSync(`${runtime}/original-containers-before.json`, "utf8"));
  const current = originalContainers();
  assert.deepEqual(current.map(({ id }) => id), before.map(({ id }) => id));
  check("original container identities match historical baseline", true);
  const original = await fetch("http://127.0.0.1:13011/api/health", { signal: AbortSignal.timeout(15000) });
  check("original API healthy before authorized lab-only restoration", original.ok && (await original.json()).status === "ok");
  save("original-containers-after-runtime-restart.json", current);
  check("separate post-restart baseline saved without replacing history", true);
}
async function resume() {
  const snapshot = `original-containers-before-resume-${Date.now()}.json`;
  save(snapshot, originalContainers());
  check(`resume snapshot saved: ${snapshot}`, true);
  assert.deepEqual(originalContainers(), JSON.parse(readFileSync(`${runtime}/${comparisonBaseline}`, "utf8")));
  check("original container IDs and start times match selected comparison baseline", true);
  verifyResources();
  const health = await request("/health");
  check("lab API healthy after restoration", health.status === 200 && health.body.status === "ok" && health.body.database.reachable);
  const credentials = Object.fromEntries(readFileSync(`${runtime}/lab.env`, "utf8").trim().split(/\r?\n/).map((line) => line.split("=")));
  const login = await request("/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ account: "operator@ontology-lab.invalid", password: credentials.LAB_OPERATOR_PASSWORD }),
  });
  check("real login works after resume", login.status === 201 && login.body.user?.id === "ontology_lab_operator");
  const headers = existsSync(`${runtime}/validation-session.json`)
    ? headersFromSession()
    : { authorization: `Bearer ${login.body.accessToken}`, "x-brand-id": brandId };
  const context = await call("get_current_brand_context", {}, headers);
  check("MCP returns lab brand after resume", context.data?.brand?.id === brandId);
  const read = await call("get_brand_growth_topic_library_workspace", {}, headers);
  const items = read.data?.topicLibrary || [];
  check("topic survives external lab restarts", items.some((item) => item.id === topicId) && topicCount() === 1);
  check("no outage writes leaked", topicCount(outageTopicId) === 0);
  check("no spurious business tasks created", sql('SELECT count(*) FROM "Task";') === "0");
  const network = JSON.parse(docker(["network", "inspect", "ai-omni-ontology-lab_lab-internal"]));
  check("runtime network remains internal", network[0].Internal === true);
  const outbound = docker([...composeArgs, "exec", "-T", "server", "node", "-e",
    "const n=require('net');const s=n.connect(443,'1.1.1.1');s.setTimeout(2000);s.on('connect',()=>{console.log('CONNECTED');s.destroy()});s.on('timeout',()=>{console.log('BLOCKED');s.destroy()});s.on('error',()=>console.log('BLOCKED'));"]);
  check("external TCP remains blocked after resume", outbound === "BLOCKED");
  const web = await fetch("http://127.0.0.1:23001/login", { signal: AbortSignal.timeout(15000) });
  check("web route reachable after resume", web.status === 200 && (await web.text()).includes("<html"));
  const proxied = await fetch("http://127.0.0.1:23001/api/health", { signal: AbortSignal.timeout(15000) });
  check("ingress proxies API health after resume", proxied.ok && (await proxied.json()).status === "ok");
  const original = await fetch("http://127.0.0.1:13011/api/health", { signal: AbortSignal.timeout(15000) });
  check("original API stays healthy throughout lab restoration", original.ok && (await original.json()).status === "ok");
}
const actions = { baseline, seed, smoke, outage, recovery, paused, "restart-baseline": restartBaseline, resume };
try {
  assert.ok(actions[mode], "unknown verification mode");
  await actions[mode]();
  const result = { mode, status: "passed", at: new Date().toISOString(), comparisonBaseline, checks };
  save(`verification-${mode}-${Date.now()}.json`, result);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ mode, status: "failed", checks, error: error.message }));
  process.exitCode = 1;
}
