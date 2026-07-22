import { execSync } from 'child_process';
function git(command, fallback) {
    try {
        return JSON.stringify(execSync(`git ${command}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    } catch {
        return JSON.stringify(fallback);
    }
}
const gitInfoPlugin = {
    name: '@visma/vite-plugin-super-template-git-info',
    config: () => ({
        define: {
            'ENV.GIT_VERSION': git('describe --always', 'unknown'),
            'ENV.GIT_AUTHOR_DATE': git('log -1 --format=%aI', 'unknown'),
        },
    }),
};
export default gitInfoPlugin;
//# sourceMappingURL=gitInfoPlugin.js.map