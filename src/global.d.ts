// Build-time identifier for the running bundle. Substituted by Vite via
// `define` (see vite.config.ts) — resolves to a git short SHA, falling
// back to a timestamp. Compared at runtime against /version.json to
// detect when a newer build has been deployed.
declare const __APP_VERSION__: string;
