// Packs @logicore/contracts from the backend into vendor/ without changing the backend.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractsDir = resolve(root, '..', 'Evoc_ships', 'packages', 'contracts');
const vendorDir = resolve(root, 'vendor');

if (!existsSync(resolve(contractsDir, 'dist', 'index.js'))) {
  console.error(`Contracts build not found in ${contractsDir}. Build the backend first.`);
  process.exit(1);
}

execSync(`npm pack --pack-destination "${vendorDir}"`, { cwd: contractsDir, stdio: 'inherit' });
console.log('Contracts packed. Run pnpm install to pick up any changes.');
