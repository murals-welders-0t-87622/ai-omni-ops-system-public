const { randomBytes, scryptSync } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { AppConfigService } = require("../apps/server/dist/apps/server/src/config/app-config.service.js");

const USER_ID = "ontology_lab_operator";
const BRAND_ID = "brand-demo-cleaning";

function validateEnvironment() {
  const config = new AppConfigService();
  if (!config.isOntologyLab()) throw new Error("LAB_INIT: explicit ontology-lab environment is required");
  config.assertOntologyLabSafety();
  const password = process.env.LAB_OPERATOR_PASSWORD || "";
  if (!/^[a-f0-9]{64}$/.test(password)) {
    throw new Error("LAB_INIT: operator password must be 32 random bytes encoded as hex");
  }
  return password;
}

async function seedLab(prisma, password) {
  return prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { id: USER_ID } });
    const existingBrand = await tx.brand.findUnique({ where: { id: BRAND_ID } });
    if (existingUser && existingUser.email !== "operator@ontology-lab.invalid") {
      throw new Error("LAB_INIT: operator identity conflict; refusing to overwrite");
    }
    if (existingBrand && existingBrand.ownerUserId !== USER_ID) {
      throw new Error("LAB_INIT: brand ownership conflict; refusing to overwrite");
    }
    if (!existingUser) {
      const salt = randomBytes(16).toString("hex");
      await tx.user.create({
        data: {
          id: USER_ID,
          mobile: "19900009999",
          email: "operator@ontology-lab.invalid",
          nickname: "Ontology Lab Operator",
          passwordHash: `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`,
          status: "ACTIVE",
          membership: "PRO",
          systemRole: "USER",
          pointsBalance: 0,
        },
      });
    }
    if (!existingBrand) {
      await tx.brand.create({
        data: {
          id: BRAND_ID,
          ownerUserId: USER_ID,
          brandName: "Ontology Lab Cleaning (TEST ONLY)",
          industry: "Cleaning equipment",
          brandDescription: "Synthetic test brand. No verified product or service promises.",
          enterpriseIntro: "Isolated lab data. Not a real company.",
        },
      });
    }
    const membership = await tx.brandMember.findUnique({
      where: { brandId_userId: { brandId: BRAND_ID, userId: USER_ID } },
    });
    if (!membership) {
      await tx.brandMember.create({
        data: { brandId: BRAND_ID, userId: USER_ID, role: "OWNER", status: "ACTIVE" },
      });
    }
    return { userId: USER_ID, brandId: BRAND_ID };
  });
}

async function main() {
  const password = validateEnvironment();
  const root = path.resolve(__dirname, "..");
  // Validate the target before schema writes; never accept destructive schema changes.
  const result = spawnSync(process.execPath, [
    require.resolve("prisma/build/index.js"),
    "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma",
  ], { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error("LAB_INIT: schema initialization failed");
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const identity = await seedLab(prisma, password);
    console.log(JSON.stringify({ status: "lab-initialized", ...identity }));
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { validateEnvironment, seedLab, USER_ID, BRAND_ID };
if (require.main === module) {
  main().catch(() => {
    console.error("LAB_INIT failed; inspect the isolated database/configuration. Secrets are not logged.");
    process.exitCode = 1;
  });
}
