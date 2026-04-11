import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const firebaseModules = [
  'firebase/compat/app',
  'firebase/compat/auth',
  'firebase/compat/firestore',
  'firebase/compat/storage',
];
const reactVendorModules = [
  'react',
  'react-dom',
  'react-router-dom',
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (firebaseModules.some((pkg) => normalizedId.includes(`/node_modules/${pkg}`))) {
            return 'firebase';
          }

          if (reactVendorModules.some((pkg) => normalizedId.includes(`/node_modules/${pkg}/`))) {
            return 'react-vendor';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  }
});
