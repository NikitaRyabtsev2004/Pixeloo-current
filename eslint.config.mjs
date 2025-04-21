import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginNode from 'eslint-plugin-node';
import pluginImport from 'eslint-plugin-import';
import pluginPromise from 'eslint-plugin-promise';

export default [
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 2021, // Указываем ES2021, так как это последняя версия, поддерживающая все современные фичи
      sourceType: 'module',
      globals: {
        ...globals.browser, // Для браузера
        ...globals.node, // Для Node.js
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'jsx-a11y': pluginJsxA11y,
      node: pluginNode,
      import: pluginImport,
      promise: pluginPromise,
    },
    rules: {
      // Общие правила
      'no-console': 'warn',
      'no-unused-vars': 'warn',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Accessibility
      ...pluginJsxA11y.configs.recommended.rules,

      // Node.js
      'node/no-unsupported-features/es-syntax': [
        'error',
        { version: '>=8.3.0', ignores: ['modules'] }, // Игнорируем только ошибки, связанные с модулями
        {
          ignores: ['dynamicImport'],
        },
      ],
      'node/no-missing-require': [
        'error',
        { tryExtensions: ['.js', '.json', '.cjs'] },
      ],

      // Импорты
      'import/no-unresolved': 'error',
      'import/extensions': [
        'error',
        'ignorePackages',
        { js: 'never', jsx: 'never', cjs: 'always' },
      ],

      // Промисы
      ...pluginPromise.configs.recommended.rules,
    },
  },
  // Специфическая настройка для файлов с CommonJS
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'script', // CommonJS
    },
    rules: {
      'node/no-unsupported-features/es-syntax': 'off',
      'linebreak-style': ['error', 'unix'],
    },
  },
  // настройка для React файлов
  {
    files: ['**/*.jsx'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Подключение плагинов с их стандартными конфигурациями
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
];
