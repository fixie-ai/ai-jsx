import {loadJsonFile} from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs/promises';

const currentPath = path.dirname(fileURLToPath(import.meta.url));

interface PackageJson {
  exports: Record<string, {
      import: {
        types: string;
        default: string;
      }
      require: {
        types: string;
        default: string;
      }
    }>
}

const packageJson = await loadJsonFile<PackageJson>(path.resolve(currentPath, '../../package.json'));

console.log(packageJson);

// Iterate through each export entry
for (const exportValue of Object.values(packageJson.exports)) {
  const importObj = exportValue.import;
  const requireObj = exportValue.require;

  // Create ESM files
  fs.writeFile(
    path.join('.', importObj.default.replace('./', '')),
    `export * from '${importObj.default}';\n`
  );
  fs.writeFile(
    path.join('.', importObj.types.replace('./', '')),
    `export * from '${importObj.types}';\n`
  );

  // Create CommonJS files
  fs.writeFile(
    path.join('.', requireObj.default.replace('./', '')),
    `module.exports = require('${requireObj.default}');\n`
  );
  fs.writeFile(
    path.join('.', requireObj.types.replace('./', '')),
    `module.exports = require('${requireObj.types}');\n`
  );
}