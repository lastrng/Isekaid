import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
          if (id.includes('/@supabase/')) return 'vendor-supabase';
          if (id.includes('/lucide-react/') || id.includes('/framer-motion/')) return 'vendor-ui';
          if (id.includes('/@capacitor/') || id.includes('/@revenuecat/')) return 'vendor-native';
          return 'vendor';
        },
      },
    },
  },
});
