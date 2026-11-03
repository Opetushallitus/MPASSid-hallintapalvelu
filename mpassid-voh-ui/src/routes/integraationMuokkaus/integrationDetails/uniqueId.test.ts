import type { Components } from "@/api";
import { describe, expect, it } from "vitest";
import { withProviderFieldAttributes, withUniqueId } from "./uniqueId";

type Entity = Components.Schemas.ConfigurationEntity;
const field = (entity: Entity, provider: "idp" | "sp", name: string) =>
  (entity[provider] as Record<string, unknown>)[name];

const wilma = (hostnameField?: string, hostnameAttribute?: string): Entity => ({
  attributes:
    hostnameAttribute === undefined ? [] : [{ type: "data", name: "hostname", content: hostnameAttribute }],
  idp: { type: "wilma", ...(hostnameField === undefined ? {} : { hostname: hostnameField }) } as Components.Schemas.IdentityProvider,
});

describe("withUniqueId", () => {
  it.each<[string, string | undefined, string | undefined, string]>([
    ["attribuutti voittaa kentän", "vanha.fi", "uusi.fi", "uusi.fi"],
    ["tyhjä attribuutti: kenttä säilyy", "vanha.fi", "", "vanha.fi"],
    ["ei attribuuttia: kenttä säilyy", "vanha.fi", undefined, "vanha.fi"],
    ["ei kumpaakaan: tyhjä merkkijono", undefined, undefined, ""],
  ])("idp: %s", (_name, fieldValue, attributeValue, expected) => {
    expect(field(withUniqueId(wilma(fieldValue, attributeValue), "hostname"), "idp", "hostname")).toBe(expected);
  });

  it("ei muutosta: palauttaa saman olion", () => {
    const entity = wilma("sama.fi", "sama.fi");
    expect(withUniqueId(entity, "hostname")).toBe(entity);
  });

  it("ilman uniqueId-attribuuttia (esim. adfs): palauttaa saman olion", () => {
    const entity = wilma("vanha.fi", "uusi.fi");
    expect(withUniqueId(entity, undefined)).toBe(entity);
    expect(withUniqueId(entity, "")).toBe(entity);
  });

  it("ei mutatoi syötettä", () => {
    const entity = Object.freeze(wilma("vanha.fi", "uusi.fi"));
    Object.freeze(entity.idp);
    const result = withUniqueId(entity, "hostname");
    expect(field(result, "idp", "hostname")).toBe("uusi.fi");
    expect(field(entity, "idp", "hostname")).toBe("vanha.fi");
  });

  it("sp: entityId-attribuutti kopioidaan sp.entityId:hen", () => {
    const entity: Entity = {
      attributes: [{ type: "data", name: "entityId", content: "https://uusi.example.test" }],
      sp: { type: "saml", entityId: "https://vanha.example.test" } as Components.Schemas.ServiceProvider,
    };
    expect(field(withUniqueId(entity, "entityId"), "sp", "entityId")).toBe("https://uusi.example.test");
  });
});

describe("withProviderFieldAttributes", () => {
  const configurations = [
    { name: "entityId", type: "data", integrationType: [{ name: "saml" }, { name: "azure" }] },
    { name: "allowtestlearnerid", type: "data", integrationType: [{ name: "saml" }] },
    { name: "entityId", type: "metadata", integrationType: [{ name: "saml" }] },
  ];
  const saml = (attributes: Components.Schemas.Attribute[]): Components.Schemas.ConfigurationEntity => ({
    attributes,
    sp: { type: "saml", entityId: "urn:mace:esimerkki.fi:sp" } as Components.Schemas.ServiceProvider,
  });

  it("lisää puuttuvan attribuutin samannimisestä sp-kentästä, kuten lomake avattaessa", () => {
    const result = withProviderFieldAttributes(
      saml([{ type: "data", name: "allowtestlearnerid", content: "false" }]),
      configurations,
      "saml"
    );
    expect(result?.attributes).toEqual([
      { type: "data", name: "allowtestlearnerid", content: "false" },
      { type: "data", name: "entityId", content: "urn:mace:esimerkki.fi:sp" },
    ]);
  });

  it("olemassa olevaa attribuuttia ei muuteta, ja sama olio palautetaan", () => {
    const entity = saml([{ type: "data", name: "entityId", content: "vanha" }]);
    expect(withProviderFieldAttributes(entity, configurations, "saml")).toBe(entity);
  });

  it("tyhjää kenttää, toisen tyypin määrityksiä eikä metadataa käytetä", () => {
    const entity: Components.Schemas.ConfigurationEntity = {
      attributes: [],
      sp: { type: "saml", entityId: "" } as Components.Schemas.ServiceProvider,
    };
    expect(withProviderFieldAttributes(entity, configurations, "saml")).toBe(entity);
    expect(withProviderFieldAttributes(saml([]), configurations, "oidc")?.attributes).toEqual([]);
  });
});
