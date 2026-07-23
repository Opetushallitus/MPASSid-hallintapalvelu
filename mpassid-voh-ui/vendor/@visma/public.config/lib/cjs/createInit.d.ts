type Config = Record<string, any>;
type Hostname = string;
type ConfigByHostname = [Hostname, Config];
type ConfigOption = Config | ConfigByHostname;
export interface Options {
    config?: ConfigOption | ConfigOption[];
    prefix?: string | string[];
}
export declare const defaultOptions: {
    prefix: string[];
    config: never[];
};
export default function createInit(configs: ConfigOption[]): (options?: Options) => void;
export {};
