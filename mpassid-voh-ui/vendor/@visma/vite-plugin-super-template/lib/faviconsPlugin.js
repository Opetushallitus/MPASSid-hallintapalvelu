import fs from 'fs-extra';
import vitePluginFaviconsInject from 'vite-plugin-favicons-inject';
export const defaultOptions = {
    source: 'src/images/icon.png',
    config: {
        icons: {
            android: false,
            appleIcon: false,
            appleStartup: false,
            favicons: true,
            windows: false,
            yandex: false,
        },
    },
};
const faviconsPlugin = (options) => {
    var _a, _b;
    return (options === null || options === void 0 ? void 0 : options.source) || fs.pathExistsSync(defaultOptions.source)
        ? vitePluginFaviconsInject((_a = options === null || options === void 0 ? void 0 : options.source) !== null && _a !== void 0 ? _a : defaultOptions.source, (_b = options === null || options === void 0 ? void 0 : options.config) !== null && _b !== void 0 ? _b : defaultOptions.config)
        : [];
};
export default faviconsPlugin;
//# sourceMappingURL=faviconsPlugin.js.map