import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "salary-counter",
  brand: {
    displayName: "월급 시급 카운터",
    primaryColor: "#3182F6",
    icon: "https://static.toss.im/appsintoss/13203/d6c50373-86a8-424b-b608-a5576075976b.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
