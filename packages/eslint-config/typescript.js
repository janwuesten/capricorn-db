import tseslint from 'typescript-eslint'
import base from './base.js'

export default tseslint.config(
  ...base,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': ['off'],
      '@typescript-eslint/no-inferrable-types': ['off'],
      '@typescript-eslint/no-unused-vars': ['warn', {
        'args': 'after-used',
        'ignoreRestSiblings': false,
        'argsIgnorePattern': '^_.*?$'
      }]
    }
  }
)
