const path = require('path');

module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict', 'nth'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      path.join(__dirname, 'tsconfig.json'),
      path.join(__dirname, 'scripts', 'tsconfig.json'),
      path.join(__dirname, 'test', 'tsconfig.json'),
    ],
  },
  plugins: ['@typescript-eslint'],
  root: true,

  env: {
    node: true,
    es6: true,
  },

  rules: {
    // Disable eslint rules to let their TS equivalents take over.
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    'no-undef': 'off',
    'no-magic-numbers': 'off',
    '@typescript-eslint/no-magic-numbers': 'off',

    // There are too many third-party libs that use camelcase.
    camelcase: ['off'],

    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false, variables: true }],

    'no-trailing-spaces': 'warn',
    'no-else-return': ['warn', { allowElseIf: false }],
    'no-constant-condition': ['error', { checkLoops: false }],

    // Disable style rules to let prettier own it
    'object-curly-spacing': 'off',
    'comma-dangle': 'off',
    'max-len': 'off',
    indent: 'off',
    'no-mixed-operators': 'off',
    'no-console': 'off',
    'arrow-parens': 'off',
    'generator-star-spacing': 'off',
    'space-before-function-paren': 'off',
    'jsx-quotes': 'off',
    'brace-style': 'off',

    // Add additional strictness beyond the recommended set
    '@typescript-eslint/parameter-properties': ['warn', { prefer: 'parameter-properties' }],
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/switch-exhaustiveness-check': 'warn',
    '@typescript-eslint/no-base-to-string': 'error',
    '@typescript-eslint/no-unnecessary-condition': ['warn', { allowConstantLoopConditions: true }],
  },
};
