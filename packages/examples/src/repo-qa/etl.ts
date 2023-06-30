import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import {writeJsonFile} from 'write-json-file';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function gitRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel').toString().trim();
}

function gitLsTree(ignoreRegexList?: RegExp[]): Record<string, string> {
  const repoRoot = gitRepoRoot();
  const output = execSync('git ls-tree -r --name-only HEAD', { cwd: repoRoot }).toString();
  const files = output.split('\n').filter((f) => {
    if (f.trim() === '') {
      return false;
    }
    return !ignoreRegexList?.some(regex => regex.test(f));
  });

  const result: Record<string, string> = {};

  console.log(`Found ${files.length} files`);

  let filesRead = 0;
  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    const content = readFileSync(fullPath, 'utf-8');
    result[file] = content;

    filesRead++;
    if (!(filesRead % 50)) {
      console.log(`Read ${filesRead} files`)
    }
  }
  console.log(`Read ${filesRead} files`)

  return result;
}

const ignorePatterns = [/create-react-app-demo/, /\.yarn/, /yarn\.lock$/];
const fileContents = gitLsTree(ignorePatterns);
await writeJsonFile(path.join(dirname, 'repo-files.json'), fileContents);
