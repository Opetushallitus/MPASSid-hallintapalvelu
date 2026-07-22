"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultOptions = void 0;
const merge = require("deepmerge-json");
const lodash_es_1 = require("lodash-es");
const objectMap = (obj, fn) => Object.fromEntries(Object.entries(obj).map(fn));
exports.defaultOptions = {
    prefix: ['REACT_APP_', 'VITE_'],
    config: [],
};
const toArray = (data) => (Array.isArray(data) ? data : [data]);
const overrides = ([hostname, { HOSTNAME_OVERRIDES = [], ...config },]) => [
    [hostname, config],
    ...toArray(HOSTNAME_OVERRIDES).map(toConfigByHostname).map(toHostnameSafe),
];
const toConfigByHostname = (config) => {
    var _a, _b;
    return Array.isArray(config)
        ? config
        : [(_b = (_a = globalThis.location) === null || _a === void 0 ? void 0 : _a.hostname) !== null && _b !== void 0 ? _b : '', config];
};
const hostnameSafe = (hostname) => `.${hostname}`;
const toHostnameSafe = ([hostname, config,]) => [hostnameSafe(hostname), config];
const matchCurrentHostname = ([hostnameSafe]) => hostnameSafe === currentHostnameSafe ||
    currentHostnameSafe.endsWith(hostnameSafe);
const config = ([, config]) => config;
const withoutPrefix = (prefixes) => ([hostname, config]) => [
    hostname,
    objectMap(config, ([key, value]) => {
        const prefix = prefixes.find((prefix) => key.startsWith(prefix));
        return [prefix ? key.slice(prefix.length) : key, value];
    }),
];
const jsonParseSafe = ([hostname, config,]) => [
    hostname,
    objectMap(config, ([key, value]) => {
        try {
            return [key, JSON.parse(value)];
        }
        catch {
            return [key, value];
        }
    }),
];
const currentHostnameSafe = hostnameSafe((_b = (_a = globalThis.location) === null || _a === void 0 ? void 0 : _a.hostname) !== null && _b !== void 0 ? _b : '');
const unflat = (config) => Object.entries(config).reduce((config, [key, value]) => (0, lodash_es_1.set)(config, key, value), {});
function createInit(configs) {
    return function init(options) {
        var _a, _b;
        const prefixes = toArray((_a = options === null || options === void 0 ? void 0 : options.prefix) !== null && _a !== void 0 ? _a : exports.defaultOptions.prefix);
        const configOptions = toArray((_b = options === null || options === void 0 ? void 0 : options.config) !== null && _b !== void 0 ? _b : exports.defaultOptions.config);
        globalThis.ENV = [
            ...configs,
            ...configOptions,
        ]
            .filter(Boolean)
            .map(toConfigByHostname)
            .map(toHostnameSafe)
            .map(withoutPrefix(prefixes))
            .map(jsonParseSafe)
            .flatMap(overrides)
            .filter(matchCurrentHostname)
            .map(config)
            .map(unflat)
            .reduce((config, overrides) => (typeof merge === 'function' ? merge : merge.default)(config, overrides), {});
    };
}
exports.default = createInit;
//# sourceMappingURL=createInit.js.map