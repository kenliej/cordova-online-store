import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  preview: {
    realtime: true,
  },
  auth: false,
  aiGateway: true,
  buckets: {
    // Existing probe/legacy bucket stays private.
    assets: { access: "private" },
    // Public product/store/avatar media: anonymous reads, authenticated writes.
    media: { access: "public_read" },
    // Sensitive government-ID scans: never public, streamed through the API.
    uploads: { access: "private" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
