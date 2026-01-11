import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4173",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- --host --port 4173",
    port: 4173,
    reuseExistingServer: true,
  },
};

export default config;
