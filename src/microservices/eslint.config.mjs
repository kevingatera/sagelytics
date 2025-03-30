// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off', // previously: warn
      '@typescript-eslint/no-unsafe-assignment': 'off', // previously: warn
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // '@typescript-eslint/no-unsafe-member-access': 'warn',
      // '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // '@typescript-eslint/no-base-to-string': 'warn',
      // '@typescript-eslint/no-require-imports': 'warn',
      // '@typescript-eslint/consistent-generic-constructors': 'warn',
      // '@typescript-eslint/restrict-template-expressions': 'warn',
    },
  },
);