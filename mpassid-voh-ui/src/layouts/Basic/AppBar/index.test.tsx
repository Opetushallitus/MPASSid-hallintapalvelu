import {
  katselijaOphGroup,
  openIntegrationsSessionStorageKey,
  tallentajaOphGroup,
} from "@/config";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Integraatio from "@/routes/integraatio";
import AppBar from ".";

// useMe must return the same object between renders (effect dependency).
const me = vi.hoisted(() => ({ current: {} as { oid?: string; groups?: string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));
// The integration page without its content (only its tab handling is used).
vi.mock("@/routes/integraatio/IntegrationTab", () => ({ default: () => null }));
vi.mock("@/utils/components/HelpLinkButton", () => ({ default: () => null }));

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

describe("avoimet integraatiot integraatiosivun kanssa", () => {
  // As in the app: AppBar in the layout route, the integration page in its
  // child route. The page opens its own tab, so closing that tab must not
  // let the page (still shown until the navigation is done) add it back.
  const appUi = (path: string) => (
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            element={
              <>
                <AppBar />
                <Outlet />
              </>
            }
          >
            <Route index element={<div />} />
            <Route path="integraatio/:integrationId" element={<Integraatio />} />
          </Route>
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </IntlProvider>
  );

  const closeTab = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    const tab = within(openNav()).getByRole("tab", { name });
    await user.hover(tab);
    await user.click(within(tab).getByTestId("CloseIcon"));
  };

  beforeEach(() => {
    sessionStorage.setItem(`${openIntegrationsSessionStorageKey}-oid`, USER_OID);
  });

  it("integraatiosivu avaa välilehtensä ensimmäiseksi", () => {
    storeTabs(["5", "9"]);
    render(appUi("/integraatio/8"));
    expect(tabNames(openNav())).toEqual(["8", "5", "9"]);
    expect(JSON.parse(storedTabs()!)).toEqual(["8", "5", "9"]);
  });

  it("avoimen integraation välilehden sulkeminen siirtyy seuraavaan, eikä suljettu palaa", async () => {
    const user = userEvent.setup();
    storeTabs(["5", "8", "9"]);
    render(appUi("/integraatio/8"));

    await closeTab(user, "8");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/integraatio\/9$/);
    expect(tabNames(openNav())).toEqual(["5", "9"]);
    expect(JSON.parse(storedTabs()!)).toEqual(["5", "9"]);
  });

  it("viimeisen välilehden sulkeminen siirtyy edelliseen", async () => {
    const user = userEvent.setup();
    storeTabs(["5", "8", "9"]);
    render(appUi("/integraatio/9"));

    await closeTab(user, "9");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/integraatio\/8$/);
    expect(tabNames(openNav())).toEqual(["5", "8"]);
  });

  it("ainoan välilehden sulkeminen vie etusivulle, eikä välilehti palaa", async () => {
    const user = userEvent.setup();
    storeTabs(["8"]);
    render(appUi("/integraatio/8"));

    await closeTab(user, "8");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    expect(tabNames(openNav())).toEqual([]);
    expect(JSON.parse(storedTabs()!)).toEqual([]);
  });

  it("toisen välilehden sulkeminen pysyy sivulla", async () => {
    const user = userEvent.setup();
    storeTabs(["5", "8", "9"]);
    render(appUi("/integraatio/8"));

    await closeTab(user, "5");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/integraatio\/8$/);
    expect(tabNames(openNav())).toEqual(["8", "9"]);
  });

  it("etusivulla välilehden sulkeminen ei navigoi", async () => {
    const user = userEvent.setup();
    storeTabs(["5", "8"]);
    render(appUi("/"));

    await closeTab(user, "8");

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    expect(tabNames(openNav())).toEqual(["5"]);
  });
});
