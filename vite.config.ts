import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * This portal is a remote of opti-front: it is built as a federated module, and the container's web
 * server serves it under /remotes/sales/. React and the router are shared with the container (one
 * instance), and the portal never brings its own HTTP client.
 */
export default defineConfig({
  base: '/remotes/sales/',
  plugins: [
    react(),
    federation({
      name: 'sales',
      filename: 'remoteEntry.js',
      exposes: {
        './Portal': './src/sales/Portal.tsx',
        './Summary': './src/sales/Summary.tsx'
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react/': { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom/': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
        'react-router': { singleton: true, requiredVersion: '^7.0.0' },
      },
      dts: false,
    }),
  ],
  build: {
    target: 'esnext',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
