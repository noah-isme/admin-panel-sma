import { FullConfig } from "@playwright/test";
import fs from "fs";

const AUTH_FILE = "playwright/.auth/user.json";

async function globalTeardown(_config: FullConfig) {
  // Clean up auth file on teardown for staged (optional, but good for clean state)
  if (fs.existsSync(AUTH_FILE)) {
    fs.unlinkSync(AUTH_FILE);
    console.log("🧹 Staged auth fixtures cleaned up");
  }
}

export default globalTeardown;
