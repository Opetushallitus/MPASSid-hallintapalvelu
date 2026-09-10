import useLocalStorageJson from '@postinumero/storage/lib/useLocalStorageJson.js';
import { useMemo } from 'react';
import defaultLocale from './defaultLocale.js';
export default function useLocale() {
    const [locale, setLocale] = useLocalStorageJson('locale');
    const localeValue = locale !== null && locale !== void 0 ? locale : defaultLocale;
    return useMemo(() => [localeValue, setLocale], [localeValue, setLocale]);
}
//# sourceMappingURL=useLocale.js.map