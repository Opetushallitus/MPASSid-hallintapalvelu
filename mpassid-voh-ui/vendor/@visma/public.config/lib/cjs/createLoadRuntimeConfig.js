"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
function createLoadRuntimeConfig(init) {
    return async function loadRuntimeConfig(url) {
        const finalUrl = new Function(...Object.keys(globalThis.location), `return \`${url}\``)(...Object.values(globalThis.location));
        let config;
        try {
            config = (await (0, axios_1.default)(finalUrl)).data;
        }
        catch { }
        init({ config });
    };
}
exports.default = createLoadRuntimeConfig;
//# sourceMappingURL=createLoadRuntimeConfig.js.map