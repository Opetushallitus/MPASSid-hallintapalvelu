import '@visma/public.config/config';
import type { Plugin } from 'vite';
export declare const defaultOptions: {
    noParser: boolean;
};
interface Options {
    noParser?: boolean;
}
declare const reactIntlBundledMessagesPlugin: (options?: Options) => (false | Plugin)[];
export default reactIntlBundledMessagesPlugin;
