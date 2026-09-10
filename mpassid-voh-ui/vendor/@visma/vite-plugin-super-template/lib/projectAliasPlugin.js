import * as path from 'node:path';
const projectAliasPlugin = {
    name: '@visma/vite-plugin-super-template-project-alias',
    config: (config) => {
        var _a;
        return ({
            resolve: {
                alias: {
                    '@': path.resolve((_a = config.root) !== null && _a !== void 0 ? _a : '', 'src'),
                },
            },
        });
    },
};
export default projectAliasPlugin;
//# sourceMappingURL=projectAliasPlugin.js.map