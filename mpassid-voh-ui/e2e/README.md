# e2e-testit

Playwright ajaa testit selaimessa Vite-devpalvelinta (`npm run dev`) ja
MSW-mockattua backendia vasten - ei tarvita oikeaa backendia eikä
tietokantaa.

## Ajaminen

```bash
# Kertaalleen: asenna Playwrightin Chromium-selain (ja käyttöjärjestelmän
# riippuvuudet)
npm run playwright:install

# Kaikki e2e-testit
npm run test:e2e

# Yksi tiedosto
npm run test:e2e -- e2e/school-selection.spec.ts

# Yksi testi nimen perusteella (regex täsmää test()-otsikkoon)
npm run test:e2e -- -g "s8"

# Interaktiivinen UI-tila (testien valinta, ajo ja debug selaimessa)
npm run test:e2e:ui

# HTML-raportti epäonnistuneen ajon jälkeen (avautuu selaimeen)
npx playwright show-report

# Hidastettuna, näkyvässä selaimessa (debug/seuraaminen silmämääräisesti) -
# SLOWMO on millisekunteina jokaisen toiminnon välissä (esim. 300-800 sopiva
# seurattavaksi); ilman --headed selain pysyy näkymättömänä eikä
# hidastuksesta ole silmämääräistä hyötyä.
SLOWMO=500 npm run test:e2e -- --headed
```

`playwright.config.ts` käynnistää `npm run dev`:n automaattisesti testien
ajaksi (`webServer`-asetus) - erillistä devpalvelimen käynnistämistä ei
tarvita, paitsi jos haluat ajaa testejä palvelinta vasten, joka on jo
käynnissä (`reuseExistingServer` käyttää sitä silloin).

Testit ajetaan rinnakkain (`fullyParallel: true`), mikä ajoittain aiheuttaa
satunnaisia epäonnistumisia yhtä paikallista dev-serveriä vastaan
kilpailevien workereiden takia (esim. "Tallenna"-napin enabloitumisen
odotus ylittää aikarajan ilman todellista sovellusvikaa) - ei todellinen
sovellusvirhe. Tämän lieventämiseksi `retries` on asetettu (1 paikallisesti,
2 CI:ssä, `process.env.CI`:n mukaan) - uudelleen yritetty testi näkyy
HTML-raportissa silti flaky:na, ei piiloudu hiljaisesti onnistuneena.

Epäonnistuneen testin `error-context.md` (linkki näkyy terminaalin
virheilmoituksessa, esim. `test-results/<testi>/error-context.md`) sisältää
sivun tilan tallennushetkellä - hyvä ensimmäinen paikka katsoa mitä
todellisuudessa renderöityi.

## Testitiedostot

| Tiedosto | Kattaa |
|---|---|
| `create-*-integration.spec.ts`, `edit-*-integration.spec.ts` | Yhden integraatiotyypin (Wilma/Opinsys/Azure/ADFS/Google:Gsuite/SAML/OIDC) perus luonti- ja muokkausvirta, Testi-ympäristöön |
| `create-*-integration-tuotanto.spec.ts` | Samat luontivirrat Tuotanto-ympäristöön - idp-tyypeille valitaan Palveluympäristö luonnin jälkeen (`selectEnvironment()`), sp-tyypeille (SAML/OIDC) "Tuotanto - uusi" valitaan suoraan luontidialogin "palvelu:"-valikosta (`createNewSpIntegration()`:n `environment`-parametri), koska sp-integraatioilla ei ole muokattavaa ympäristövalitsinta luonnin jälkeen |
| `school-selection.spec.ts` | Koulunvalintanäkymän (`SchoolSelection.tsx`) koko luonti/muokkaus-matriisi, ks. alla |
| `delete-integration.spec.ts` | Integraation poisto/deaktivointi ("Poista jäsen"), Passiiviset-suodatin, poiston peruutus |
| `integration-selection.spec.ts` | "Integraatiovalinnat"-välilehti (palvelusallinta) |
| `validation.spec.ts` | Validoinnin negatiivipolut: pakollinen tyhjänä, https/nolocalhost, virheellinen sertifikaatti, ListForm-duplikaatti, rivin poisto |
| `cancel-edit.spec.ts` | "Peruuta" luonnissa ja muokkauksessa - tallentamattomat muutokset hylätään |
| `environment-switch.spec.ts` | Olemassa olevan idp-integraation Testi↔Tuotanto-vaihto muokkaustilassa |
| `home-search-filter.spec.ts` | Etusivun haku/tyhjennys/tyhjä tulos, sarakelajittelu, Ympäristö-suodatin, "Näytä sivulla" |
| `save-error.spec.ts` | Tallennuksen 409/yleinen virhedialogi (vaatii mock-lisäyksen, ks. alla) |
| `integration-detail-view.spec.ts` | Read-only `/integraatio/:id`-näkymän sisältö + 404-haara |
| `azure-attribute-test.spec.ts` | Azure "Testaa attribuuttien oikeellisuus" -dialogi (onnistuu/epäonnistuu/pakolliset kentät) |
| `misc-ui.spec.ts` | Disabloitu "Luo"-nappi (sp ilman palveluvalintaa), metadataUrl/tiedostolataus-poissulkevuus (ADFS) |
| `helpers.ts` | Jaetut apufunktiot kaikille yllä oleville (ei sisällä testejä) |

### Mock-only lisäys: virhepolkujen simulointi

`save-error.spec.ts` ja `azure-attribute-test.spec.ts`:n epäonnistumistesti
vaativat deterministisen tavan saada tallennus/attribuuttitesti epäonnistumaan
- MSW on täällä oikea Service Worker, joten Playwrightin `page.route()` ei
tavoita sen jo käsittelemiä pyyntöjä.
Ratkaisuna `src/mocks/requestLogicHandlers.ts`:ään lisättiin kolme
"taika-arvoa" (`E2E_TRIGGER_409`, `E2E_TRIGGER_GENERIC_ERROR`,
`E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE`), jotka `createIntegration`/
`updateIntegration`/`testAttributesAuthorization` tunnistavat ja joiden
perusteella ne palauttavat virhevastauksen kirjaston valmiiksi tukeman
`{status,mock}`-paluuarvon kautta - sama mekanismi kuin sovelluksessa jo
olemassa oleva `id===999995`-erikoistapaus. Tämä on mock-only lisäys
(testi-infrastruktuuria), ei tuotantokoodimuutos.

Ensimmäisen oikean ajon jälkeen samasta syystä lisättiin vielä kaksi
korjausta samaan tiedostoon:
- `getIntegration()` palauttaa nyt `{status:404}` kun id:tä ei löydy
  (`integration-detail-view.spec.ts`:n 404-testi) - aiemmin se vastasi aina
  200:lla tyhjällä bodylla, jolloin sivu jäi ikuisesti latausanimaatioon.
- `updateIntegration()` maskaa `client_secret`:n `"***"`:ksi jokaisen
  PÄIVITYKSEN (ei ensimmäisen luonnin) yhteydessä
  (`create-oidc-integration.spec.ts`:n "ei toistu" -testi) - vastaa sitä
  miten sovellus jo olettaa oikean taustajärjestelmän käyttäytyvän
  (`index.tsx:350`:n `!client_secret.includes("***")`-tarkistus).

## Koulunvalinnan testimatriisi (`school-selection.spec.ts`)

OKJ-integraation (Wilma, Opinsys, Azure, ADFS, Google: Gsuite) koulujen
sisällytys-/poissulkuvalinta on pakollinen aina kun organisaatiolla on
**toinen tuotantovaiheen integraatio samalle oppilaitostyypille** -
sallitut valinnat riippuvat siitä, mitä se toinen integraatio ("sibling")
on jo sisällyttänyt (`existingIncluded`, lyhennetty eSI) tai sulkenut pois
(`existingExcluded`, eSE). Jokainen testi luo tämän sibling-integraation
oikeasti käyttöliittymän kautta (ks. `createSiblingIdpIntegration()` -
`existingIncluded`/`existingExcluded` on laskettu arvo, ei mockattava
vastaus). Koulut viittaavat näihin neljään testikiinteistöön
(`schemas/organizations.json`):

| Lyhenne | Koulukoodi | Oppilaitostyyppi |
|---|---|---|
| A | 30074 Mansikkalan itäinen peruskoulu | 11 (Peruskoulut) |
| B | 30075 Mansikkalan pohjoinen peruskoulu | 11 (Peruskoulut) |
| C | 30076 Mansikkalan testi peruskoulu | 11 (Peruskoulut) |
| D | 30077 Mansikkalan testi lukio | 15 (Lukiot) |

### eSI/eSE:n arvojen merkitys

`existingIncluded`/`existingExcluded` (eSI/eSE) lasketaan
`requestLogicHandlers.ts`:n `getIntegrationDiscoveryInformationValue`:ssä
(rivit 104-152) käymällä läpi kaikki muut samaa oppilaitostyyppiä käyttävät,
aktiiviset Tuotanto-integraatiot. Arvon merkitys:

- **`null`**: ei yhtään olemassa olevaa include- tai exclude-määrittelyä -
  joko yksikään sibling ei jaa oppilaitostyyppiä, tai (eSE:n tapauksessa)
  yksikään löytynyt sibling ei ole määritellyt yhtään poissuljettua koulua.
- **`[xx, yy]`**: olemassa olevat include- tai exclude-koulut ovat
  täsmälleen xx ja yy (siblingien `schools`/`excludedSchools`-kenttien
  unioni).
- **`existingIncluded = []`**: on olemassa sibling-integraatio, jolle ON
  määritelty rajoitus (joku sibling jakaa oppilaitostyypin ja sillä on
  `discoveryInformation`), mutta se ei ole itse lisännyt yhtään koulua
  `schools`-kenttäänsä - tyypillisesti koska se on määritellyt rajoituksensa
  `excludedSchools`:n kautta sen sijaan (esim. yksittäinen exclude), jolloin
  sen oma `schools=[]` tarkoittaa sovelluksen semantiikassa "kaikki koulut
  sisällytetty (pois lukien poissuljetut)". Tästä syystä s1-s7/m1-m7
  (sibling käyttää vain excludedSchools) näkyvät testimatriisissa eSI=[]:nä,
  ei null:na.
- **`existingExcluded = []` ei ole mahdollinen**: koodi asettaa
  `existingExcluded`:n vain, kun löytyneiden siblingien poissuljettujen
  koulujen joukko on epätyhjä (`if (allExcluded.size > 0)`) - se on siis
  aina joko `null` tai vähintään yhden koulun sisältävä taulukko, ei
  koskaan tyhjä taulukko.

**s-sarja**: testattava integraatio valitsee vain Peruskoulut (yksi
oppilaitostyyppi). **m-sarja**: testattava integraatio valitsee
Peruskoulut+Lukiot (kaksi oppilaitostyyppiä) - `SchoolSelection.tsx`:n
tallennusehto (`isExtraSchoolConfigurationOk()`) käyttäytyy näissä kahdessa
tapauksessa eri tavalla (ks. "Huomio m-sarjasta" alla).

| Testi | Sibling(it) | eSI (existingIncluded) | eSE (existingExcluded) | Odotettu tulos |
|---|---|---|---|---|
| s0 | - | null | null | Luonti ja muokkaus ok |
| m0 | - | null | null | Luonti ja muokkaus ok |
| s1 | excludedSchools=[A,B,C,D] | [] | [A,B,C,D] | Luonti ja muokkaus ok (valitse A "schools"-kenttään) |
| s2 | excludedSchools=[A,B,C] | [] | [A,B,C] | Luonti ja muokkaus ok (valitse A) |
| s3 | excludedSchools=[A,B] | [] | [A,B] | Luonti ja muokkaus ok (valitse A) |
| s4 | excludedSchools=[A] | [] | [A] | Luonti ja muokkaus ok (valitse A) |
| s5 | excludedSchools=[A,D] | [] | [A,D] | Luonti ja muokkaus ok (valitse A) |
| s6 | schools=[B] + excludedSchools=[A,D] (2 siblingiä) | [B] | [A,D] | Luonti ja muokkaus ok (valitse A) |
| s7 | schools=[B,C] + excludedSchools=[A,D] (2 siblingiä) | [B,C] | [A,D] | Luonti ja muokkaus ok (valitse A) |
| s8 | schools=[A,B,C,D] | [A,B,C,D] | null | **Ei tallennu** - kaikki Peruskoulut-koulut jo varattu, "Tallenna" pysyy pois käytöstä |
| s9 | schools=[A] | [A] | null | Luonti ok (valitse B), **muokkaus ei tallennu** uudelleenavattaessa |
| s10 | schools=[A,D] | [A,D] | null | Tyhjänä ei tallennu; koulun valinnan (B) jälkeen luonti ja muokkaus ok |
| m1 | excludedSchools=[A,B,C,D] | [] | [A,B,C,D] | Luonti ja muokkaus ok (valitse A) |
| m2 | excludedSchools=[A,B,C] | [] | [A,B,C] | Luonti ja muokkaus ok (valitse A) |
| m3 | excludedSchools=[A,B] | [] | [A,B] | Luonti ja muokkaus ok (valitse A) |
| m4 | excludedSchools=[A] | [] | [A] | Luonti ja muokkaus ok (valitse A) |
| m5 | excludedSchools=[A,D] | [] | [A,D] | Luonti ja muokkaus ok (valitse A) |
| m6 | schools=[B] + excludedSchools=[A,D] (2 siblingiä) | [B] | [A,D] | Luonti ja muokkaus ok (valitse A) |
| m7 | schools=[B,C] + excludedSchools=[A,D] (2 siblingiä) | [B,C] | [A,D] | Luonti ja muokkaus ok (valitse A) |
| m8 | schools=[A,B,C,D] | [A,B,C,D] | null | Luonti ja muokkaus ok (valitse A) |
| m9 | schools=[A] | [A] | null | Luonti ja muokkaus ok (valitse A) |
| m10 | schools=[A,D] | [A,D] | null | Luonti ja muokkaus ok (valitse A) |
| m11 | ei rajoituksia (sibling on olemassa mutta ei sisällytä/sulje mitään pois) | [] | null | Luonti ja muokkaus ok (valitse A) |

### Huomio m-sarjasta: varoitusteksti

m1-m11 tarkistavat lisäksi, että kun molemmat oppilaitostyypit on valittu,
näkyviin tulee varoitus "Valittuja oppilaitostyyppejä jo muissa
integraatioissa, muokkaaminen mahdollistaa saman koulun näkymisen useassa
integraatiossa" (`SchoolSelection.tsx`:n `adminConfiguration`-Alert). m0
(ei sibling-integraatiota) tarkistaa, ettei varoitus näy. Koodin
(`analyseExistingExclude`/`analyseExistingInclude`) mukaan varoitus riippuu
käytännössä vain siitä, löytyykö sibling ollenkaan (`
noExistingSchoolConfigurations.current`) - ei eSI/eSE:n tarkasta sisällöstä -
minkä takia sama toBeVisible()-tarkistus pätee kaikkiin m1-m11:een.

### Huomio "Kaikki koulut ovat jo käytössä muissa integraatioissa" -varoituksesta

Tämä varoitus (`Validators.tsx`:n `allSchoolsUsed`, näytetään
"Oppilaitostyypit"-kentän helperText:inä `mandatoryinstitutionTypesText`:n
kautta, ks. `SchoolSelection.tsx:859-874`) tulee näkyviin, kun
`possibleSchools.current` on tyhjä - eli kun sibling(it) ovat jo sisällyttäneet
kaikki kyseisen oppilaitostyypin koulut. Tämä toteutuu koodin mukaan
**vain s8:ssa** (yksi oppilaitostyyppi, sibling schools=[A,B,C,D] kattaa
kaikki kolme Peruskoulut-koulua) - s8 tarkistaa varoituksen näkyvän. s9 ja
s10 tarkistavat, ettei varoitus näy (eSI ei kata kaikkia kouluja). m-sarjassa
`updateExtraSchoolsConfigurationData`:n moni-oppilaitostyyppi-override
(`SchoolSelection.tsx:605-608`) tarjoaa aina KAIKKI valitun tyypin koulut
eSI/eSE:stä riippumatta, joten `possibleSchools.current` ei voi olla tyhjä -
m1-m5/m8-m11-looppi tarkistaa tämän eksplisiittisesti (mm. m8, jolla on
täsmälleen s8:n sibling-data mutta EI varoitusta, koska oppilaitostyyppejä on
kaksi).

### Huomio "schools"/"excludedSchools"-valikkojen sisällöstä

Joka testi (`getMultiSelectOptions()`, `helpers.ts`) tarkistaa lisäksi, että
"schools"-/"excludedSchools"-alasvetovalikko tarjoaa **täsmälleen** eSI/eSE:n
sallimat koulut - ei vain, että yksi tietty valinta sattuu toimimaan:

- s1-s7: "schools" = allSchools(Peruskoulut) ∩ eSE ∩ (ei eSI:ssä) -
  vaihtelee per skenaario (esim. s1/s2 = {A,B,C}, s3 = {A,B}, s4/s5/s6/s7 =
  {A}). "excludedSchools" on piilotettu (`hideExcludeSchools`) näissä.
- s8: EI tarkistusta - `mandatoryExtraSchoolConfiguration()`
  (`SchoolSelection.tsx:389-409`) sammuttaa koko "Lisää kouluvalinta
  säännöt" -kytkimen aina kun `possibleSchools.current` on tyhjä, jolloin
  "schools" JA "excludedSchools" jäävät molemmat kokonaan renderöimättä
  (vahvistettu oikean ajon page-snapshotista) - vain "Oppilaitostyypit"-
  varoitus ja pois käytöstä oleva "Tallenna" ovat havaittavissa.
- s9: "schools" = {B,C}, "excludedSchools" = {A,B,C} - `possibleSchools`
  ei ole tyhjä, joten kytkin (ja molemmat kentät) pysyvät päällä toisin
  kuin s8:ssa.
- s10: "schools" = {B,C}, "excludedSchools" = {A,B,C}.
- m1-m11 (looppi + m6/m7): moni-oppilaitostyyppi-overriden takia MOLEMMAT
  kentät (kun vielä molemmat näkyvissä, ennen omaa valintaa) tarjoavat aina
  kaikki neljä koulua ({A,B,C,D}) - eSI/eSE ei rajoita kumpaakaan.

### Huomio m-sarjasta (m8-m10)

Alkuperäisen matriisin mukaan m8/m9/m10:n piti peilata s8/s9/s10:n
"ei tallennu" -tuloksia. Toteutuksen aikana selvisi, että
`isExtraSchoolConfigurationOk()`:n moni-oppilaitostyyppihaara
(`SchoolSelection.tsx:270-275`, käytössä kun integraatiolla on useampi kuin
yksi oppilaitostyyppi) ei tarkista eSI/eSE:tä lainkaan - se vaatii vain,
että jokin oma valinta on tehty. Sama koskee koulujen tarjontaa:
`updateExtraSchoolsConfigurationData` (`SchoolSelection.tsx:593-596`)
tarjoaa moni-oppilaitostyyppisille integraatioille aina KAIKKI valitun
tyypin koulut eSI/eSE:stä riippumatta. Tämän seurauksena m8/m9/m10 ovat
todellisuudessa "ok"-tapauksia - tämä on vahvistettu oikealla testiajolla.

