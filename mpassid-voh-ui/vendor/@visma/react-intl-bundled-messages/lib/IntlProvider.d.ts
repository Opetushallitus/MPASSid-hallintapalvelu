import React from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
export default function IntlProvider({ locale, defaultLocale, messages, ...otherProps }: Partial<React.ComponentProps<typeof ReactIntlProvider>>): React.JSX.Element;
