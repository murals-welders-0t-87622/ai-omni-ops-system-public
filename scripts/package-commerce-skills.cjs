const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const AdmZip = require("adm-zip");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "integrations/commerce/skills"), target = path.join(root, "apps/web/public/commerce-skills");
fs.mkdirSync(target, { recursive: true });
for (const name of ["ecommerce-detail-creative", "taobao-tmall-operations", "ai-sales-operations", "youzan-private-operations"]) {
  const folder = path.join(source, name);
  if (!fs.existsSync(path.join(folder, "SKILL.md"))) throw Error("技能入口不存在：" + name);
  const zip = new AdmZip(); zip.addLocalFolder(folder, name, file => !/(^|[\\/])__pycache__([\\/]|$)|\.py[co]$/i.test(file));
  const file = path.join(target, name + ".zip"); zip.writeZip(file);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  fs.writeFileSync(file + ".sha256", hash + "  " + name + ".zip\n");
  console.log(name + "：" + zip.getEntries().filter(x => !x.isDirectory).length + " files");
}
