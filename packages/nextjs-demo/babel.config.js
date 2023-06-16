module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      {
        throwIfNamespace: false,
        runtime: 'automatic',
        importSource: 'ai-jsx/next',
      },
    ],
  ],
};
