import js from '@eslint/js'
import globals from 'globals'

export default [
   { ignores: ['node_modules', 'dist'] },
   // Test files — rules relaxed
   {
     files: ['**/__tests__/**/*.ts'],
     languageOptions: {
       ecmaVersion: 2024,
       sourceType: 'module',
       globals: {
         ...globals.node,
         vi: 'readonly',
         describe: 'readonly',
         it: 'readonly',
         expect: 'readonly',
         beforeEach: 'readonly',
         afterEach: 'readonly',
         beforeAll: 'readonly',
         afterAll: 'readonly',
         test: 'readonly',
       },
     },
     rules: {
       ...js.configs.recommended.rules,
       'no-unused-vars': 'off',
       '@typescript-eslint/no-unused-vars': 'off',
       'no-console': 'warn',
     },
   },
   // Non-test files — recommended + project-specific rules
   {
     files: ['**/*.ts'],
     languageOptions: {
       ecmaVersion: 2024,
       sourceType: 'module',
       globals: {
         ...globals.node,
         vi: 'readonly',
         describe: 'readonly',
         it: 'readonly',
         expect: 'readonly',
         beforeEach: 'readonly',
         afterEach: 'readonly',
         beforeAll: 'readonly',
         afterAll: 'readonly',
         test: 'readonly',
       },
     },
     rules: {
       ...js.configs.recommended.rules,
       'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
       '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
       'no-console': 'warn',
       semi: ['error', 'always'],
       quotes: ['error', 'single'],
     },
   },
]
