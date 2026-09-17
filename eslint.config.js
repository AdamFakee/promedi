// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const globals = require('globals')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'docs/**', '.expo/**', 'android/**', 'ios/**', 'node_modules/**'],
  },
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
  {
    files: [
      '**/__tests__/**/*',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/jest.setup.{js,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
])
