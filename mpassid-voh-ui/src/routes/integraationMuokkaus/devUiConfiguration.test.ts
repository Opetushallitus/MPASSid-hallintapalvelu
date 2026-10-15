import { afterEach, describe, expect, it } from "vitest";
import type { UiConfiguration } from "../../config";
import { DEV_UI_CONFIGURATION_KEY, withDevUiConfiguration } from "./devUiConfiguration";

const base = [{ name: "hostname" }] as UiConfiguration[];
const extra = [{ name: "e2eVapaa" }] as UiConfiguration[];

afterEach(() => {
  localStorage.removeItem(DEV_UI_CONFIGURATION_KEY);
});

describe("withDevUiConfiguration (kehitystila)", () => {
  it("ilman tallennettua arvoa palauttaa listan sellaisenaan", () => {
    expect(withDevUiConfiguration(base)).toBe(base);
  });

  it("lisää tallennetut kohteet listan perään", () => {
    localStorage.setItem(DEV_UI_CONFIGURATION_KEY, JSON.stringify(extra));
    expect(withDevUiConfiguration(base)).toEqual([...base, ...extra]);
  });

  it.each([
    ["virheellinen JSON", "{ei jsonia"],
    ["ei taulukko", JSON.stringify({ name: "e2eVapaa" })],
  ])("%s: palauttaa listan sellaisenaan", (_name, stored) => {
    localStorage.setItem(DEV_UI_CONFIGURATION_KEY, stored);
    expect(withDevUiConfiguration(base)).toBe(base);
  });
});
