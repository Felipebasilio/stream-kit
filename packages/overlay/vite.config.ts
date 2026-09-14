import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // O OBS carrega a pagina uma vez e vive horas com ela. Um arquivo so
    // evita qualquer risco de pedido perdido depois do carregamento.
    assetsInlineLimit: 100_000,
  },
  server: { port: 5273 },
});
