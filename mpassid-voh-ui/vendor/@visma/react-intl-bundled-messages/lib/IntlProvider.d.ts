/// <reference types="react" />
import { IntlProvider as ReactIntlProvider } from 'react-intl';
export default function IntlProvider({ locale, defaultLocale, messages, ...otherProps }: Partial<ReactIntlProvider['props']>): JSX.Element;
