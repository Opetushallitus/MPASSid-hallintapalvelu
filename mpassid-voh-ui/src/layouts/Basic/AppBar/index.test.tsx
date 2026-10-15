import {
  katselijaOphGroup,
  openIntegrationsSessionStorageKey,
  tallentajaOphGroup,
} from "@/config";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppBar from ".";

// useMe must return the same object between renders (effect dependency).
const me = vi.hoisted(() => ({ current: {} as { oid?: string; groups?: string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

const USER_OID = "1.2.246.562.24.00000000001";
const ORG_GROUP = "APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000002";

const storeTabs = (tabs: string[]) =>
  sessionStorage.setItem(openIntegrationsSessionStorageKey, JSON.stringify(tabs));
const storedTabs = () => sessionStorage.getItem(openIntegrationsSessionStorageKey);

/**
 * Opens tabs after mount like the integration page does (usehooks-ts writes
 * the storage and notifies the other hook instances with this event).
 */
const openTabs = (tabs: string[]) =>
  act(() => {
    storeTabs(tabs);
    window.dispatchEvent(
      new StorageEvent("session-storage", { key: openIntegrationsSessionStorageKey })
    );
  });

/** Renders the current path so the tests can read it. */
function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

const ui = (path: string) => (
  <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/integraatio/:integrationId" element={<AppBar />} />
        <Route path="*" element={<AppBar />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  </IntlProvider>
);

const renderAppBar = (path = "/") => render(ui(path));

beforeEach(() => {
  sessionStorage.clear();
  me.current = { oid: USER_OID, groups: [ORG_GROUP] };
});

afterEach(() => {
  sessionStorage.clear();
});

const mainNav = () =>
  screen.getByRole("tablist", { name: "päänavigaatio, mpassid-hallintapalvelu" });
const openNav = () =>
  screen.getByRole("tablist", {
    name: "avointen integraatiosivujen navigaatio, mpassid-hallintapalvelu",
  });
const tabNames = (tablist: HTMLElement) =>
  within(tablist)
    .queryAllByRole("tab")
    .map((tab) => tab.textContent);

describe("päänavigaatio", () => {
  it("tavallinen käyttäjä: vain Integraatiot", () => {
    renderAppBar();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(tabNames(mainNav())).toEqual(["Integraatiot"]);
    expect(within(mainNav()).getByRole("tab", { name: "Integraatiot" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it.each([
    ["tallentaja", tallentajaOphGroup],
    ["katselija", katselijaOphGroup],
  ])("OPH:n %s: myös Lokalisointi", (_name, group) => {
    me.current = { oid: USER_OID, groups: [ORG_GROUP, group] };
    renderAppBar();
    expect(tabNames(mainNav())).toEqual(["Integraatiot", "Lokalisointi"]);
    expect(within(mainNav()).getByRole("tab", { name: "Lokalisointi" })).toHaveAttribute(
      "href",
      "/lokalisointi"
    );
  });

  it("ilman ryhmiä: vain Integraatiot", () => {
    me.current = { oid: USER_OID };
    renderAppBar();
    expect(tabNames(mainNav())).toEqual(["Integraatiot"]);
  });

  it("Lokalisointi-sivulla Lokalisointi on valittuna", () => {
    me.current = { oid: USER_OID, groups: [tallentajaOphGroup] };
    renderAppBar("/lokalisointi");
    expect(within(mainNav()).getByRole("tab", { name: "Lokalisointi" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

describe("avoimet integraatiot", () => {
  it("ei avoimia: tyhjä navigaatio", () => {
    renderAppBar();
    expect(tabNames(openNav())).toEqual([]);
  });

  it("sessionStoragen integraatiot näytetään välilehtinä", () => {
    renderAppBar();
    openTabs(["5", "8"]);
    expect(tabNames(openNav())).toEqual(["5", "8"]);
    expect(within(openNav()).getByRole("tab", { name: "8" })).toHaveAttribute(
      "href",
      "/integraatio/8"
    );
  });

  it("avoimen integraation sivulla sen välilehti on valittuna", () => {
    renderAppBar("/integraatio/8");
    openTabs(["5", "8"]);
    expect(within(openNav()).getByRole("tab", { name: "8" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(openNav()).getByRole("tab", { name: "5" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("välilehden sulkeminen poistaa sen ja siirtyy seuraavaan", async () => {
    const user = userEvent.setup();
    renderAppBar("/integraatio/8");
    openTabs(["5", "8", "9"]);

    const tab = within(openNav()).getByRole("tab", { name: "8" });
    await user.hover(tab);
    await user.click(within(tab).getByTestId("CloseIcon"));

    expect(tabNames(openNav())).toEqual(["5", "9"]);
    expect(JSON.parse(storedTabs()!)).toEqual(["5", "9"]);
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/integraatio\/9$/);
  });
});

describe("käyttäjän vaihtuminen ja sessionStorage", () => {
  it("toisen käyttäjän välilehdet: mount tyhjentää avoimet välilehdet sessionStoragesta ja näkymästä", () => {
    // The tabs were opened by another user (e.g. a new login in the same
    // browser tab): the item is removed during render and the storage hook
    // then re-reads the (now empty) storage after mount.
    storeTabs(["5", "8"]);
    sessionStorage.setItem(`${openIntegrationsSessionStorageKey}-oid`, "1.2.246.562.24.00000000002");
    renderAppBar();
    expect(storedTabs()).toBeNull();
    expect(tabNames(openNav())).toEqual([]);
  });

  it("ilman oid:ta sessionStorage säilyy ja välilehdet näytetään", () => {
    me.current = { groups: [ORG_GROUP] };
    storeTabs(["5", "8"]);
    renderAppBar();
    expect(JSON.parse(storedTabs()!)).toEqual(["5", "8"]);
    expect(tabNames(openNav())).toEqual(["5", "8"]);
  });

  it("käyttäjän vaihtuessa sessionStorage tyhjennetään, mutta vanhat välilehdet jäävät näkyviin", () => {
    const { rerender } = renderAppBar();
    openTabs(["5", "8"]);

    me.current = { oid: "1.2.246.562.24.00000000002", groups: [ORG_GROUP] };
    rerender(ui("/"));

    expect(storedTabs()).toBeNull();
    // removeItem does not notify the storage hook.
    expect(tabNames(openNav())).toEqual(["5", "8"]);
  });

  it("saman käyttäjän uudelleenrenderöinti ei tyhjennä sessionStoragea", () => {
    const { rerender } = renderAppBar();
    storeTabs(["5"]);
    rerender(ui("/"));
    expect(JSON.parse(storedTabs()!)).toEqual(["5"]);
  });

  it("saman käyttäjän uudelleenlataus säilyttää avoimet välilehdet sessionStoragessa", () => {
    // Korjattu: välilehtien omistajan oid tallennetaan sessionStorageen, joten
    // välilehdet tyhjennetään vain käyttäjän vaihtuessa, ei jokaisella mountilla.
    storeTabs(["5", "8"]);
    renderAppBar();
    expect(JSON.parse(storedTabs()!)).toEqual(["5", "8"]);
    expect(tabNames(openNav())).toEqual(["5", "8"]);
  });

  it("saman käyttäjän uudelleenlataus säilyttää välilehdet, kun omistaja on tallennettu", () => {
    storeTabs(["5", "8"]);
    sessionStorage.setItem(`${openIntegrationsSessionStorageKey}-oid`, USER_OID);
    renderAppBar();
    expect(JSON.parse(storedTabs()!)).toEqual(["5", "8"]);
    expect(tabNames(openNav())).toEqual(["5", "8"]);
  });
});
