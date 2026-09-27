import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: "./tests/a11y",
  webServer: baseConfig.webServer
    ? {
        ...baseConfig.webServer,
        reuseExistingServer: true,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
