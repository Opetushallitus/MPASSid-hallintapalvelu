# Ehdotetut uudet e2e-testitapaukset

**Päivitys: kaikki 10 kohtaa on nyt toteutettu** - ks. kunkin kohdan lopussa
oleva "Toteutus"-rivi, joka kertoo mihin `e2e/*.spec.ts`-tiedostoon testit
päätyivät ja mitä (jos mitään) jouduttiin rajaamaan pois. Kaksi kohtaa (2 ja
10) osuivat samaan sovellus-/mock-rajoitukseen testien kirjoitusvaiheessa:
katso niiden "Toteutus"-rivi. Kohdat 7 ja 9 vaativat pienen, mock-only
lisäyksen `src/mocks/requestLogicHandlers.ts`:ään (ei tuotantokoodimuutos)
virhepolkujen deterministiseen testaamiseen - ks. niiden "Toteutus"-rivit.

Prioriteettijärjestys (1 = suurin arvo/pienin vaiva):

1. Integraation poisto/deaktivointi
2. "Integraatiovalinnat" -välilehti (palvelusallinta)
3. Validoinnin negatiivipolut
4. "Peruuta" muokkauksessa
5. Testi→Tuotanto-vaihto olemassa olevalle idp-integraatiolle
6. Home-sivun haku/suodatus/lajittelu/sivutus/"Passiiviset"
7. Tallennuksen virhetilanteet
8. Read-only-näkymän sisällön tarkistus
9. Azure-attribuuttitesti ja OIDC:n client_secret-muistutus
10. Muut/matalampi prioriteetti

---

## 1. Integraation poisto/deaktivointi

Tiedosto: `src/routes/integraationMuokkaus/index.tsx` (rivit 266-337).

Toiminta: muokkaussivun "Poista jäsen" (`DeleteIcon`) -painike vaihtaa
`isDisabled`-tilan päälle, jolloin Snackbarin "Tallenna"-nappi muuttuu
"Poista"-napiksi ja vahvistusdialogin teksti muuttuu ("Olet poistamassa
integraation tietoja" / "Haluatko varmasti poistaa?"). Vahvistuksesta
kutsutaan `inactivateIntegration({id})` ja siirrytään etusivulle.

| Testi | Esiehdot | Vaiheet | Odotettu tulos |
|---|---|---|---|
| Poisto onnistuu | Olemassa oleva integraatio (esim. Wilma) tallennettuna | Avaa integraation muokkaus → klikkaa "Poista jäsen" -kuvaketta → "Tallenna"-nappi muuttuu "Poista"-napiksi → klikkaa sitä → dialogi "Olet poistamassa integraation tietoja"/"Haluatko varmasti poistaa?" näkyy → klikkaa "OK" | Ohjautuu etusivulle (`/`); integraatio ei enää näy oletushaulla |
| Poistettu integraatio näkyy "Passiiviset"-suodattimella | Yllä oleva poisto tehty | Etusivulla kytke "Passiiviset" päälle, hae poistetun integraation nimellä | Integraatio löytyy passiivisena |
| Poiston peruutus ei tee mitään | Integraatio auki muokkauksessa | Klikkaa "Poista jäsen" → "Poista"-nappi → dialogin "PERUUTA" | Dialogi sulkeutuu, integraatio pysyy aktiivisena, "Tallenna"-nappi palautuu näkyviin (isDisabled toggloituu takaisin, koska ainoa tapa peruuttaa `isDisabled`-tila UI:ssa on klikata "Poista jäsen" -kuvaketta uudelleen - varmista tämä osana testiä) |

**Toteutus:** `e2e/delete-integration.spec.ts` (2 testiä) + `deleteIntegration()`-apufunktio `helpers.ts`:iin.

---

## 2. "Integraatiovalinnat" -välilehti (palvelusallinta)

Tiedosto: `src/routes/integraatio/IntegrationTab/IntegrationSelection/index.tsx`.
Näkyy vain idp-integraatioiden `/integraatio/:id`-sivulla (välilehti
"Integraatiovalinnat"). Hallinnoi mitkä sp/set-palvelut saavat
kirjautua kyseiseen idp:hen.

Keskeiset elementit: `Switch` "Salli kaikki palvelut" (`activateAllServices`),
"Poista valinnat" -nappi, per-rivi `Switch` (disabloitu kun
`activateAllServices` tai kyseessä sisäänrakennettu testipalvelu
`mpassIdUserAttributeTestService`), "Tallentaaksesi valinnat sinun pitää
sallia vähintään yksi tai useampi palvelu" -varoitus, vahvistusdialogi
"Olet sallimassa kaikki palvelut"/"Haluatko varmasti tallentaa? Tieto
yksittäisistä valinnoista poistuu tallennuksen yhteydessä.".

Huom: `cannotSave()`-funktion nimi on harhaanjohtava - se palauttaa `true`
juuri silloin kun tallennus PITÄISI olla sallittu: jokin muu kuin
testipalvelu on sallittu tai "Salli kaikki palvelut" on päällä (korjattu
2026-10-14; ennen `permissions.length>1`, jolloin tasan yhden palvelun
salliminen ei sallinut tallennusta).

| Testi | Esiehdot | Vaiheet | Odotettu tulos |
|---|---|---|---|
| Oletustila estää tallennuksen | Uusi idp-integraatio tallennettu, avaa "Integraatiovalinnat" | Siirry välilehdelle | Vain sisäänrakennettu testipalvelu sallittu; "Tallentaaksesi valinnat..." -varoitus näkyy; "Tallenna" pois käytöstä |
| Yksittäisen palvelun salliminen | idp-integraatio + vähintään yksi olemassa oleva sp/set-integraatio samassa organisaatiossa | Kytke yksi rivi päälle | Varoitus katoaa, "Tallenna" käytössä, tallennus onnistuu ja rivi näkyy sallittuna jälkeenpäin |
| "Salli kaikki palvelut" | Kuten yllä | Kytke "Salli kaikki palvelut" päälle | Vahvistusdialogi "Olet sallimassa kaikki palvelut" näkyy; OK:n jälkeen kaikki rivit sallittuja ja niiden yksittäiset kytkimet disabloituvat |
| "Poista valinnat" | Integraatiolla on sallittuja palveluja | Klikkaa "Poista valinnat" | Kaikki paitsi sisäänrakennettu testipalvelu palautuu pois käytöstä; tallennus vaatii jälleen vähintään yhden valinnan |
| Testipalveluriviä ei voi kytkeä | Mikä tahansa tila | Yritä kytkeä sisäänrakennetun testipalvelun rivi | Kytkin on aina disabloitu, tila ei muutu |
| Ei näy sp/set-integraatioille | sp- tai set-tyyppinen integraatio | Avaa `/integraatio/:id` | "Integraatiovalinnat"-välilehteä ei näytetä lainkaan (vain "Integraatiotiedot"/"Palvelutiedot") |

**Toteutus:** `e2e/integration-selection.spec.ts` (14 testiä).

- Kandidaattitaulukko listaa vain `set`-roolisia integraatioita
  (`useIntegrationsSpecSearchPageable()` asettaa `rooli=set` ja
  `ympäristö=1` `/integraatio/:id`-sivulla), eikä käyttöliittymä luo niitä.
  Siksi yksittäisten palvelujen testit (`describe` "yksittäiset palvelut",
  9 testiä, lisätty 2026-10-15) syöttävät kolme set-integraatiota
  (testipalvelu 3000001, Palvelu A, Palvelu B) mock-tietokantaan
  (sessionStorage `mpassid-mock-integrations`) `page.addInitScript`illä
  ennen sovelluksen latautumista.
- Katetut tapaukset: kaikki sallittu (rivit sallittuina ja lukittuina),
  testipalvelu aina sallittu ja lukittu, yksittäisen palvelun salliminen
  tallentuu (tarkistetaan avaamalla integraatio uudelleen), sallitun
  palvelun vaihto toiseen, "Salli kaikki palvelut" yksittäisten valintojen
  jälkeen, "Poista valinnat" (tallennus vaatii uuden valinnan),
  tallennuspalkin "Peruuta" palauttaa tallennetut valinnat sekä ilman
  tallennusoikeutta valintoja ei voi muuttaa.
- "Ei oikeuksia": integraation organisaatioksi vaihdetaan sessionStoragessa
  organisaatio, jota mock-käyttäjä voi vain katsella
  (`APP_MPASSID_KATSELIJA_1.2.246.562.10.00000000001`). Mockin
  `getIntegration` säilyttää nyt fixture-organisaatiosta poikkeavan
  organisaation (ennen se korvasi aina organisaation fixturella).
- Vahvistusdialogi "Olet sallimassa kaikki palvelut": korjattu 2026-10-15.
  "Salli kaikki" tallentaa listan `[testipalvelu]`, jonka backend tallentaa
  tyhjänä (= kaikki sallittu; testipalvelun lupaa ei tallenneta), joten
  dialogin entinen ehto `permissions.length == 0` ei koskaan täyttynyt.
  Nyt dialogi avautuu myös, kun "Salli kaikki" tallennetaan tallennettujen
  yksittäisten palvelujen päälle. Testit: OK tallentaa, PERUUTA ei
  tallenna (9 testiä "yksittäiset palvelut" -lohkossa, yhteensä 14).

---

## 3. Validoinnin negatiivipolut

Tiedosto: `src/utils/Validators.tsx` (validointisäännöt), `src/config.ts`
(mikä kenttä käyttää mitäkin sääntöä), `Form/ListForm.tsx` (duplikaatti-
tarkistus, rivin poisto).

| Testi | Kenttä/sääntö | Vaiheet | Odotettu tulos |
|---|---|---|---|
| Pakollinen kenttä tyhjänä | esim. Wilma `hostname` | Jätä pakollinen kenttä tyhjäksi | "Tallenna" pysyy pois käytöstä; virheteksti "{kenttä} on pakollinen kenttä" näkyy |
| https-validointi | OIDC Tuotanto `redirect_uris` (`nolocalhost`+`https`) | Syötä `http://esimerkki.fi` Tuotanto-ympäristössä | Virhe "Kentän pitää olla https muodossa!" (`Validators.tsx`), "Tallenna" pois käytöstä |
| nolocalhost-validointi | Sama kenttä | Syötä `https://localhost/callback` | Virhe "Localhost ei ole sallittu!" |
| Virheellinen sertifikaatti | SAML `signingCertificates` (`cert`-validointi, `@peculiar/x509`) | Syötä satunnainen merkkijono base64-sertifikaatin sijaan | Virheteksti sertifikaatin jäsennysvirheestä, "Tallenna" pois käytöstä |
| Duplikaattiarvo ListForm-kentässä | Mikä tahansa `ListForm`-pohjainen array-kenttä (esim. `redirect_uris`) | Lisää sama arvo kahdesti | "Tämä {type} on jo olemassa" -viesti, arvoa ei lisätä toiseen kertaan |
| Array-kentän rivin poisto | Sama kenttätyyppi, vähintään 2 arvoa lisättynä | Klikkaa yhden rivin `ClearIcon`-poistonappia | Rivi poistuu listasta, jäljelle jäävä validointitila päivittyy oikein (esim. jos kentästä tulee tyhjä ja se on pakollinen, "ei arvoja, pakollinen" -viesti ilmestyy ja "Tallenna" disabloituu) |
| ip-validointi | Kenttä jolla `validation: ["ip"]` (tarkista `config.ts`:stä mikä) | Syötä epäkelpo IP-muoto | Virhe "ip osoitte ei ole validi!" |
| nohash-validointi | Kenttä jolla `validation: ["nohash"]` | Syötä arvo jossa `#`-merkki | Virhe "Kentässä ei saa olla # merkkiä!" |

**Toteutus:** `e2e/validation.spec.ts` (6 testiä: pakollinen tyhjänä, https,
nolocalhost, virheellinen sertifikaatti, duplikaatti, rivin poisto).
`ip`-validaattoria ei käytetä yhdessäkään `config.ts`:n kentässä (grepattu
läpi koko tiedosto) - ei kenttää testattavaksi, joten se jätettiin pois.
`nohash` katetaan implisiittisesti samalla `redirect_uris`-kentällä kuin
https/nolocalhost (sama kenttä, `config.ts:622-638`), ei erillistä testiä.

---

## 4. "Peruuta" muokkauksessa

Tiedosto: `src/routes/integraationMuokkaus/index.tsx:297-298`. "Peruuta"
navigoi pois (`/integraatio/:id` muokkauksessa, `/` luonnissa) tallentamatta.

| Testi | Esiehdot | Vaiheet | Odotettu tulos |
|---|---|---|---|
| Peruuta luonnissa | Aloita uuden integraation luonti | Täytä kenttiä, klikkaa "Peruuta" | Ohjautuu etusivulle; integraatiota ei löydy hausta, ei ole luotu mihinkään |
| Peruuta muokkauksessa | Olemassa oleva integraatio, avaa muokkaus | Muuta esim. `hostname`-kenttää, klikkaa "Peruuta" (EI Tallenna) | Ohjautuu `/integraatio/:id`-sivulle; avaa muokkaus uudelleen ja tarkista että alkuperäinen (muuttamaton) arvo on yhä voimassa |

**Toteutus:** `e2e/cancel-edit.spec.ts` (2 testiä).

---

## 5. Testi→Tuotanto-vaihto olemassa olevalle idp-integraatiolle

Tiedosto: `src/routes/integraationMuokkaus/Role/IdentityProvider.tsx:141-169`
("Palveluympäristö"-valitsin, näkyy sekä luonnissa että muokkauksessa, koska
`environment.current>-1` on aina tosi olemassa olevalle idp:lle), `index.tsx`
(`deploymentPhase.current` tallennuksessa), `config.ts` (ympäristökohtaiset
validointi-/oletusarvo-erot, esim. Tuotannon `nolocalhost`/`https`-vaatimukset
ja SAML:n `wantAssertionsSigned`-oletuksen vaihtelu).

Nykyinen kattavuus koskee vain ympäristön asettamista LUONTIHETKELLÄ
(`school-selection.spec.ts`); yhtään testiä ei avaa olemassa olevaa
Testi-integraatiota ja vaihda sitä Tuotantoon (tai päinvastoin) erillisenä
muokkauksena.

| Testi | Esiehdot | Vaiheet | Odotettu tulos |
|---|---|---|---|
| Testi → Tuotanto | Testi-ympäristöön tallennettu idp-integraatio (esim. Wilma) ilman muita saman oppilaitostyypin Tuotanto-integraatioita | Avaa muokkaus, vaihda "Palveluympäristö" Tuotantoon, tallenna | Tallennus onnistuu; integraation `deploymentPhase` on nyt Tuotanto (tarkista lukemalla integraatio uudelleen); koulunvalintasäännöt (`SchoolSelection.tsx`) aktivoituvat jos sovellettavissa |
| Tuotanto → Testi | Tuotanto-ympäristöön tallennettu idp-integraatio | Avaa muokkaus, vaihda "Palveluympäristö" Testiin, tallenna | Tallennus onnistuu; koulunvalintarajoitukset eivät enää päde (kentät voivat piiloutua/muuttua valinnaisiksi) |
| Ympäristövaihto laukaisee validoinnin uudelleenarvioinnin | Idp-integraatio jolla on jokin Testi-ympäristössä sallittu mutta Tuotannossa kielletty arvo (esim. `localhost`-osoite jossain kentässä, jos sellainen idp-tyypeillä on) | Vaihda Testi → Tuotanto | "Tallenna" disabloituu kunnes kielletty arvo korjataan |

**Toteutus:** `e2e/environment-switch.spec.ts` (2 testiä) - MUUTETTU
PREMISSI, vahvistettu oikealla ajolla. `NewIntegrationSelection.tsx:214-216`
asettaa jokaiselle uudelle idp-integraatiolle `deploymentPhase=1` (Tuotanto)
ehdoitta, riippumatta mistään käyttäjän valinnasta - idp-integraatio on siis
AINA Tuotannossa jo ennen kuin "Palveluympäristö"-valitsinta on edes
kosketettu. Lisäksi `IdentityProvider.tsx:83`:n `environmentValues`-suodatin
näyttää "Testi"-vaihtoehdon vain kun integraatio ON JO Testissä
(`integration.deploymentPhase===0`) - kun idp on kerran Tuotannossa (eli
aina), "Testi" ei enää koskaan ilmesty valikkoon. Sekä "Testi → Tuotanto"
että "Tuotanto → Testi" osoittautuivat siis mahdottomiksi toteuttaa - ainoa
oikeasti saavutettavissa oleva siirtymä on Tuotanto → Tuotanto-Testi, jota
ensimmäinen testi kattaa; toinen testi vahvistaa suoraan, ettei "Testi" enää
näy valikossa. Kolmatta riviä (ympäristökohtainen validointiero) ei
toteutettu sellaisenaan samasta syystä kuin ennenkin - katettu sen sijaan
`create-saml-integration(-tuotanto).spec.ts`:n `wantAssertionsSigned`-
oletusarvovertailulla (kahden ERI integraation välillä, koska sp:llä ei ole
muokattavaa ympäristöä).

---

## 6. Home-sivun haku/suodatus/lajittelu/sivutus/"Passiiviset"

Tiedosto: `src/routes/home/index.tsx`, `SearchForm.tsx`, `IntegrationsTable.tsx`.

| Testi | Vaiheet | Odotettu tulos |
|---|---|---|
| Haku nimellä/OID:lla/y-tunnuksella | Kirjoita hakukenttään olemassa olevan integraation nimi, paina hae-kuvaketta | Taulukko suodattuu vain täsmäävään riviin |
| Haun tyhjennys | Tee haku, klikkaa "tyhjennä" (x) -kuvaketta | Hakukenttä tyhjenee, taulukko palautuu suodattamattomaksi |
| Tyhjä tulos | Hae olemattomalla nimellä | "Valitsemillasi hakuehdoilla ei löytynyt yhtään..." -viesti näkyy |
| "Passiiviset"-kytkin | Vähintään yksi passiivinen (poistettu) integraatio olemassa (ks. kohta 1) | Kytke "Passiiviset" päälle/pois | Passiiviset integraatiot ilmestyvät/katoavat taulukosta |
| Sarakelajittelu | Klikkaa esim. "Tunniste"-sarakeotsikkoa | Taulukon järjestys vaihtuu (nouseva/laskeva) |
| Suodatinvalikot | Avaa "Suodata tyypin/roolin/ympäristön mukaan" -valikko, valitse arvo | Taulukko suodattuu valitun arvon mukaan |
| Sivutus | Riittävästi integraatioita täyttämään useampi sivu | Vaihda sivua / rivimäärää sivulla | Näytetyt rivit ja sivunumero päivittyvät oikein |

**Toteutus:** `e2e/home-search-filter.spec.ts` (4 testiä: haku+tyhjennys+tyhjä
tulos, Tunniste-sarakkeen lajittelu, "Näytä sivulla" -valinta, Ympäristö-
suodatin) + `columnHeaderCell()`-apufunktio `helpers.ts`:iin. Todellista
monisivuista sivutusta (sivu 2) ei toteutettu - mock ei sisällä valmiiksi
tallennettua dataa (`schemas/response.json` on tyhjä taulukko) ja oletus-
sivukoko on 10, joten sen testaaminen vaatisi 11+ integraation luomisen
täyden monivaiheisen UI-flown kautta per testi - liian hidasta suhteessa
hyötyyn (todistaisi vain MUI:n oman `<Pagination>`-komponentin toimivan).
Huom myös: haku täsmää mockissa vain organisaation nimeen/OID:iin/y-tunnukseen
(`configurationEntity.name`, jota mikään ei koskaan aseta), ei integraation
omaan nimeen/hostnameen - testi on kirjoitettu tämän todellisen (ei oletetun)
käytöksen mukaan.

---

## 7. Tallennuksen virhetilanteet

Tiedosto: `src/routes/integraationMuokkaus/index.tsx:192,367-406`. Vaatii
API-vastauksen mockaamista (esim. Playwrightin `page.route()` tai MSW-käsittelijän
tilapäisen ohituksen) palauttamaan virhe tallennuspyyntöön.

| Testi | Vaiheet | Odotettu tulos |
|---|---|---|
| 409-konflikti | Mockaa tallennuspyyntö palauttamaan 409 ja palvelimen virheviesti | Virhedialogi näyttää palvelimen antaman viestin (tai lokalisoidun vastineen jos avain löytyy `intl.messages`:sta) |
| Yleinen virhe | Mockaa tallennuspyyntö palauttamaan esim. 500 | Virhedialogi näyttää yleisen "Ongelma näytettäessä tietoja... ole yhteydessä ylläpitoon" -viestin ja tukilinkin (`ENV.SUPPORT_URI`) |

**Toteutus:** `e2e/save-error.spec.ts` (2 testiä). MSW on tässä sovelluksessa
oikea Service Worker (`msw@1.3.1`, `setupWorker`) - synteettinen SW-vastaus ei
koskaan kosketa oikeaa verkkokerrosta, joten Playwrightin `page.route()`:lla
ei ole mitään siepattavaa `/api/v2/integration`-kutsuille (toisin kuin
`e2e/helpers.ts`:n koodisto-service-esimerkissä, joka siepataan koska MSW ei
edes käsittele sitä osoitetta). Ratkaisuna `src/mocks/requestLogicHandlers.
ts`:n `createIntegration`/`updateIntegration` tunnistavat nyt kaksi
"taika"-arvoa "Palvelun nimi"/OKJ:n näyttönimi -kentässä
(`E2E_TRIGGER_409`/`E2E_TRIGGER_GENERIC_ERROR`) ja palauttavat virheen
kirjaston jo tukeman `{status,mock}`-paluuarvon kautta - sama mekanismi kuin
olemassa oleva `id===999995`-erikoistapaus `getIntegration()`:ssa. Tämä on
mock-only lisäys (testi-infrastruktuuria), ei tuotantokoodimuutos.

---

## 8. Read-only-näkymän (`/integraatio/:id`) sisällön tarkistus

Tiedosto: `src/routes/integraatio/IntegrationTab/IntegrationDetails/index.tsx`,
`IntegrationTab/index.tsx:102-118` (404-haara).

| Testi | Vaiheet | Odotettu tulos |
|---|---|---|
| Luodun integraation tiedot näkyvät oikein | Luo integraatio tunnetuilla arvoilla (nimi, hostname, koulut jne), avaa `/integraatio/:id` | Kaikki syötetyt arvot näkyvät read-only-näkymässä täsmälleen syötettyinä (ei vain käytetä sivua läpikulkuna editointiin, kuten nykyiset testit tekevät) |
| Olematon integraatio | Navigoi `/integraatio/999999` (olematon id) | "Integraatiota 999999 ei löydy" -virheviesti näkyy, linkki etusivulle toimii |

**Toteutus:** `e2e/integration-detail-view.spec.ts` (2 testiä).

---

## 9. Azure-attribuuttitesti ja OIDC:n client_secret-muistutus

Tiedosto: `src/routes/integraationMuokkaus/AttributeTest.tsx`,
`index.tsx:344-359` (client_secret-muistutus).

| Testi | Esiehdot | Vaiheet | Odotettu tulos |
|---|---|---|---|
| Attribuuttitesti onnistuu | Azure-integraatio, kaikki pakolliset kentät täytetty (`canSave===true`) | Klikkaa "Testaa attribuuttien oikeellisuus", täytä testikäyttäjän tiedot, klikkaa "TESTAA" | Attribuuttitaulukko (Attribute name/value) näkyy, "OK"-nappi sulkee dialogin |
| Attribuuttitesti epäonnistuu | Sama, mutta virheelliset testiarvot (mockattu epäonnistuvaksi) | Klikkaa "TESTAA" | "Tilin authentikointi epäonnistui!" -virhe näkyy |
| Attribuuttitestin pakolliset kentät | Dialogi auki, kentät tyhjinä | Yritä klikata "TESTAA" | "Pakollinen kenttä" -virheet estävät testauksen |
| OIDC client_secret näkyy vain kerran | Uusi OIDC-integraatio tallennettu ensimmäistä kertaa | Tarkista tallennuksen onnistumisdialogi | "Muista tallentaa client_secret: ..." näkyy (arvo ei ole `***`-maskattu) |
| client_secret ei toistu myöhemmin | Sama integraatio, tallenna uudelleen jokin muu muutos | Tarkista onnistumisdialogi | client_secret-muistutusta EI enää näytetä (arvo on jo `***`-maskattu palvelimelta) |

**Toteutus:** `e2e/azure-attribute-test.spec.ts` (3 testiä: nappi vaatii
täytetyt kentät, testi onnistuu, testi epäonnistuu) + 2 lisätty testiä
`create-oidc-integration.spec.ts`:iin (client_secret näkyy kerran / ei
toistu). `testAttributesAuthorization`:n mock-handler palautti aina 200
riippumatta syötteestä - samasta syystä kuin kohdassa 7, sille lisättiin
vastaava taika-arvo-liipaisin (`E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE`)
`requestLogicHandlers.ts`:ään.

---

## 10. Muut / matalampi prioriteetti

| Aihe | Tiedosto | Kuvaus |
|---|---|---|
| Olemassa olevan palvelun valinta luonnissa | `NewIntegrationSelection.tsx` | Uutta sp-integraatiota luodessa valitaan "uusi"-vaihtoehdon sijaan jokin olemassa oleva palvelu/ympäristö-setti (`PossibleServices.tsx`) - integraatio liittyy olemassa olevaan `set`:iin uuden luomisen sijaan |
| Disabloitu "Luo"-nappi | `NewIntegrationSelection.tsx:359-360` | sp-integraatio valittuna mutta ei valittua palvelua → "Luo"-nappi pysyy disabloituna |
| ServiceProvider "Palvelun nimi" lukittu | `Role/ServiceProvider.tsx:32` | Kun integraatio liittyy olemassa olevaan `set`:iin (`integrationSets[0].id!==0`), nimikenttä on read-only eikä muokattavissa |
| metadataUrl vs. tiedostolataus toisensa poissulkevat | `Role/IdentityProvider.tsx:62-71` (adfs/gsuite) | Metadata-URL:n täyttäminen tyhjentää ladatun tiedoston ja päinvastoin - vain toinen voi olla kerrallaan asetettuna |
| `/lokalisointi`-reitti | `src/routes/index.tsx:39-54` | Yleiskäyttöinen lokalisointieditori, gatetoitu `tallentajaOphGroup`/`katselijaOphGroup`-ryhmiin - matala prioriteetti koska ei sovelluskohtaista logiikkaa |

**Toteutus:** `e2e/misc-ui.spec.ts` (2 testiä: disabloitu "Luo"-nappi,
metadataUrl/tiedostolataus-poissulkevuus ADFS:llä). "Olemassa olevan
palvelun valinta" ja "ServiceProvider Palvelun nimi lukittu" JÄTETTIIN POIS -
molemmat vaatisivat `configurationEntity.set`-integraation olemassaolon
(sama juurisyy kuin kohdan 2 rajoitus: mikään ei koskaan luo sellaista tässä
sovelluksessa/mockissa). `/lokalisointi`-reittiä ei toteutettu (matala
prioriteetti, geneerinen komponentti).
