var _a, _b;
import '@visma/public.config/config';
import { createHash } from 'crypto';
import fs from 'fs-extra';
import * as path from 'node:path';
import * as url from 'url';
import { normalizePath } from 'vite';
import target from './target.js';
const availableMessageFiles = fs.pathExistsSync(target)
    ? fs.readdirSync(target)
    : [];
export const defaultOptions = {
    noParser: true,
};
const mainPlugin = createPlugin('@visma/vite-plugin-react-intl-bundled-messages', 'dynamic-import-messages', `export default {
${((_b = (_a = globalThis.ENV) === null || _a === void 0 ? void 0 : _a.LOCALES) !== null && _b !== void 0 ? _b : [])
    .map((locale) => [locale, `${locale}.json`])
    .filter(([_locale, fileName]) => availableMessageFiles.includes(fileName))
    .map(([locale, fileName]) => `  "${locale}": () => import("${normalizePath(path.resolve(target))}/${fileName}"),
`)
    .join('')}}`);
const noParserPlugin = {
    name: '@visma/vite-plugin-icu-messageformat-no-parser',
    config: (_config, { mode }) => ({
        resolve: {
            alias: {
                ...(mode === 'production' && {
                    '@formatjs/icu-messageformat-parser': '@formatjs/icu-messageformat-parser/no-parser',
                }),
            },
        },
    }),
};
const reactIntlBundledMessagesPlugin = (options) => {
    var _a;
    return [
        mainPlugin,
        ((_a = options === null || options === void 0 ? void 0 : options.noParser) !== null && _a !== void 0 ? _a : defaultOptions.noParser) && noParserPlugin,
    ].filter(Boolean);
};
export default reactIntlBundledMessagesPlugin;
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
//# sourceMappingURL=vitePlugin.js.map