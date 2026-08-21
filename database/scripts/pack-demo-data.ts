/**
 * Packs database/seed-data/*.json into database/seed-data.zip.
 *
 * The JSON folder is the editable source of truth; the archive is the artifact
 * that `npm run db:seed:demo` reads. Re-run this after editing any dataset file.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import AdmZip from "adm-zip";

const packageRoot = resolve(__dirname, "..");
const dataDir = resolve(packageRoot, "seed-data");
const archivePath = resolve(packageRoot, "seed-data.zip");

function main() {
  if (!existsSync(dataDir)) {
    throw new Error(`Dataset folder is missing: ${dataDir}`);
  }

  const files = readdirSync(dataDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No JSON files found in ${dataDir}.`);
  }

  const zip = new AdmZip();
  for (const name of files) {
    zip.addLocalFile(resolve(dataDir, name));
  }
  zip.writeZip(archivePath);

  const size = statSync(archivePath).size;
  console.log(`Packed ${files.length} file(s) into seed-data.zip (${size} bytes):`);
  for (const name of files) console.log(`  - ${name}`);
}

main();
