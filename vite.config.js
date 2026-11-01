import { defineConfig } from 'vite'

export default defineConfig({
    base: './',            // відносні шляхи: працює і на GitHub Pages, і на Vercel
    server: { host: true, open: true },
    build: { chunkSizeWarningLimit: 1500 }
})
