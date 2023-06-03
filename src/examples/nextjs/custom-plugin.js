// module.exports = function() {
//   return {
//     visitor: {
//       Program(path) {
//         console.log('babel preset', path.hub.file.opts.filename);
//       },
//     },
//   };
// }

module.exports = function({ types: t }) {
  return {
    visitor: {
      Program(path) {
        console.log(path.hub.file.opts.filename);
        const firstNode = path.node.body[0];
        if (t.isExpressionStatement(firstNode) && t.isStringLiteral(firstNode.expression) && firstNode.expression.value === 'use ai') {
          console.log(`File ${path.hub.file.opts.filename} uses 'use ai';`);
        }
      }
    }
  };
};