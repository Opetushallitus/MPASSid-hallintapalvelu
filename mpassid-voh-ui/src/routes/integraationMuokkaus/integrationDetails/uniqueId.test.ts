import type { Components } from "@/api";
import { describe, expect, it } from "vitest";
import { withUniqueId } from "./uniqueId";

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
