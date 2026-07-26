import { defineConfig } from "vitest/config";

// Deliberately does not extend/inherit the root vitest.config.ts — that one
// needs `vite`/`@vitejs/plugin-react`, which only exist in the root app's
// node_modules. Without a config of its own here, vitest walks up and finds
// the root config anyway, then fails to resolve those imports in any
// environment where only `task-b`'s own `npm ci` has run (i.e. CI, and
// almost any fresh clone) - this file is what keeps task-b truly
// independent of the root project, not just typechecking as if it were.
export default defineConfig({
  test: {
    environment: "node",
  },
});
