import dateFnsLocaleVitePlugin from '@visma/react-app-locale-utils/lib/dateFnsLocaleVitePlugin.js';
import reactIntlBundledMessagesPlugin, { defaultOptions as reactIntlBundledMessages, } from '@visma/react-intl-bundled-messages/lib/vitePlugin.js';
import react from '@vitejs/plugin-react';
import dynamicImport from 'vite-plugin-dynamic-import';
import envCompatible from 'vite-plugin-env-compatible';
import tsconfigPaths from 'vite-tsconfig-paths';
import craLikePlugin from './craLikePlugin.js';
import defaultExport from './defaultExport.js';
import dynamicBase from './dynamicBase.js';
import faviconsPlugin, { defaultOptions as favicons, } from './faviconsPlugin.js';
import gitInfoPlugin from './gitInfoPlugin.js';
import optimizeOpenAPIPatchPlugin from './optimizeOpenAPIPatchPlugin.js';
import projectAliasPlugin from './projectAliasPlugin.js';
export const defaultOptions = {
    envCompatible: {
        prefix: 'REACT_APP_',
    },
    favicons,
    react: {
        babel: {
            presets: ['@visma/formatjs'],
            plugins: ['codegen'],
        },
    },
    reactIntlBundledMessages,
};
export default function superTemplate(options) {
    var _a, _b;
    return [
        craLikePlugin,
        dateFnsLocaleVitePlugin,
        defaultExport(dynamicImport)(options === null || options === void 0 ? void 0 : options.dynamicImport),
        dynamicBase,
        defaultExport(envCompatible)((_a = options === null || options === void 0 ? void 0 : options.envCompatible) !== null && _a !== void 0 ? _a : defaultOptions.envCompatible),
        faviconsPlugin(options === null || options === void 0 ? void 0 : options.favicons),
        gitInfoPlugin,
        optimizeOpenAPIPatchPlugin,
        projectAliasPlugin,
        react((_b = options === null || options === void 0 ? void 0 : options.react) !== null && _b !== void 0 ? _b : defaultOptions.react),
        reactIntlBundledMessagesPlugin(options === null || options === void 0 ? void 0 : options.reactIntlBundledMessages),
        tsconfigPaths(),
    ];
}
//# sourceMappingURL=main.js.map