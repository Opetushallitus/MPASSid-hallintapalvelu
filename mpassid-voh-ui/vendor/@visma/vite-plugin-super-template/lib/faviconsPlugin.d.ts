import { config } from 'favicons';
interface Options {
    source?: string;
    config?: typeof config.defaults;
}
export declare const defaultOptions: {
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
declare const faviconsPlugin: (options?: Options) => any;
export default faviconsPlugin;
