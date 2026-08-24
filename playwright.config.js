import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  webServer: { command: "python -m http.server 8000", port: 8000, timeout: 10000 },
  use: { baseURL: "http://localhost:8000" },
  timeout: 15000,
});
