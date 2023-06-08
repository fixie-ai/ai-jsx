const path = require('path');

module.exports = {
  extends: ['eslint:recommended', 'nth', 'plugin:@next/next/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [path.join(__dirname, 'tsconfig.json')],
  },
  plugins: ['@typescript-eslint'],
  root: true,

  env: {
    node: true,
  },

  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],

    'no-magic-numbers': 'off',
    '@typescript-eslint/no-magic-numbers': 'off',

    // There are too many third-party libs that use camelcase.
    camelcase: ['off'],

    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false, variables: true }],

    'no-trailing-spaces': 'warn',
    'no-else-return': ['warn', { allowElseIf: false }],

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

    // Add additional strictness beyond the recommended set
    '@typescript-eslint/parameter-properties': ['warn', { prefer: 'parameter-properties' }],
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/switch-exhaustiveness-check': 'warn',
    '@typescript-eslint/no-base-to-string': 'error',
    '@typescript-eslint/no-unnecessary-condition': ['warn', { allowConstantLoopConditions: true }],
  },
};
