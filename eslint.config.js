import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // 忽略目录
  { ignores: ['dist', 'node_modules', '*.config.js'] },

  // 基础推荐规则
  js.configs.recommended,

  // React / JSX 文件配置
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
        __APP_VERSION__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ========== // React 官方推荐
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // Hook 规则降级（项目存量代码，后续逐步修复）
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/immutability': 'warn',

      // ========== React Refresh ==========
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // ========== React 风格 ==========
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'react/self-closing-comp': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-pascal-case': 'error',
      'react/no-array-index-key': 'warn',
      'react/prop-types': 'off',

      // ========== 代码质量 ==========
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-var': 'error',
      'no-use-before-define': ['warn', { functions: false, classes: false }],
      'prefer-const': 'error',
      'prefer-template': 'warn',
      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'error',
      'object-shorthand': 'error',
      'no-return-await': 'warn',

      // ========== 格式一致性 ==========
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'arrow-parens': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'jsx-quotes': ['error', 'prefer-double'],
      'comma-spacing': ['error', { before: false, after: true }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'space-infix-ops': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': [
        'error',
        { anonymous: 'always', named: 'never', asyncArrow: 'always' },
      ],
      'block-spacing': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],

      // ========== 最佳实践 ==========
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-throw-literal': 'error',
      'no-param-reassign': 'warn',
      'prefer-destructuring': ['warn', { object: true, array: false }],
      'prefer-spread': 'warn',
      'prefer-rest-params': 'warn',
    },
  },
];