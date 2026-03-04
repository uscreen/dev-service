import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  ignores: [
    'coverage/**',
    '*.d.ts',
    'pnpm-workspace.yaml',
    '**/*.md/*.js',
    'AGENTS.md'
  ]
}, {
  rules: {
    'style/comma-dangle': ['error', 'never'],
    'curly': ['error', 'multi-line', 'consistent'],
    'antfu/top-level-function': 'off',
    'no-console': 'off',
    'test/no-import-node-test': 'off'
  }
})
