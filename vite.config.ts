import { defineConfig } from 'vite'
export default defineConfig({
    build: {
        rolldownOptions: {
            chunkFileNames: "[name].js",
            output: {
                format: 'iife',
                name: 'QZoneAutoLike',
            }
        },
        lib: {
            entry: ['src/main.ts'],
            fileName: "main.js",
            name: 'QZoneAutoLike',
        },
    },
})
