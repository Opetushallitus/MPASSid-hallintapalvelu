import defaultLocale from './defaultLocale.js';
import locales from './locales.js';
const regionsAndLanguages = locales.map((locale) => {
    const [language, region] = locale.split('-');
    return {
        locale,
        region: new Intl.DisplayNames(locale, {
            type: 'region',
        }).of(region),
        language: new Intl.DisplayNames(locale, {
            type: 'language',
        }).of(language),
    };
});
const compare = new Intl.Collator(defaultLocale).compare;
const displayNames = regionsAndLanguages.map((regionAndLanguage) => ({
    locale: regionAndLanguage.locale,
    value: regionsAndLanguages.some((regionAndLanguageValue) => regionAndLanguage !== regionAndLanguageValue &&
        regionAndLanguage.language === regionAndLanguageValue.language)
        ? `${regionAndLanguage.language} (${regionAndLanguage.region})`
        : regionAndLanguage.language,
}));
const displayNamesSorted = displayNames.sort((a, b) => compare(a.value, b.value));
export default displayNamesSorted;
//# sourceMappingURL=displayNames.js.map