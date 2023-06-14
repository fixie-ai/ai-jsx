// Adapted from https://github.com/hwchase17/langchainjs/blob/86e018c0d3831c396767cf55c69943873dafadde/langchain/scripts/move-cjs-to-dist.js

import { resolve, dirname, parse, format } from 'node:path';
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

function abs(relativePath) {
  return resolve(dirname(fileURLToPath(import.meta.url)), relativePath);
}

async function moveAndRename(source) {
  for (const file of await readdir(abs(source), { withFileTypes: true })) {
    if (file.isDirectory()) {
      await moveAndRename(`${source}/${file.name}`);
    } else if (file.isFile()) {
      const parsed = parse(file.name);

      // Ignore anything that's not a .js file
      if (parsed.ext !== '.js') {
        continue;
      }

      // Rewrite any require statements to use .cjs
      const content = await readFile(abs(`${source}/${file.name}`), 'utf8');
      const rewritten = content.replace(/require\("(\..+?).js"\)/g, (_, p1) => {
        return `require("${p1}.cjs")`;
      });

      // Rename the file to .cjs
      const renamed = format({ name: parsed.name, ext: '.cjs' });

      await writeFile(abs(`${source}/${renamed}`), rewritten, 'utf8');
      await unlink(abs(`${source}/${file.name}`));
    }
  }
}

moveAndRename('../dist/cjs', '../dist/cjs').catch((err) => {
  console.error(err);
  process.exit(1);
});
