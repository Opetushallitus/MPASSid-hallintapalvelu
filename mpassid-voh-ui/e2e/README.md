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

# Sama oikotienä: näkyvä selain, SLOWMO=500 ja yksi testi kerrallaan
# (--workers=1). Hidastuksen voi ylikirjoittaa, ja muut argumentit
# välitetään --:n jälkeen.
npm run test:e2e:visual
npm run test:e2e:visual -- e2e/validation.spec.ts
SLOWMO=1000 npm run test:e2e:visual -- -g "s8"

# Paikallisesti asennetulla selaimella Playwrightin Chromiumin sijaan
# (esim. chrome, msedge)
PW_CHANNEL=chrome npm run test:e2e:visual
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

Selaimen konsoli kirjoitetaan jokaisesta testistä tiedostoon
`test-results/<testi>/browser-console.log` (myös HTML-raportin liitteenä),
ei terminaaliin (`fixtures.ts`). Lokitaso on oletuksena INFO (varoitukset ja
virheet):

```bash
# Kaikki lokit (DEBUG)
npm run test:e2e:debug

# Selaimen konsoli myös terminaaliin
E2E_LOG_STDOUT=1 npm run test:e2e -- e2e/create-wilma-integration.spec.ts
```

## Kattavuus

```bash
# Kertaalleen
npm install -D monocart-coverage-reports

npm run test:e2e:coverage
# tai osa testeistä
npm run test:e2e:coverage -- e2e/school-selection.spec.ts
```

Kerää selaimen V8-kattavuuden jokaisesta testistä (`fixtures.ts`) ja tekee
lopuksi raportin `coverage-e2e/`-hakemistoon: `coverage-e2e/index.html`
(rivit, haarat ja funktiot tiedostoittain), yhteenveto terminaaliin ja
`lcov.info`. Mukana on vain sovelluksen oma `src/`-koodi - ei MSW-mockia,
generoituja API-clienttejä eikä yksikkötestejä (`e2e/coverage/options.ts`).
Tiedostot, joita mikään testi ei lataa, näkyvät 0 %:lla. Ilman
`E2E_COVERAGE=1`:tä keruu on pois päältä eikä kirjastoa tarvita. Vaatii
Node.js >= 22.15 ja Chromiumin (ei toimi `PW_CHANNEL`-selaimilla muilla kuin
Chromium-pohjaisilla).

Huom: uudelleen yritetyn (retries) testin molemmat ajot lasketaan mukaan.
Täysi sivunlataus hävittää selaimesta edellisen dokumentin kattavuuden, joten
fixture kerää sen talteen ennen jokaista testin `page.goto()`/`page.reload()`
-kutsua. Muilla tavoin tehty täysi lataus (esim. `location.href` testissä)
hukkaisi sitä edeltävän kattavuuden.

## Testitiedostot

| Tiedosto | Kattaa |
|---|---|
| `create-*-integration.spec.ts`, `edit-*-integration.spec.ts` | Yhden integraatiotyypin (Wilma/Opinsys/Azure/ADFS/Google:Gsuite/SAML/OIDC) perus luonti- ja muokkausvirta, Testi-ympäristöön |
| `create-*-integration-tuotanto.spec.ts` | Samat luontivirrat Tuotanto-ympäristöön - idp-tyypeille valitaan Palveluympäristö luonnin jälkeen (`selectEnvironment()`), sp-tyypeille (SAML/OIDC) "Tuotanto - uusi" valitaan suoraan luontidialogin "palvelu:"-valikosta (`createNewSpIntegration()`:n `environment`-parametri), koska sp-integraatioilla ei ole muokattavaa ympäristövalitsinta luonnin jälkeen |
| `school-selection.spec.ts` | Koulunvalintanäkymän (`SchoolSelection.tsx`) koko luonti/muokkaus-matriisi, ks. alla |
| `school-selection-extra.spec.ts` | Koulunvalinnan tallennettu data, sisarintegraatioiden vaikutukset, virhe- ja kilpailutilanteet, Tuotanto-Testi → Tuotanto, oppilaitostyypin poisto, näkymän ja sääntöjen kytkimet, OKJ:n näyttönimi ja otsikko, monityyppisen integraation varoitus |
| `delete-integration.spec.ts` | Integraation poisto/deaktivointi ("Poista jäsen"), Passiiviset-suodatin, poiston peruutus |
| `integration-selection.spec.ts` | "Integraatiovalinnat"-välilehti (palvelusallinta): kytkimet ja yksittäisten palvelujen salliminen syötetyillä set-integraatioilla |
| `validation.spec.ts` | Validoinnin negatiivipolut: pakollinen tyhjänä, https/nolocalhost, binddn (Opinsys), päivämäärä (Azure), expert-varoitus (Wilma), virheellinen sertifikaatti ja sertifikaatin voimassaolovaroitukset (`certs.ts` luo sertifikaatit ajonaikaisesti), ListForm-duplikaatti, rivin poisto |
| `metadata-fields.spec.ts` | Palvelun metadata: OIDC:n yksivalintaiset kentät (token_endpoint_auth_method, id_token_signed_response_alg ja "Ei arvoa"), client_secretin uudelleengenerointi, SAML:n authnRequestsSigned-kytkin ja encryptionCertificates (PEM-otsakkeiden karsinta) |
| `list-object-forms.spec.ts` | Lista- ja objektilomakkeiden reunatapaukset: SAML assertionConsumerServiceUrls (ObjectForm: rivin muokkaus/poisto, isDefault, automaattinen index, virheellinen rivi) ja OIDC redirect_uris (ListForm: Lisää-nappi, näppäilyvalidointi, tyhjä Enter, poisto muokkauksessa) |
| `cancel-edit.spec.ts` | "Peruuta" luonnissa ja muokkauksessa - tallentamattomat muutokset hylätään |
| `environment-switch.spec.ts` | Olemassa olevan idp-integraation Testi↔Tuotanto-vaihto muokkaustilassa |
| `home-search-filter.spec.ts` | Etusivun haku/tyhjennys/tyhjä tulos, sarakelajittelu, Ympäristö-suodatin, "Näytä sivulla" |
| `save-error.spec.ts` | Tallennuksen 409/yleinen virhedialogi (vaatii mock-lisäyksen, ks. alla) |
| `integration-detail-view.spec.ts` | Read-only `/integraatio/:id`-näkymän sisältö + 404-haara + yleinen virheilmoitus (ErrorFallback) + set-integraation integraatiolista |
| `logo.spec.ts` | Logon pienennys (leveä/korkea/mahtuva kuva) ja kuva, jota ei voi avata |
| `open-integration-tabs.spec.ts` | Avointen integraatioiden välilehdet yläpalkissa: avaus, järjestys, sulkeminen (avoin/muu/ainoa, etusivulla), suljettu ei palaa, uudelleenlataus |
| `azure-attribute-test.spec.ts` | Azure "Testaa attribuuttien oikeellisuus" -dialogi: onnistuu/epäonnistuu (403 ja 200 false)/pakolliset kentät, tuntematon käyttäjä, Client Keyn näyttö, istunnon uudelleenkäyttö, sisäkkäiset attribuuttipolut tulostaulukossa |
| `misc-ui.spec.ts` | Disabloitu "Luo"-nappi (sp ilman palveluvalintaa), metadataUrl/tiedostolataus-poissulkevuus (ADFS) |
| `helpers.ts` | Jaetut apufunktiot kaikille yllä oleville (ei sisällä testejä) |

### Mock-only lisäys: virhepolkujen simulointi

`save-error.spec.ts` ja `azure-attribute-test.spec.ts`:n epäonnistumistesti
vaativat deterministisen tavan saada tallennus/attribuuttitesti epäonnistumaan
- MSW on täällä oikea Service Worker, joten Playwrightin `page.route()` ei
tavoita sen jo käsittelemiä pyyntöjä.
Ratkaisuna `src/mocks/requestLogicHandlers.ts`:ään lisättiin kolme
"taika-arvoa" (`E2E_TRIGGER_409`, `E2E_TRIGGER_GENERIC_ERROR`,
`E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE`; myöhemmin myös
`E2E_TRIGGER_ATTRIBUTE_TEST_UNAUTHORIZED` ja `E2E_TRIGGER_UNKNOWN_PRINCIPAL`), jotka `createIntegration`/
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
  (`create-oidc-integration.spec.ts`:n "ei toistu" -testi), kuten oikea
  taustajärjestelmä.

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

`existingIncluded`/`existingExcluded` (eSI/eSE) lasketaan kaikista muista
samaa oppilaitostyyppiä käyttävistä, aktiivisista Tuotanto-integraatioista.
Arvon merkitys:

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
- **`existingExcluded = []` ei ole mahdollinen**: `existingExcluded` on
  aina joko `null` tai vähintään yhden koulun sisältävä taulukko, ei
  koskaan tyhjä taulukko.

**s-sarja**: testattava integraatio valitsee vain Peruskoulut (yksi
oppilaitostyyppi). **m-sarja**: testattava integraatio valitsee
Peruskoulut+Lukiot (kaksi oppilaitostyyppiä) - tallennusehto käyttäytyy
näissä kahdessa tapauksessa eri tavalla (ks. "Huomio m-sarjasta" alla).

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
integraatiossa". m0 (ei sibling-integraatiota) tarkistaa, ettei varoitus
näy. Varoitus näkyy aina, kun sibling-integraatio on olemassa, eSI/eSE:n
sisällöstä riippumatta, joten sama tarkistus pätee kaikkiin m1-m11:een.

### Huomio "Kaikki koulut ovat jo käytössä muissa integraatioissa" -varoituksesta

Varoitus näytetään "Oppilaitostyypit"-kentän ohjetekstinä, kun sibling(it)
ovat jo sisällyttäneet kaikki kyseisen oppilaitostyypin koulut. Matriisissa
tämä toteutuu **vain s8:ssa** (yksi oppilaitostyyppi, sibling
schools=[A,B,C,D] kattaa kaikki kolme Peruskoulut-koulua) - s8 tarkistaa
varoituksen näkyvän. s9 ja s10 tarkistavat, ettei varoitus näy (eSI ei kata
kaikkia kouluja). m-sarjassa tarjolla ovat aina kaikki valitun tyypin koulut
eSI/eSE:stä riippumatta, joten varoitusta ei näytetä - m1-m5/m8-m11-looppi
tarkistaa tämän (mm. m8, jolla on täsmälleen s8:n sibling-data mutta EI
varoitusta, koska oppilaitostyyppejä on kaksi).

### Huomio "schools"/"excludedSchools"-valikkojen sisällöstä

Joka testi (`getMultiSelectOptions()`, `helpers.ts`) tarkistaa lisäksi, että
"schools"-/"excludedSchools"-alasvetovalikko tarjoaa **täsmälleen** eSI/eSE:n
sallimat koulut - ei vain, että yksi tietty valinta sattuu toimimaan:

- s1-s7: "schools" = allSchools(Peruskoulut) ∩ eSE ∩ (ei eSI:ssä) -
  vaihtelee per skenaario (esim. s1/s2 = {A,B,C}, s3 = {A,B}, s4/s5/s6/s7 =
  {A}). "excludedSchools" on piilotettu näissä.
- s8: EI tarkistusta - kun tarjolla ei ole yhtään koulua, "Lisää
  kouluvalinta säännöt" -kytkin sammuu ja "schools" JA "excludedSchools"
  jäävät molemmat näyttämättä - vain "Oppilaitostyypit"-varoitus ja pois
  käytöstä oleva "Tallenna" ovat havaittavissa.
- s9: "schools" = {B,C}, "excludedSchools" = {A,B,C} - tarjolla on kouluja,
  joten kytkin (ja molemmat kentät) pysyvät päällä toisin kuin s8:ssa.
- s10: "schools" = {B,C}, "excludedSchools" = {A,B,C}.
- m1-m11 (looppi + m6/m7): MOLEMMAT kentät (kun vielä molemmat näkyvissä,
  ennen omaa valintaa) tarjoavat aina kaikki neljä koulua ({A,B,C,D}) -
  eSI/eSE ei rajoita kumpaakaan.

### Huomio m-sarjasta (m8-m10)

Alkuperäisen matriisin mukaan m8/m9/m10:n piti peilata s8/s9/s10:n
"ei tallennu" -tuloksia. Kun integraatiolla on useampi kuin yksi
oppilaitostyyppi, eSI/eSE ei kuitenkaan rajoita tallennusta eikä
tarjottavia kouluja - riittää, että jokin oma valinta on tehty. Siksi
m8/m9/m10 ovat "ok"-tapauksia.
