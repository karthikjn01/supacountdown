// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";
var app_config_default = defineConfig({
  routers: {
    client: {
      vite: {
        plugins: [
          nodePolyfills({
            globals: {
              Buffer: true
            }
          })
        ]
      }
    }
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"]
      })
    ]
  }
});
export {
  app_config_default as default
};
