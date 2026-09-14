import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/*.d.ts',
        '**/cli.ts',
        '**/node-fs.ts',
        // Amarracao de React (decisao D9): a logica dessas telas mora em
        // arquivos puros com teste proprio, e o resultado visual e medido por
        // comparacao de imagem, nao por cobertura de linha.
        '**/*.hooks.ts',
      ],
      // O limite falha o comando. Threshold que so reporta nao e threshold.
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95,
      },
    },
  },
});
