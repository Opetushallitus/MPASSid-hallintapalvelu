import * as x509 from "@peculiar/x509";
import { render } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import type { JSX } from "react";
import { IntlProvider } from "react-intl";
import { beforeAll, describe, expect, it } from "vitest";
import realIntegrations from "../../schemas/response_1706792827801.json";
import { helperText, trimCertificate, validate } from "./Validators";

// validate(validators, value) and helperText(validators, value) with the
// rules config.ts uses (uri, https, nolocalhost, nohash, hostname, binddn,
// number, date, cert, notempty, expert) and the rest.

const text = (element: JSX.Element) =>
  render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      {element}
    </IntlProvider>
  ).container.textContent;

const helper = (validators: string[], value: string) => text(helperText(validators, value));

// ---------------------------------------------------------------------------
// Certificates: generated per run, since "valid for less than 6 months"
// depends on the current date.
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const certs: Record<"valid" | "expiringSoon" | "expired" | "notYetValid", string> = {
  valid: "",
  expiringSoon: "",
  expired: "",
  notYetValid: "",
};

beforeAll(async () => {
  x509.cryptoProvider.set(webcrypto as unknown as Crypto);
  const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
  const keys = await webcrypto.subtle.generateKey(algorithm, false, ["sign", "verify"]);
  const make = async (notBefore: number, notAfter: number, serial: string) =>
    (
      await x509.X509CertificateGenerator.createSelfSigned({
        serialNumber: serial,
        name: "CN=Testipalvelu",
        notBefore: new Date(Date.now() + notBefore),
        notAfter: new Date(Date.now() + notAfter),
        signingAlgorithm: algorithm,
        keys: keys as CryptoKeyPair,
      })
    ).toString("pem");
  certs.valid = await make(-DAY, 365 * DAY, "01");
  certs.expiringSoon = await make(-DAY, 30 * DAY, "02");
  certs.expired = await make(-365 * DAY, -DAY, "03");
  certs.notYetValid = await make(30 * DAY, 365 * DAY, "04");
});

// ---------------------------------------------------------------------------
// validate: general
// ---------------------------------------------------------------------------

describe("validate: yleiset säännöt", () => {
  it("tyhjä sääntölista hyväksyy minkä tahansa arvon", () => {
    expect(validate([], "")).toBe(true);
    expect(validate([], "mitä tahansa # localhost")).toBe(true);
  });

  it("tuntematon sääntö hylkää arvon", () => {
    expect(validate(["tuntematon"], "https://a.fi")).toBe(false);
  });

  it("useampi sääntö: kaikkien pitää hyväksyä", () => {
    const rules = ["uri", "https", "nolocalhost", "nohash"];
    expect(validate(rules, "https://palvelu.example.fi/callback")).toBe(true);
    expect(validate(rules, "http://palvelu.example.fi/callback")).toBe(false);
    expect(validate(rules, "https://localhost/callback")).toBe(false);
    expect(validate(rules, "https://palvelu.example.fi/#osa")).toBe(false);
    expect(validate(rules, "ei-uri")).toBe(false);
  });

  it("expert ei rajoita arvoa", () => {
    expect(validate(["expert"], "")).toBe(true);
    expect(validate(["expert"], "mitä tahansa")).toBe(true);
  });

  it("notempty: tyhjä ja undefined hylätään, välilyönti kelpaa", () => {
    expect(validate(["notempty"], "")).toBe(false);
    expect(validate(["notempty"], undefined as unknown as string)).toBe(false);
    expect(validate(["notempty"], " ")).toBe(true);
    expect(validate(["notempty"], "a")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate: one rule at a time
// ---------------------------------------------------------------------------

describe.each([
  {
    rule: "uri",
    valid: [
      "https://palvelu.example.fi",
      "http://localhost:3000/callback",
      "https://palvelu.example.fi/polku?q=1&r=2#osa",
      "https://192.168.0.1:8443/",
      "HTTPS://PALVELU.EXAMPLE.FI",
    ],
    invalid: [
      "palvelu.example.fi",
      "ftp://palvelu.example.fi",
      "https://palvelu",
      "https://palvelu.example.fi/väli lyönti",
      "https://palvelu.example.fi?x=ä",
      "",
    ],
  },
  {
    rule: "https",
    valid: ["https://palvelu.example.fi", "https://"],
    invalid: ["http://palvelu.example.fi", "HTTPS://palvelu.example.fi", " https://a.fi", ""],
  },
  {
    rule: "nohash",
    valid: ["https://palvelu.example.fi/callback", "a"],
    invalid: ["https://palvelu.example.fi/#osa", "#", ""],
  },
  {
    rule: "nolocalhost",
    valid: ["https://palvelu.example.fi", "", "https://127.0.0.2"],
    // Nykykäytös: osamerkkijono riittää (myös mylocalhost.fi), ja 127.0.0.1:n
    // pisteet ovat escapaamatta, joten myös 127x0y0z1 hylätään.
    invalid: [
      "http://localhost:3000",
      "https://127.0.0.1/callback",
      "https://mylocalhost.fi",
      "https://127x0y0z1.fi",
    ],
  },
  {
    rule: "hostname",
    // Port allowed: existing integrations have e.g. wilmalukio.lappajarvi.fi:8445.
    valid: ["wilma.example.fi", "localhost", "a", "wilma-1.example.fi", "wilmalukio.lappajarvi.fi:8445"],
    invalid: [
      "https://wilma.example.fi",
      "wilma.example.fi/",
      "-wilma.fi",
      "wilma-.fi",
      "a..b",
      "",
      // Korjattu: piste oli escapaamatta, joten osien välissä kelpasi mikä tahansa merkki.
      "wilma example.fi",
      "wilma_x.fi",
      "wilma/example.fi",
      "wilma.fi:",
      "wilma.fi:123456",
    ],
  },
  {
    rule: "binddn",
    valid: [
      "uid=matti,ou=people,dc=example,dc=fi",
      "cn=admin,dc=example,dc=fi",
      "CN=admin,OU=palvelut,dc=example,dc=fi",
      "dc=fi",
      // Korjattu: isoilla kirjaimilla kirjoitettu DC= hylättiin.
      "CN=admin,DC=example,DC=fi",
      "UID=matti,OU=people,DC=example,DC=fi",
    ],
    // Korjattu: "DC" ja "UID,dc=fi" kelpasivat (väärä ryhmittely).
    invalid: ["matti", "uid=matti", "", "cn=admin", "DC", "UID,dc=fi", "uid=,dc=fi", "dc=a,dc=b,"],
  },
  {
    rule: "ip",
    valid: ["192.168.0.1", "0.0.0.0", "255.255.255.255"],
    // Korjattu: piste oli escapaamatta (1a2b3c4 kelpasi).
    invalid: ["256.1.1.1", "1.2.3", "01.2.3.4", "1.2.3.4.5", "", "1a2b3c4"],
  },
  {
    rule: "number",
    // Nykykäytös: tyhjä kelpaa numeroksi (^[0-9]*$).
    valid: ["0", "1", "42", ""],
    invalid: ["-1", "1.5", "1a", " 1"],
  },
  {
    rule: "date",
    // Vain muoto tarkistetaan: 31-02 kelpaa.
    valid: ["01-01-2025", "31-12-2099", "31-02-2025"],
    invalid: ["1-1-2025", "2025-01-01", "01-13-2025", "32-01-2025", "01-01-1999", "01.01.2025", ""],
  },
])("validate: $rule", ({ rule, valid, invalid }) => {
  it.each(valid)("hyväksyy %j", (value) => {
    expect(validate([rule], value)).toBe(true);
  });
  it.each(invalid)("hylkää %j", (value) => {
    expect(validate([rule], value)).toBe(false);
  });
});

// Real integrations (an API response export, 621 integrations): every Wilma
// hostname stored there must still be accepted.
it("validate: hostname hyväksyy kaikki oikean aineiston Wilma-hostnamet", () => {
  const integrations = realIntegrations as {
    configurationEntity?: { idp?: { type?: string; hostname?: string } | null } | null;
  }[];
  const hostnames = integrations
    .map((integration) => integration.configurationEntity?.idp)
    .filter((idp) => idp?.type === "wilma" && idp.hostname)
    .map((idp) => idp!.hostname!);
  expect(hostnames.length).toBeGreaterThan(100);
  expect(hostnames.filter((hostname) => !validate(["hostname"], hostname))).toEqual([]);
});

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

describe("varmenne (cert)", () => {
  it("trimCertificate poistaa PEM-otsakkeet, rivinvaihdot ja välilyönnit", () => {
    const pem = "-----BEGIN CERTIFICATE-----\r\nAB CD\nEF\n-----END CERTIFICATE-----\n";
    expect(trimCertificate(pem)).toBe("ABCDEF");
  });

  it("validate hyväksyy jäsennettävän varmenteen voimassaolosta riippumatta", () => {
    expect(validate(["cert"], certs.valid)).toBe(true);
    expect(validate(["cert"], certs.expiringSoon)).toBe(true);
    expect(validate(["cert"], certs.expired)).toBe(true);
    expect(validate(["cert"], certs.notYetValid)).toBe(true);
  });

  it("validate hyväksyy varmenteen myös ilman PEM-otsakkeita", () => {
    expect(validate(["cert"], trimCertificate(certs.valid))).toBe(true);
  });

  it("validate hylkää tyhjän ja jäsentymättömän arvon", () => {
    expect(validate(["cert"], "")).toBe(false);
    expect(validate(["cert"], "ei varmenne")).toBe(false);
    expect(validate(["cert"], undefined as unknown as string)).toBe(false);
  });

  it("helperText: voimassa yli 6 kk -> ei tekstiä", () => {
    expect(helper(["cert"], certs.valid)).toBe("");
  });

  it("helperText: voimassa alle 6 kk -> varoitus päättymispäivällä", () => {
    expect(helper(["cert"], certs.expiringSoon)).toMatch(/^Certificate on validi alle 6kk: /);
  });

  it("helperText: vanhentunut -> 'ei ole enään validi'", () => {
    expect(helper(["cert"], certs.expired)).toMatch(/^Certificate ei ole enään validi: /);
  });

  it("helperText: ei vielä voimassa -> 'ei ole vielä validi'", () => {
    expect(helper(["cert"], certs.notYetValid)).toMatch(/^Certificate ei ole vielä validi: /);
  });

  it("helperText: jäsentymätön -> 'Ei validi certificate!', tyhjä -> ei tekstiä", () => {
    expect(helper(["cert"], "ei varmenne")).toBe("Ei validi certificate!");
    expect(helper(["cert"], "")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// helperText
// ---------------------------------------------------------------------------

describe("helperText", () => {
  it.each([
    ["notempty", "", "kentän arvon pitää olla vähintään yhden merkin!"],
    ["hostname", "-wilma.fi", "hostname ei ole validi!"],
    ["uri", "ei-uri", "uri ei ole validi!"],
    ["binddn", "matti", "bind dn ei ole validi!"],
    ["ip", "1.2.3", "ip osoitte ei ole validi!"],
    ["nohash", "a#b", "Kentässä ei saa olla # merkkiä!"],
    ["https", "http://a.fi", "Kentän pitää olla https muodossa!"],
    ["nolocalhost", "http://localhost", "Localhost ei ole sallittu!"],
    ["date", "2025-01-01", "Kentän pitää olla pp-kk-vvvv muodossa!"],
    ["tuntematon", "x", "Tuntematon validointi ehto!"],
  ])("%s: virheellinen %j -> %j", (rule, value, expected) => {
    expect(helper([rule], value)).toBe(expected);
  });

  it.each([
    ["notempty", "a"],
    ["hostname", "wilma.example.fi"],
    ["uri", "https://a.fi"],
    ["binddn", "cn=admin,dc=example,dc=fi"],
    ["ip", "192.168.0.1"],
    ["nohash", "a"],
    ["https", "https://a.fi"],
    ["nolocalhost", "https://a.fi"],
    ["date", "01-01-2025"],
  ])("%s: kelvollinen %j -> ei tekstiä", (rule, value) => {
    expect(helper([rule], value)).toBe("");
  });

  it("ohjetekstit näytetään arvosta riippumatta", () => {
    expect(helper(["expert"], "")).toBe("VAROITUS älä koske tähän jollei erikseen ohjeistettu!");
    expect(helper(["extraExcludes"], "")).toBe(
      "Kaikki muihin integraatiohin lisätyt koulut lisätään automaattisesti"
    );
    expect(helper(["allSchoolsUsed"], "")).toBe(
      "Kaikki koulut ovat jo käytössä muissa integraatioissa"
    );
  });

  it("useampi sääntö: ensimmäisen hylkäävän säännön teksti", () => {
    const rules = ["uri", "https", "nolocalhost", "nohash"];
    expect(helper(rules, "ei-uri")).toBe("uri ei ole validi!");
    expect(helper(rules, "http://a.fi")).toBe("Kentän pitää olla https muodossa!");
    expect(helper(rules, "https://localhost")).toBe("Localhost ei ole sallittu!");
    expect(helper(rules, "https://a.fi/#x")).toBe("Kentässä ei saa olla # merkkiä!");
    expect(helper(rules, "https://a.fi/x")).toBe("");
  });

  it("number: virheellinen arvo näyttää numerovaatimuksen", () => {
    expect(helper(["number"], "abc")).toBe("Kentän arvon pitää olla numero!");
  });

  // Korjattu: helperText tarkisti number-säännön IP-osoitteen lausekkeella,
  // joten kelvollinen numero (esim. SAML:n index "1") sai virhetekstin.
  it("number: kelvollinen numero -> ei tekstiä", () => {
    expect(validate(["number"], "1")).toBe(true);
    expect(helper(["number"], "1")).toBe("");
  });
});
