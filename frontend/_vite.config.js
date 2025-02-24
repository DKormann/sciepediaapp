import { defineConfig } from 'vite'

export default defineConfig({
  base: '/sciepedia/', // Set base path to '/path/' for all assets
  build: {
    rollupOptions: {
      input: 'index.html', // Main entry point (your HTML file)
      output: {
        entryFileNames: 'assets/[name].js', // JavaScript output
        chunkFileNames: 'assets/[name].js', // Chunk output
        assetFileNames: 'assets/[name].[ext]', // Asset files like CSS, images
      }
    }
  }
})
