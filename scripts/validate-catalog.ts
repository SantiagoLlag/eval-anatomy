import { catalogDirs } from "../src/lib/catalog";
import { validateCatalog } from "../src/lib/catalog-validate";

const problems = validateCatalog();
if (problems.length > 0) {
  for (const p of problems) console.error(`catalog/${p.dir}/eval.md: ${p.message}`);
  console.error(`\nCatalog invalid: ${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`Catalog OK: ${catalogDirs().length} eval(s) valid.`);
