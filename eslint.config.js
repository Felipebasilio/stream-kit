import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-types/**',
      '**/coverage/**',
      // Saida do empacotamento: contem o bundle ja minificado das cenas, que
      // nao e codigo nosso para revisar.
      '**/release/**',
      '**/capturas/**',
      'legacy-python/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // O contrato de tipos nao vale nada se houver escapatoria.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // Scripts de verificacao: rodam no Node, imprimem relatorio no terminal e
    // nao sao empacotados. Nao faz sentido cobrar deles as mesmas regras.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        URL: 'readonly',
        // Os trechos passados ao `page.evaluate` rodam no navegador, dentro
        // do script — daí os globais de DOM aparecerem aqui.
        document: 'readonly',
        window: 'readonly',
        getComputedStyle: 'readonly',
        Audio: 'readonly',
        AudioContext: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
);
