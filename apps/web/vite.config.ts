import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // O overlay flutuante do devtools entra nos screenshots e atrapalha os
    // testes visuais, então fica de fora quando o Playwright sobe o servidor.
    ...(process.env.PLAYWRIGHT ? [] : [vueDevTools()]),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
