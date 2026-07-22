import reactIntlBundledMessagesPlugin from '@visma/react-intl-bundled-messages/lib/vitePlugin.js';
import react from '@vitejs/plugin-react';
import dynamicImport from 'vite-plugin-dynamic-import';
import envCompatible from 'vite-plugin-env-compatible';
import faviconsPlugin from './faviconsPlugin.js';
export declare const defaultOptions: {
    envCompatible: {
        prefix: string;
    };
    favicons: {
        source: string;
        config: {
            icons: {
                android: boolean;
                appleIcon: boolean;
                appleStartup: boolean;
                favicons: boolean;
                windows: boolean;
                yandex: boolean;
            };
        };
    };
    react: {
        babel: {
            presets: string[];
            plugins: string[];
        };
    };
    reactIntlBundledMessages: {
        noParser: boolean;
    };
};
interface Options {
    dynamicImport?: Parameters<typeof dynamicImport>[0];
    envCompatible?: Parameters<typeof envCompatible>[0];
    favicons?: Parameters<typeof faviconsPlugin>[0];
    react?: Parameters<typeof react>[0];
    reactIntlBundledMessages?: Parameters<typeof reactIntlBundledMessagesPlugin>[0];
}
export default function superTemplate(options?: Options): any[];
export {};
