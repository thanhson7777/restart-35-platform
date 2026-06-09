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
        rewrite: (path) => path.replace(/^\/v1\/ai\/skill-gap/, '/api/v1/skill-gap')
      },
      // RAG endpoints: proxy through backend (port 8017) which reads from MongoDB
      // Backend handles: GET/POST /v1/ai/rag/career-recommendation
      // GET reads from MongoDB, POST calls AI service and saves to MongoDB
      '/v1/ai/rag': {
        target: 'http://localhost:8017',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1\/ai\/rag/, '/v1/ai/rag')
      },
      // All other /v1/ai/* go through backend (port 8017) -> aiProvider -> AI service (port 8000)
      // Endpoints: /v1/ai/recommend-jobs, /v1/ai/jobs, /v1/ai/health, etc.
      '/v1/ai': {
        target: 'http://localhost:8017',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1\/ai/, '/v1/ai')
      },
      // All other /v1/* routes go to backend (port 8017)
      '/v1': {
        target: 'http://localhost:8017',
        changeOrigin: true
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