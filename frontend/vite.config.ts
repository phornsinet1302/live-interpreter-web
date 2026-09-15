import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

// Get __dirname in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {    // <-- explicitly type the parameter
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return path.resolve(__dirname, 'src/assets', filename);
      }
    },
  };
}

export default defineConfig({
  // Serves the app under /live-interpreter/ instead of the bare origin, so
  // the dev URL reads as http://localhost:5173/live-interpreter/ rather
  // than just the port number. Vite rewrites index.html's asset paths (and
  // everything import.meta.env.BASE_URL-aware) to match automatically.
  base: '/live-interpreter/',
  // Binds to 0.0.0.0 (not just localhost) so a phone on the same Wi-Fi can
  // load the dev server via the PC's LAN IP — `npm run dev` prints that
  // "Network:" URL to use on mobile.
  server: {
    host: true,
  },
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
});