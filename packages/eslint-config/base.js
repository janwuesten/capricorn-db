import js from '@eslint/js'
import unusedImports from 'eslint-plugin-unused-imports'

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    plugins: {
      'unused-imports': unusedImports
    },
    rules: {
      'padded-blocks': 0,
      'quotes': ['error', 'single'],
      'semi': ['error', 'never'],
      'linebreak-style': 0,
      'indent': ['error', 2, { SwitchCase: 1 }],
      'eol-last': ['off'],
      'max-len': ['off', 600],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'no-async-promise-executor': ['off'],
      'space-before-function-paren': ['error', {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      'no-trailing-spaces': ['error', {
        'skipBlankLines': true
      }],
      'eqeqeq': ['off'],
      'no-console': ['warn'],
      'unused-imports/no-unused-vars': ['warn', { 'caughtErrors': 'all' }],
      'unused-imports/no-unused-imports': 'warn'
    }
  }
]
