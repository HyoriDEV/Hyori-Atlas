export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Avoid multiple intervals during hot reload in dev
    const globalObj = globalThis as unknown as { __minecraftSkinInterval?: NodeJS.Timeout };

    if (!globalObj.__minecraftSkinInterval) {
      const { syncAllMinecraftSkins } = await import("@/lib/services/minecraft-skin-service");

      const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

      console.log(
        "[Instrumentation] Initializing Minecraft skin sync background task (interval: 1h)"
      );

      // Initial run 30s after server boot
      setTimeout(() => {
        syncAllMinecraftSkins({ maxAgeMinutes: 60 }).catch((err) => {
          console.error("[SkinSyncCron] Initial sync failed:", err);
        });
      }, 30000);

      globalObj.__minecraftSkinInterval = setInterval(() => {
        syncAllMinecraftSkins({ maxAgeMinutes: 60 }).catch((err) => {
          console.error("[SkinSyncCron] Periodic sync failed:", err);
        });
      }, INTERVAL_MS);
    }
  }
}
