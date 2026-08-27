import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const buildVersion = `${Date.now()}`;

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(buildVersion) },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-router")) return "router";
          if (id.includes("react-dom") || id.includes("scheduler") || /node_modules[\\/]react[\\/]/.test(id)) return "react";
          if (id.includes("lucide-react")) return "icons";
        }
      }
    }
  },
  plugins: [react(), {
    name: "duobull-version-manifest",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: buildVersion }) });
    }
  }]
});
