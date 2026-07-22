import '@visma/public.config/config';
import { dynamicBase as vitePluginDynamicBase } from 'vite-plugin-dynamic-base';
const dynamicBase = [
    {
        name: '@visma/vite-plugin-dynamic-base',
        config: () => ({
            base: process.env.NODE_ENV === 'production' ? '/__dynamic_base__/' : '/',
        }),
    },
    vitePluginDynamicBase({
        publicPath: '((window.ENV && window.ENV.BASENAME) || "")',
        transformIndexHtml: true,
    }),
];
export default dynamicBase;
//# sourceMappingURL=dynamicBase.js.map