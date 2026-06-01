import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import path from 'path'

export default defineConfig({
  define: {
    'process.env': process.env
  },
  plugins: [
    react(),
    svgr()
  ],
  resolve: {
    alias: [
      { find: '~', replacement: '/src' },
      { find: '@', replacement: path.resolve(__dirname, './src') }
    ]
  },
  server: {
    proxy: {
      '/v1/ai/skill-gap': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1\/ai/, '/api/v1')
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    ui: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '*.config.*'
      ]
    }
  }
})