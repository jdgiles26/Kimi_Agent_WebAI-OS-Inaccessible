import "dotenv/config";

// The OS shell + browser-side AI tools work without any of these. Auth + DB
// are optional; routes that need them fail at request time with a descriptive
// error (e.g. createOAuthCallbackHandler → getJwks lazy init). Booting must
// not crash on missing values, so we warn once and continue.
const warned = new Set<string>();
function optional(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production" && !warned.has(name)) {
    console.warn(
      `[env] ${name} is unset. Routes that depend on it will fail at request time. ` +
        `The OS shell still works in offline / single-user mode.`,
    );
    warned.add(name);
  }
  return value ?? "";
}

export const env = {
  appId: optional("APP_ID"),
  appSecret: optional("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: optional("DATABASE_URL"),
  kimiAuthUrl: optional("KIMI_AUTH_URL"),
  kimiOpenUrl: optional("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
