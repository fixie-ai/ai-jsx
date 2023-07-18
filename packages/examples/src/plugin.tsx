// import path from 'node:path'
// import parser from '@babel/parser'
// // @ts-expect-error
// import estreeToBabel from 'estree-to-babel'
// import {compileSync} from '@mdx-js/mdx'

// export function babelPluginSyntaxMdx() {
//   // Tell Babel to use a different parser.
//   return {parserOverride: babelParserWithMdx}
// }

// // A Babel parser that parses MDX files with `@mdx-js/mdx` and passes any
// // other things through to the normal Babel parser.
// function babelParserWithMdx(value: any, options: any) {
//   if (
//     options.sourceFileName &&
//     /\.mdx?$/.test(path.extname(options.sourceFileName))
//   ) {
//     // Babel does not support async parsers, unfortunately.
//     return compileSync(
//       {value, path: options.sourceFileName},
//       // Tell `@mdx-js/mdx` to return a Babel tree instead of serialized JS.
//       {recmaPlugins: [recmaBabel], /* jsxImportSource: …, otherOptions… */}
//     ).result
//   }

//   return parser.parse(value, options)
// }

// // A “recma” plugin is a unified plugin that runs on the estree (used by
// // `@mdx-js/mdx` and much of the JS ecosystem but not Babel).
// // This plugin defines `'estree-to-babel'` as the compiler, which means that
// // the resulting Babel tree is given back by `compileSync`.
// function recmaBabel(this: any) {
//   Object.assign(this, {Compiler: estreeToBabel})
// }

// // @ts-expect-error
// import babel from '@babel/core'

// // Note that a filename must be set for our plugin to know it’s MDX instead of JS.
// console.log(JSON.stringify(await babel.parseAsync(`
// import YouTube from "./YouTube";

// # Welcome

// <YouTube id="123" />
// `, {filename: 'example.mdx', plugins: [babelPluginSyntaxMdx]}), null, 2))


import {compile} from '@mdx-js/mdx'
import {visit} from 'unist-util-visit'
import {VFile} from 'vfile';

function rehypePlugin(options: any) {
  console.log('outer', options)
  return (ast: any) => {
    console.log('inner', JSON.stringify(ast, null, 2))
    visit(ast, 'ParagraphNode', (node) => {
      console.log(node)
    })
  }
}

const file = new VFile({
  path: '/Users/nth/code/ai-jsx/packages/examples/src/sample.mdx',
  contents: `
  import YouTube from "./YouTube";

  # Welcome
  
  <YouTube id="123" />
  `});

console.log(await compile({
  path: '/Users/nth/code/ai-jsx/packages/examples/src/sample.mdx',
  value: `
  import YouTube from "./YouTube";

  # Welcome
  
  <YouTube id="123" />
  `}, {
  rehypePlugins: [[rehypePlugin, {throwOnError: true, strict: true}]]
}))