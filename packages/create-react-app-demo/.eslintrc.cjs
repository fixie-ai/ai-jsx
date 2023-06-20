const path = require('path');
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:tailwindcss/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
    'nth',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
    react: {
      version: 'detect',
      linkComponents: ['Link', 'NavLink', 'AgentNavLink'],
    },
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [path.join(__dirname, 'tsconfig.json'), path.join(__dirname, 'backend', 'tsconfig.json')],
  },
  root: true,
  env: {
    browser: true,
  },
  globals: {
    process: 'readonly',

    // Shouldn't these be automatically brought in by `env.browser`?
    navigator: 'readonly',
    window: 'readonly',
    document: 'readonly',
  },
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    'react/jsx-boolean-value': 'warn',
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never', propElementValues: 'always' }],
    'react/jsx-pascal-case': 'off',

    'import/no-named-as-default-member': 'off',
    'import/extensions': ['warn', 'ignorePackages'],

    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: 'React|AI' }],
    'dot-notation': 'off',
    'no-magic-numbers': 'off',
    '@typescript-eslint/no-magic-numbers': [
      'warn',
      {
        ignoreReadonlyClassProperties: true,
        ignore: [0, 1, 2, 200, 400, 404, 500],
        ignoreTypeIndexes: true,
      },
    ],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
    ],
    camelcase: [
      'warn',
      {
        allow: ['base_prompt', 'few_shots', 'entry_point'],
      },
    ],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      {
        functions: false,
        variables: true,
      },
    ],
    'id-blacklist': 'off',
    'no-trailing-spaces': 'warn',
    // Disable style rules to let dprint own it
    'object-curly-spacing': 'off',
    'comma-dangle': 'off',
    'max-len': 'off',
    indent: 'off',
    'no-mixed-operators': 'off',
    'no-console': 'off',
    'arrow-parens': 'off',
    'brace-style': 'off',
    'jsx-quotes': 'off',
    'operator-linebreak': 'off',
    // Add additional strictness beyond the recommended set
    '@typescript-eslint/parameter-properties': [
      'warn',
      {
        prefer: 'parameter-properties',
      },
    ],
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/switch-exhaustiveness-check': 'warn',
  },
  overrides: [
    {
      files: ['*.cjs', '*.js'],
      env: {
        node: true,
        browser: false,
      },
    },
  ],
};
