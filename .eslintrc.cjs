const path = require('path');

module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict', 'nth'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [path.join(__dirname, 'tsconfig.json'), path.join(__dirname, 'src', '__tests__', 'tsconfig.json')],
  },
  plugins: ['@typescript-eslint'],
  root: true,

  env: {
    node: true,
  },

  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',

    'no-magic-numbers': 'off',
    '@typescript-eslint/no-magic-numbers': 'off',

    camelcase: ['warn', { allow: ['base_prompt', 'few_shots', 'entry_point', 'content_type', 'max_tokens'] }],

    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error', { functions: false, variables: true }],

    'no-trailing-spaces': 'warn',

    // Disable style rules to let dprint own it
    'object-curly-spacing': 'off',
    'comma-dangle': 'off',
    'max-len': 'off',
    indent: 'off',
    'no-mixed-operators': 'off',
    'no-console': 'off',
    'arrow-parens': 'off',

    // Add additional strictness beyond the recommended set
    '@typescript-eslint/parameter-properties': ['warn', { prefer: 'parameter-properties' }],
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'warn',
    '@typescript-eslint/switch-exhaustiveness-check': 'warn',
    '@typescript-eslint/no-base-to-string': 'error',
  },
};
