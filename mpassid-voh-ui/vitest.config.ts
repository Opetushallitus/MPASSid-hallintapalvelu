import { defineConfig } from "vitest/config";
import babel from "vite-plugin-babel";

// Unit tests only. Kept separate from vite.config.ts, which also reads
// ../CHANGELOG.md and wires node polyfills/env plugins the tests don't need.
export default defineConfig({
  resolve: {
    // `@/*` and `~/*` -> src/* (tsconfig.json paths).
    tsconfigPaths: true,
  },
  plugins: [
    // Same as vite.config.ts: babel-plugin-formatjs injects the message `id`
    // into every FormattedMessage/defineMessage - without it react-intl throws
    // "An `id` must be provided".
    babel({
      include: /\.[jt]sx?$/,
      exclude: /node_modules/,
      babelConfig: {
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["jsx", "typescript"] },
        presets: ["@visma/formatjs"],
        plugins: ["codegen"],
      },
    }),
  ],
  test: {
    // Only unit tests: e2e/*.spec.ts are Playwright specs.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
  },
});
