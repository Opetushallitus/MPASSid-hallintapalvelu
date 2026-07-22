import NodeGlobalsPolyfillPlugin from '@esbuild-plugins/node-globals-polyfill';
import NodeModulesPolyfillPlugin from '@esbuild-plugins/node-modules-polyfill';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';
import defaultExport from './defaultExport.js';
const craLikePlugin = {
    name: '@visma/vite-plugin-super-template-cra-like',
    config: (_config, { mode }) => ({
        server: {
            port: 3000,
        },
        define: {
            'process.env': {},
            'process.platform': 'undefined',
            'process.browser': 'true',
            global: 'globalThis',
        },
        optimizeDeps: {
            // For openapi-client-axios
            esbuildOptions: {
                plugins: [
                    defaultExport(NodeGlobalsPolyfillPlugin)({
                        process: true,
                        buffer: true,
                    }),
                    mode === 'production' && defaultExport(NodeModulesPolyfillPlugin)(),
                ].filter(Boolean),
            },
        },
        build: {
            rollupOptions: {
                plugins: [defaultExport(rollupNodePolyFill)()],
            },
        },
    }),
};
export default craLikePlugin;
//# sourceMappingURL=craLikePlugin.js.map