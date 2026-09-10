# vendor/@visma

This directory contains vendored copies of Visma's shared `@visma/*` packages
(https://github.com/Visma-AS/visma), consumed as `file:` dependencies from
`package.json` (e.g. `"@visma/public.config": "file:vendor/@visma/public.config"`).

## Buildable from source

For the five TypeScript packages below, both the `src/` sources **and** the
`tsconfig*.json` build config are vendored in, so you can edit the source and
rebuild `lib/` locally:

- `public.config`
- `react-app-locale-utils`
- `react-intl-bundled-messages`
- `vite-plugin-super-template`
- `formatjs-scripts`

The remaining packages (`babel-preset-formatjs`, `eslint-config-super-template`,
`msw-openapi-backend-integration`, `react-openapi-client-generator`, `tsconfig`)
are config/pre-built only and are not built here.

### How to build

From `mpassid-voh-ui/`:

```bash
npm run vendor:build      # builds all five packages in the correct order
```

This runs `vendor/build-vendor.sh`, which `cd`s into each package and runs its
own `npm run build` (i.e. `tsc`). It requires the app's dev dependencies to be
installed (`npm ci`), which provides the hoisted `tsc` and each package's type
dependencies.

To build a single package, `cd` into it and run its build directly:

```bash
cd vendor/@visma/vite-plugin-super-template && npm run build
```

**Build order matters** (encoded in `build-vendor.sh`):

- `react-app-locale-utils`, `react-intl-bundled-messages` and
  `vite-plugin-super-template` reference `../public.config/src` types, so
  `public.config` builds first.
- `formatjs-scripts` imports the **built** `lib/` of `react-app-locale-utils`
  and `react-intl-bundled-messages`, so it builds last.

### Editing source

Make your changes in a package's `src/`, then run `npm run vendor:build`. Do
**not** hand-edit files under a package's `lib/` — that output is regenerated
from `src/` on every build and your change would be lost.

Local patches already applied to vendored source (keep in mind when pulling
upstream updates):

- `public.config/src/createInit.ts` — added an explicit cast in
  `toConfigByHostname`. TypeScript >= 4.6 narrows `Array.isArray()` on that
  union to `any[]` instead of the `ConfigByHostname` tuple, which fails the
  build under the app's TS 4.9. Runtime-neutral.
- `vite-plugin-super-template/src/gitInfoPlugin.ts` — `git()` now falls back to
  `"unknown"` instead of throwing when no `.git` directory / `git` binary is
  available, so a build outside a git checkout doesn't fail.

### `lib/` is committed to git

`lib/` is committed for every package here (the upstream `.gitignore` files
that excluded `lib/` have been removed). A fresh checkout must have a working
`lib/` even before anyone runs `vendor:build`, and the Maven/CI build does not
run `vendor:build`. So: after editing source and running `npm run vendor:build`,
**commit the regenerated `lib/`** along with your `src/` change. Don't re-add a
`lib/`-ignoring `.gitignore` to any of these packages.

Note: rebuilding with the app's TypeScript (4.9) produces cosmetic `.d.ts`
differences vs. the originally published output (e.g. `type X` instead of
`declare type X`, `React.JSX.Element` instead of `JSX.Element`). These are
harmless — the emitted `.js` is functionally identical.

## How to update a vendored package to a newer version

The vendored `src/` and `tsconfig*.json` came from the upstream monorepo at the
git commit each published version was tagged with (`npm view @visma/<pkg>@<ver>
gitHead`). The npm tarball for a version includes `src/` for most packages (but
not `formatjs-scripts`, whose `src/` and all `tsconfig*.json` files were taken
from GitHub at the pinned commit). To move to a newer version, re-fetch that
version's `src/` + `tsconfig*.json` from
`https://raw.githubusercontent.com/Visma-AS/visma/<gitHead>/packages/<pkg>/...`,
replace them locally, reapply the local patches listed above if still needed,
then `npm run vendor:build` and commit.

## Currently vendored versions

| Package                         | Version | Buildable here |
| ------------------------------- | ------- | -------------- |
| babel-preset-formatjs           | 0.1.0   | no (config)    |
| eslint-config-super-template    | 0.1.0   | no (config)    |
| formatjs-scripts                | 1.0.0   | yes            |
| msw-openapi-backend-integration | 1.0.1   | no (pre-built) |
| public.config                   | 1.1.0   | yes            |
| react-app-locale-utils          | 1.1.2   | yes            |
| react-intl-bundled-messages     | 1.3.1   | yes            |
| react-openapi-client-generator  | 1.0.1   | no (pre-built) |
| tsconfig                        | 1.1.3   | no (config)    |
| vite-plugin-super-template      | 0.1.7   | yes            |
