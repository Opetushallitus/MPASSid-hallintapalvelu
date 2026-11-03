# @visma/vite-plugin-super-template

[Vite](https://vitejs.dev/) plugin for super-template.

> **Vendored note (mpassid-voh-ui):** the composed `superTemplate()` default
> export and its vite-3-era build path (`main`, `craLikePlugin`, `dynamicBase`,
> `faviconsPlugin` + `@vitejs/plugin-react@2`, `rollup-plugin-node-polyfills`,
> `@esbuild-plugins/*`, old `vite`) were **removed** — they pulled vulnerable /
> deprecated transitive deps and this app no longer uses them. `vite.config.ts`
> now composes the individual sub-plugins directly, importing only the surviving
> `./lib/*.js` (`gitInfoPlugin`, `optimizeOpenAPIPatchPlugin`, `projectAliasPlugin`,
> `defaultExport`). The `Usage` example below is the ORIGINAL upstream API and no
> longer applies here.

## Usage

`vite.config.js`:

```js
import superTemplate from '@visma/vite-plugin-super-template';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [superTemplate()],
});
```

### Options

Default options can be tweaked or replaced entirely.

#### Replace `@visma/babel-preset-formatjs` with `babel-plugin-formatjs`

```js
import superTemplate, {
  defaultOptions,
} from '@visma/vite-plugin-super-template';
import { defineConfig } from 'vite';

const withOriginalFormatJSBabelPlugin = (options) => {
  const { plugins, presets } = options.react.babel;

  const indexOfVismaFormatJSPreset = presets.findIndex(
    (preset) => preset === '@visma/formatjs'
  );

  presets.splice(indexOfVismaFormatJSPreset, 1);
  plugins.push('formatjs');

  return options;
};

export default defineConfig({
  plugins: [superTemplate(withOriginalFormatJSBabelPlugin(defaultOptions))],
});
```
