declare type Config = Record<string, any>;
declare type Hostname = string;
declare type ConfigByHostname = [Hostname, Config];
declare type ConfigOption = Config | ConfigByHostname;
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
