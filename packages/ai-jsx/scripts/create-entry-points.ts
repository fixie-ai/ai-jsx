import {loadJsonFile} from 'load-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentPath = path.dirname(fileURLToPath(import.meta.url));

const packageJson = await loadJsonFile(path.resolve(currentPath, '../../package.json'));

console.log(packageJson);
