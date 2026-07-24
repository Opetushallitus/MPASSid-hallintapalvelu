import * as muiLocales from '@mui/material/locale/index.js';
import useLocale from './useLocale.js';
export default function useMUILocale() {
    var _a;
    const [locale] = useLocale();
    const [lang] = locale.split('-');
    const muiLocaleKey = locale.replace('-', '');
    let muiLocale = muiLocales[muiLocaleKey];
    if (muiLocale) {
        return muiLocale;
    }
    muiLocale = (_a = Object.entries(muiLocales).find(([locale]) => locale.startsWith(lang))) === null || _a === void 0 ? void 0 : _a[1];
    if (muiLocale) {
        return muiLocale;
    }
    return muiLocales.enUS;
}
//# sourceMappingURL=useMUILocale.js.map