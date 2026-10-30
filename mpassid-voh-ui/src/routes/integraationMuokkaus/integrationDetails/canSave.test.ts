import type { Components } from "@/api";
import { describe, expect, it } from "vitest";
import { computeDetailsCanSave, type DetailsCanSaveInput } from "./canSave";

const idpOriginal: Components.Schemas.Integration = {
  id: 5,
  configurationEntity: {
    attributes: [],
    idp: { type: "wilma", institutionTypes: [11], logoUrl: "https://example.test/logo.png" },
  },
  discoveryInformation: { showSchools: true, schools: [], excludedSchools: [], title: "T" },
};

const allValid = {
  dataAttribute: true,
  userAttribute: true,
  metadata: true,
  schoolSelection: true,
  roleDetails: true,
};

/** An unchanged idp integration (drafts equal to the original). */
const idp = (overrides: Partial<DetailsCanSaveInput> = {}): DetailsCanSaveInput => ({
  role: "idp",
  original: idpOriginal,
  configurationEntity: structuredClone(idpOriginal.configurationEntity),
  discoveryInformation: structuredClone(idpOriginal.discoveryInformation),
  valid: allValid,
  metadataFileCount: 0,
  metadataUrl: "",
  newLogo: false,
  environmentChanged: false,
  name: "",
  ...overrides,
});

const withIdp = (idp: Partial<Components.Schemas.IdentityProvider>) => ({
  ...idpOriginal.configurationEntity,
  idp: { ...idpOriginal.configurationEntity!.idp!, ...idp } as Components.Schemas.IdentityProvider,
});

const changedDiscoveryInformation = { ...idpOriginal.discoveryInformation, title: "Uusi" };

describe("computeDetailsCanSave", () => {
  it.each<[string, Partial<DetailsCanSaveInput>, { configurationEntity: boolean; discoveryInformation: boolean }]>([
    ["muuttamaton", {}, { configurationEntity: false, discoveryInformation: false }],
    [
      "koulunvalinta muuttunut",
      { discoveryInformation: changedDiscoveryInformation },
      { configurationEntity: true, discoveryInformation: true },
    ],
    [
      "konfiguraatio muuttunut",
      { configurationEntity: withIdp({ institutionTypes: [11, 15] }) },
      { configurationEntity: true, discoveryInformation: true },
    ],
    [
      "vain ympäristö vaihtunut",
      { environmentChanged: true },
      { configurationEntity: true, discoveryInformation: true },
    ],
    ["uusi logo", { newLogo: true }, { configurationEntity: true, discoveryInformation: true }],
    [
      "metadatatiedosto valittu",
      { metadataFileCount: 1 },
      { configurationEntity: true, discoveryInformation: true },
    ],
    [
      "koulunvalinta muuttunut, lapsi virheellinen",
      { discoveryInformation: changedDiscoveryInformation, valid: { ...allValid, roleDetails: false } },
      { configurationEntity: false, discoveryInformation: false },
    ],
    [
      // Koulunvalintapuoli ei vaadi logoa muuttuneelle luonnokselle, mutta
      // konfiguraatiopuoli vaatii - yhteistulos on silti "ei".
      "koulunvalinta muuttunut, ei logoa",
      {
        discoveryInformation: changedDiscoveryInformation,
        configurationEntity: withIdp({ logoUrl: undefined }),
        original: { ...idpOriginal, configurationEntity: withIdp({ logoUrl: undefined }) },
      },
      { configurationEntity: false, discoveryInformation: true },
    ],
    [
      // Koulunvalintapuoli ei tarkista ADFS:n metadataa.
      "ADFS ilman metadataa, koulunvalinta muuttunut",
      {
        configurationEntity: withIdp({ type: "adfs" }),
        original: { ...idpOriginal, configurationEntity: withIdp({ type: "adfs" }) },
        discoveryInformation: changedDiscoveryInformation,
      },
      { configurationEntity: false, discoveryInformation: true },
    ],
    [
      "ADFS, metadataUrl annettu",
      {
        configurationEntity: withIdp({ type: "adfs" }),
        original: { ...idpOriginal, configurationEntity: withIdp({ type: "adfs" }) },
        discoveryInformation: changedDiscoveryInformation,
        metadataUrl: "https://adfs.example.test/metadata.xml",
      },
      { configurationEntity: true, discoveryInformation: true },
    ],
  ])("%s", (_name, overrides, expected) => {
    expect(computeDetailsCanSave(idp(overrides))).toEqual(expected);
  });

  describe("palveluintegraatio (sp)", () => {
    const spOriginal: Components.Schemas.Integration = {
      id: 7,
      configurationEntity: {
        attributes: [],
        sp: { type: "saml", name: "Palvelu" } as Components.Schemas.ServiceProvider,
      },
    };
    const sp = (overrides: Partial<DetailsCanSaveInput> = {}): DetailsCanSaveInput => ({
      ...idp(),
      role: "sp",
      original: spOriginal,
      configurationEntity: structuredClone(spOriginal.configurationEntity),
      discoveryInformation: undefined,
      name: "Palvelu",
      ...overrides,
    });

    it("muuttamaton: ei", () => {
      expect(computeDetailsCanSave(sp())).toEqual({ configurationEntity: false, discoveryInformation: true });
    });

    it("pelkkä nimen muutos: kyllä, logoa ei vaadita", () => {
      expect(computeDetailsCanSave(sp({ name: "Uusi" }))).toEqual({
        configurationEntity: true,
        discoveryInformation: true,
      });
    });
  });
});
