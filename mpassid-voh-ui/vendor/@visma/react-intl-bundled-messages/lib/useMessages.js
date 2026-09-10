import { create } from '@postinumero/use-async';
import messagesDynamicImports from '@visma/vite-plugin-react-intl-bundled-messages/dynamic-import-messages';
const [, , useImportMessagesSafe] = create((locale) => { var _a, _b; return (_b = (_a = messagesDynamicImports[locale]) === null || _a === void 0 ? void 0 : _a.call(messagesDynamicImports)) !== null && _b !== void 0 ? _b : Promise.resolve(); });
export default function useMessages({ locale, defaultLocale = locale, }) {
    const [, defaultMessages] = useImportMessagesSafe(defaultLocale);
    const [, messages] = useImportMessagesSafe(locale);
    return {
        ...defaultMessages === null || defaultMessages === void 0 ? void 0 : defaultMessages.default,
        ...messages === null || messages === void 0 ? void 0 : messages.default,
    };
}
//# sourceMappingURL=useMessages.js.map