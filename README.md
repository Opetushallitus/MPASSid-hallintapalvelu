# Virkailijan Opintopolun MPASSId

## Frontend

### Kehitys

```sh
cd mpassid-voh-ui
npm ci
npm run dev
```

### Tärkeimmät käytössä olevat työkalut ja kirjastot

| Kirjasto                                                                                                     | Tarkoitus                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Vite](https://vitejs.dev/)                                                                                  | Kehitys ja paketointi                                                                                                                                              |
| [@visma/vite-plugin-super-template](https://www.npmjs.com/package/@visma/vite-plugin-super-template)         | Tarvittavat pluginit kootusti. Pluginit voi koota tarvittaessa erikseen, mikäli plugineihin tarvitaan muutoksia, joita tämän pluginin asetukset eivät mahdollista. |
| [MUI](https://mui.com/)                                                                                      | UI-komponentit                                                                                                                                                     |
| [react-intl](https://formatjs.io/docs/react-intl/)                                                           | Käännöstekstit                                                                                                                                                     |
| [@visma/react-openapi-client-generator](https://www.npmjs.com/package/@visma/react-openapi-client-generator) | Tyypitettyjen API-clientien generoinnit OpenAPI-rajapintakuvauksista                                                                                               |
| [MSW](https://mswjs.io/)                                                                                     | Mock-API                                                                                                                                                           |

## Projektirakenne

Tarkennuksia projektin rakenteeseen:

```
mpassid-voh-ui/                     Frontend
    schemas/                        Tuodut ulkopuolisten palveluiden osittaiset
                                    rajapintakuvaukset API-generointia varten,
                                    sekä mock-arvot
    scripts/export-messages.js      Oletustekstien vienti tiedostoon, jotta
                                    tekstit voidaan tarvittaessa viedä
                                    ohjelmallisesti käännöspalveluun
    src/
        api/                        Generoidut API-clientit
            index.ts                Ylikirjoitetut sovelluksen API-metodit
                                    (sekä samat kuin `client.ts`-tiedostosta)
        utils/                      Apukoodi. Voidaan viedä toiseen repoon
                                    muiden projektien käytettäväksi.
schema.json                         Sovelluksen rajapintakuvaus
```
