import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'dist/renderer',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@/components': resolve(__dirname, 'src/components'),
            '@/services': resolve(__dirname, 'src/services'),
            '@/types': resolve(__dirname, 'src/types'),
            '@/utils': resolve(__dirname, 'src/utils'),
        },
    },
    server: {
        port: 5173,
    },
});