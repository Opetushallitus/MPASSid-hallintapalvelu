import createInit from './createInit.js';
export default function createLoadRuntimeConfig(init: ReturnType<typeof createInit>): (url: string) => Promise<void>;
