import tseslint from 'typescript-eslint';
import parser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', '.eslintrc.js'],
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
        ecmaFeatures: { decorators: true },
      },
      globals: {
        node: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...tseslint.configs.recommended[0].rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.spec.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
        ecmaFeatures: { decorators: true },
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...tseslint.configs.recommended[0].rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
