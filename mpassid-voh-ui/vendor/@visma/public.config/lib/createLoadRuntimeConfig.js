import axios from 'axios';
export default function createLoadRuntimeConfig(init) {
    return async function loadRuntimeConfig(url) {
        const finalUrl = new Function(...Object.keys(globalThis.location), `return \`${url}\``)(...Object.values(globalThis.location));
        let config;
        try {
            config = (await axios(finalUrl)).data;
        }
        catch { }
        init({ config });
    };
}
//# sourceMappingURL=createLoadRuntimeConfig.js.map