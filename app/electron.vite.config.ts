import {defineConfig, externalizeDepsPlugin} from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
import type {Plugin} from 'vite';

// La plantilla Remotion de la skill es la MISMA que usa el render: se importa directo (alias @plantilla).
// Vive fuera de app/, así que sus imports de paquetes (remotion, react, three…) se resuelven desde app/node_modules.
const PLANTILLA = path.resolve(__dirname, '../skill/editar-reel/plantilla_remotion/src');
const ENTRADA = path.resolve(__dirname, 'src/renderer/src/main.tsx');
const depsDePlantilla = (): Plugin => ({
  name: 'reel-plantilla-deps',
  enforce: 'pre',
  async resolveId(source, importer, opts) {
    if (!importer || !importer.startsWith(PLANTILLA)) return null;
    if (source.startsWith('.') || source.startsWith('/') || source.startsWith('\0')) return null;
    return this.resolve(source, ENTRADA, {...opts, skipSelf: true});
  },
});

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {alias: {'@shared': path.resolve(__dirname, 'src/shared')}},
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {alias: {'@shared': path.resolve(__dirname, 'src/shared')}},
  },
  renderer: {
    plugins: [depsDePlantilla(), react(), tailwind()],
    resolve: {
      alias: {'@plantilla': PLANTILLA, '@shared': path.resolve(__dirname, 'src/shared'), '@': path.resolve(__dirname, 'src/renderer/src')},
      dedupe: ['react', 'react-dom', 'remotion'],
    },
    server: {fs: {allow: [path.resolve(__dirname, '..')]}},
  },
});
