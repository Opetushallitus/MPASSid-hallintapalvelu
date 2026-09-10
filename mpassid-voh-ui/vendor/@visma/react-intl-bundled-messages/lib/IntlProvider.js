import defaultLocaleValue from '@visma/react-app-locale-utils/lib/defaultLocale.js';
import useLocale from '@visma/react-app-locale-utils/lib/useLocale.js';
import React from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import useMessages from './useMessages.js';
export default function IntlProvider({ locale, defaultLocale, messages, ...otherProps }) {
    var _a;
    const [localeSetting] = useLocale();
    defaultLocale !== null && defaultLocale !== void 0 ? defaultLocale : (defaultLocale = defaultLocaleValue);
    locale !== null && locale !== void 0 ? locale : (locale = (_a = localeSetting) !== null && _a !== void 0 ? _a : defaultLocale);
    return (React.createElement(ReactIntlProvider, { messages: {
            ...useMessages({ locale, defaultLocale }),
            ...messages,
        }, locale: locale, defaultLocale: defaultLocale, ...otherProps }));
}
//# sourceMappingURL=IntlProvider.js.map