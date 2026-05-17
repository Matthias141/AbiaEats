import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'out/**',
      'next-env.d.ts',
      '*.ps1',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@next/next/no-page-custom-font': 'warn',
    },
  },
  {
    files: ['src/tests/**/*.ts', 'src/tests/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-unused-vars': 'warn',
    },
  },
];

export default eslintConfig;
