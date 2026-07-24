var _a, _b, _c, _d;
import '@visma/public.config/config';
import { createHash } from 'crypto';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as url from 'url';
import { normalizePath } from 'vite';
const require = createRequire(import.meta.url);
function getAvailableLocales() {
    try {
        const localeDir = normalizePath(path.dirname(require.resolve('date-fns/locale')));
        return fg
            .sync(`${localeDir}/*`, { onlyDirectories: true })
            .map((localePath) => path.basename(localePath));
    }
    catch {
        return [];
    }
}
const availableLocales = getAvailableLocales();
const fallback = (_b = (_a = globalThis.ENV) === null || _a === void 0 ? void 0 : _a.LOCALES) === null || _b === void 0 ? void 0 : _b[0];
const dateFnsLocales = ((_d = (_c = globalThis.ENV) === null || _c === void 0 ? void 0 : _c.LOCALES) !== null && _d !== void 0 ? _d : []).map((locale) => {
    var _a;
    const primary = locale;
    const [lang] = locale.split('-');
    const secondary = lang;
    const primaryFallback = fallback;
    const [langFallback] = (_a = primaryFallback === null || primaryFallback === void 0 ? void 0 : primaryFallback.split('-')) !== null && _a !== void 0 ? _a : [];
    const secondaryFallback = langFallback;
    const dateFnsLocale = [primary, secondary, primaryFallback, secondaryFallback]
        .filter(Boolean)
        .find((locale) => availableLocales.includes(locale));
    return [locale, dateFnsLocale];
});
const dateFnsLocaleVitePlugin = createPlugin('@visma/vite-plugin-date-fns-locale', 'dynamic-import-date-fns-locales', `export default {
  ${dateFnsLocales
    .map(([locale, dateFnsLocale]) => `  "${locale}": () => import("date-fns/locale/${dateFnsLocale}"),
  `)
    .join('')}}`);
export default dateFnsLocaleVitePlugin;
function createPlugin(name, aliasPath, data) {
    function getHashDigest(content) {
        const hasher = createHash('sha256');
        hasher.update(content);
        return hasher.digest('hex').slice(0, 10);
    }
    const tempDir = './.temp';
    const fileURL = new URL(`${tempDir}/${getHashDigest(data)}.js`, import.meta.url);
    return {
        name,
        buildStart() {
            fs.ensureDirSync(url.fileURLToPath(new URL(tempDir, import.meta.url)));
            fs.writeFileSync(fileURL, data);
        },
        config: () => ({
            resolve: {
                alias: {
                    [`${name}/${aliasPath}`]: url.fileURLToPath(fileURL),
                },
            },
        }),
    };
}
//# sourceMappingURL=dateFnsLocaleVitePlugin.js.map