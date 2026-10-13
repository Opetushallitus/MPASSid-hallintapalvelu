import dateFnsLocaleVitePlugin from "@visma/react-app-locale-utils/lib/dateFnsLocaleVitePlugin.js";
import reactIntlBundledMessagesPlugin from "@visma/react-intl-bundled-messages/lib/vitePlugin.js";
import gitInfoPlugin from "@visma/vite-plugin-super-template/lib/gitInfoPlugin.js";
import optimizeOpenAPIPatchPlugin from "@visma/vite-plugin-super-template/lib/optimizeOpenAPIPatchPlugin.js";
import projectAliasPlugin from "@visma/vite-plugin-super-template/lib/projectAliasPlugin.js";
import defaultExport from "@visma/vite-plugin-super-template/lib/defaultExport.js";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import dynamicImport from "vite-plugin-dynamic-import";
import envCompatible from "vite-plugin-env-compatible";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// vite 8 rebuild: the vendored @visma/vite-plugin-super-template hard-pins
// vite-3-era plugins (@vitejs/plugin-react@2, old esbuild/rollup node-polyfill
// plugins) as its own dependencies, so it can't orchestrate vite 8. Instead we
// compose the same plugin set here directly, reusing the still-compatible
// vendored sub-plugins (config-hook only) and swapping the two incompatible
// pieces: @vitejs/plugin-react 2→6 and the whole node-polyfill stack (two
// @esbuild-plugins + rollup-plugin-node-polyfills) → vite-plugin-node-polyfills.
// Dropped vs. super-template: dynamicBase (was already filtered out) and
// faviconsPlugin (no src/images/icon.png → it was already a no-op).

// Matches modules of the given node_modules packages (names may be regex).
const nodeModules = (...packages: string[]) =>
  new RegExp(`[\\\\/]node_modules[\\\\/](${packages.join("|")})[\\\\/]`);

export default defineConfig({
  base:
    (process.env.NODE_ENV === "production" && process.env.VITE_BASENAME) ||
    undefined,
  server: { port: 3000 },
  resolve: {
    // Native replacement for the `vite-tsconfig-paths` plugin (which pulled the
    // now-unmaintained `tsconfck`). Resolves tsconfig.json `compilerOptions.paths`
    // (`@/*` and `~/*` → `src/*`). NOTE: vite 8 marks this @experimental.
    tsconfigPaths: true,
    // https://github.com/vitejs/vite/issues/3040
    alias:
      process.env.NODE_ENV !== "production"
        ? {
            "./useLocale.js": "./useLocale.ts",
          }
        : undefined,
  },
  define: {
    // Preserved from super-template's craLikePlugin. @visma/public.config (see
    // main.tsx) reads process.env at runtime to build globalThis.ENV; the
    // REACT_APP_* keys are layered on top by vite-plugin-env-compatible below.
    "process.env": {},
    "process.platform": "undefined",
    "process.browser": "true",
    CHANGELOG: "`" + (await readFile("../CHANGELOG.md", "utf8")) + "`",
  },
  optimizeDeps: {
    // Opt out from optimizing `@/api` (see optimizeOpenAPIPatchPlugin) — dev
    // pre-bundling otherwise gives a different clientPromise reference.
    exclude: ["@/api"],
  },
  build: {
    rolldownOptions: {
      onwarn(warning, warn) {
        // Dependencies ship a 'use client' directive for Next.js/RSC bundlers;
        // Vite doesn't use it and Rollup only warns that it's ignored.
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
      output: {
        // Required with the groups below: reflect-metadata (main.tsx) is a
        // CommonJS module that rolldown otherwise runs lazily, after the x509
        // chunk has already evaluated tsyringe, which then throws "tsyringe
        // requires a reflect polyfill". This keeps the source import order.
        strictExecutionOrder: true,
        // Split the large libraries out of the app entry chunk so they are
        // cached separately across releases. Only libraries the app itself
        // loads are listed: no catch-all node_modules group, or the mock-only
        // libraries (msw, openapi-backend, ...) of the dynamically imported
        // src/mocks/browser.js would end up in a chunk the app loads eagerly.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: nodeModules(
                "react",
                "react-dom",
                "scheduler",
                "react-router",
                "react-router-dom",
                "@remix-run/router"
              ),
            },
            {
              name: "mui",
              test: nodeModules(
                "@mui/[^/]+",
                "@emotion/[^/]+",
                "@popperjs/core",
                "react-transition-group",
                "stylis",
                "styled-components",
                "polished"
              ),
            },
            {
              name: "intl",
              test: nodeModules(
                "react-intl",
                "@formatjs/[^/]+",
                "intl-messageformat"
              ),
            },
            {
              name: "markdown",
              test: nodeModules(
                "react-markdown",
                "micromark[^/]*",
                "mdast-[^/]+",
                "hast-[^/]+",
                "unist-[^/]+",
                "unified",
                "vfile[^/]*",
                "property-information",
                "remark-[^/]+"
              ),
            },
            {
              name: "x509",
              test: nodeModules(
                "@peculiar/[^/]+",
                "asn1js",
                "pvtsutils",
                "pvutils",
                "tsyringe"
              ),
            },
            {
              name: "libs",
              test: nodeModules(
                "lodash",
                "lodash-es",
                "axios",
                "openapi-client-axios"
              ),
            },
          ],
        },
      },
    },
  },
  plugins: [
    dateFnsLocaleVitePlugin,
    // defaultExport unwraps CJS default (mirrors super-template's own handling
    // of these two plugins) so ESM↔CJS interop doesn't yield the namespace.
    defaultExport(dynamicImport)(),
    defaultExport(envCompatible)({ prefix: "REACT_APP_" }),
    gitInfoPlugin,
    optimizeOpenAPIPatchPlugin,
    projectAliasPlugin,
    // @vitejs/plugin-react 6 transforms JSX/TS with OXC and no longer accepts a
    // `babel` option, so babel-plugin-formatjs (which injects the message `id`
    // into every FormattedMessage/defineMessage — without it react-intl throws
    // "An `id` must be provided") and babel-plugin-codegen can't run through it.
    // Run them via vite-plugin-babel instead, restricted to our own source.
    // parserOpts (jsx+typescript, syntax-only — no transform preset) let babel
    // parse .tsx and re-emit it with types/JSX intact for OXC to finish.
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
    react(),
    reactIntlBundledMessagesPlugin({ noParser: false }),
    // Replaces super-template's esbuild node-globals/node-modules polyfills
    // (dev) and rollup-plugin-node-polyfills (build). global/process stay on
    // the `define` above (public.config depends on that shape); this handles
    // the node builtin MODULE imports (e.g. pvtsutils' `import { Buffer } from
    // "buffer"`, which broke the rollup build) and injects the Buffer global.
    nodePolyfills({
      globals: { Buffer: true, global: false, process: false },
      protocolImports: true,
    }),
    {
      name: "html-transform",
      transformIndexHtml(html: string) {
        return html.replace(
          "https://virkailija.vaihda_opintopolku.fi/virkailija-raamit/apply-raamit.js",
          process.env.VITE_RAAMIT_PATH ?? ""
        );
      },
    },
  ],
});
