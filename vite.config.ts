import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gosplan/',
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 3000
  }
});
