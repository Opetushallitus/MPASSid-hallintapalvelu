export default function defaultExport(module) {
    const cjsModule = module;
    return typeof (cjsModule === null || cjsModule === void 0 ? void 0 : cjsModule.default) === 'undefined' ? module : cjsModule.default;
}
//# sourceMappingURL=defaultExport.js.map