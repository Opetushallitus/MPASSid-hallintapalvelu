import type { Components } from "@/api";
import { mpassIdUserAttributeTestService } from "@/config";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationTab from ".";

// ---------------------------------------------------------------------------
// The two tab contents are replaced by stubs that record their latest props:
// these tests pin down IntegrationTab's own logic (which integration object
// is shown, tabs per role, activateAllServices default, 404 / loading).
// IntegrationDetails and IntegrationSelection have tests of their own.
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);

// [error, integration] like the real hook (which also suspends while loading).
const useIntegrationSafe = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  useIntegrationSafe: (...args: unknown[]) => useIntegrationSafe(...args),
}));

vi.mock("./IntegrationDetails", () => ({
  default: (props: Props) => {
    children.details = props;
    return <div data-testid="details" />;
  },
}));
vi.mock("./IntegrationSelection", () => ({
  default: (props: Props) => {
    children.selection = props;
    return <div data-testid="selection" />;
  },
}));

beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  useIntegrationSafe.mockReset();
  useIntegrationSafe.mockReturnValue([undefined, undefined]);
});

const prop = <T,>(child: string, name: string) => children[child][name] as T;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG = { oid: "1.2.246.562.99.00000000001", name: "Mansikkalan testi kunta" };

const permission = (id: number): Components.Schemas.IntegrationPermission => ({
  to: { id },
  lastUpdatedOn: "2024-01-02T00:00:00Z",
});

const idp = (
  id = 5,
  permissions?: Components.Schemas.IntegrationPermission[]
): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: { idp: { type: "wilma", flowName: "x", idpId: "x" } },
  permissions,
});

const sp = (id = 6): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    sp: { type: "saml", name: "Palvelu" } as Components.Schemas.ServiceProvider,
  },
});

const set = (id = 7): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: { set: { type: "set", name: "Palvelukokonaisuus" } },
});

const renderTab = (
  id: number,
  { state, path = `/integraatio/${id}` }: { state?: unknown; path?: string } = {}
) => {
  const ui = (tabId: number) => (
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <Routes>
          <Route path="/integraatio/:integrationId" element={<IntegrationTab id={tabId} />} />
          <Route path="/" element={<div data-testid="home" />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>
  );
  const utils = render(ui(id));
  return { ...utils, rerenderWithId: (newId: number) => utils.rerender(ui(newId)) };
};

const tabNames = () => screen.queryAllByRole("tab").map((tab) => tab.textContent);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lataus ja virheet", () => {
  it("hakee integraation id:llä", () => {
    useIntegrationSafe.mockReturnValue([undefined, idp(5)]);
    renderTab(5);
    expect(useIntegrationSafe).toHaveBeenCalledWith({ id: 5 });
  });

  it("näyttää latausindikaattorin, kunnes integraatio on saatu", () => {
    renderTab(5);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(children.details).toBeUndefined();
  });

  it("404: näyttää virheilmoituksen ja linkin etusivulle", async () => {
    const user = userEvent.setup();
    useIntegrationSafe.mockReturnValue([{ response: { status: 404 } }, undefined]);
    renderTab(999999);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Integraatiota 999999 ei löydySiirry etusivulle."
    );
    expect(screen.getByText("Integraatiota 999999 ei löydy")).toHaveClass("MuiAlertTitle-root");
    const link = screen.getByRole("link", { name: "etusivulle" });
    expect(link).toHaveAttribute("href", "/");

    await user.click(link);
    expect(screen.getByTestId("home")).toBeInTheDocument();
  });

  it("404 voittaa myös router-staten integraation", () => {
    useIntegrationSafe.mockReturnValue([{ response: { status: 404 } }, undefined]);
    renderTab(5, { state: idp(5) });
    expect(screen.getByText("Integraatiota 5 ei löydy")).toBeInTheDocument();
    expect(children.details).toBeUndefined();
  });

  it("muu kuin 404-virhe ilman router-statea: latausindikaattori jää pyörimään", () => {
    // Current behaviour: only 404 has an error view.
    useIntegrationSafe.mockReturnValue([{ response: { status: 500 } }, undefined]);
    renderTab(5);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("välilehdet roolin mukaan", () => {
  it("idp: Integraatiotiedot ja Integraatiovalinnat, oletuksena tiedot", () => {
    const integration = idp(5);
    useIntegrationSafe.mockReturnValue([undefined, integration]);
    renderTab(5);

    expect(tabNames()).toEqual(["Integraatiotiedot", "Integraatiovalinnat"]);
    expect(screen.getByRole("tab", { name: "Integraatiotiedot" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Integraatiotiedot" })).toHaveAttribute(
      "id",
      "simple-tab-0"
    );
    expect(screen.getByRole("tab", { name: "Integraatiovalinnat" })).toHaveAttribute(
      "aria-controls",
      "simple-tabpanel-1"
    );
    expect(screen.getByTestId("details")).toBeInTheDocument();
    expect(screen.queryByTestId("selection")).not.toBeInTheDocument();
    expect(prop("details", "integration")).toBe(integration);

    // Both panels exist, only the active one has content.
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(2);
    expect(panels[0]).not.toHaveAttribute("hidden");
    expect(panels[0]).toHaveAttribute("aria-labelledby", "simple-tab-0");
    expect(panels[1]).toHaveAttribute("hidden");
    expect(panels[1]).toBeEmptyDOMElement();
  });

  it("idp: Integraatiovalinnat-välilehti näyttää valinnat ja välittää tilan", async () => {
    const user = userEvent.setup();
    const integration = idp(5, [permission(10), permission(11)]);
    useIntegrationSafe.mockReturnValue([undefined, integration]);
    renderTab(5);

    await user.click(screen.getByRole("tab", { name: "Integraatiovalinnat" }));

    expect(screen.getByTestId("selection")).toBeInTheDocument();
    expect(screen.queryByTestId("details")).not.toBeInTheDocument();
    expect(prop("selection", "integration")).toBe(integration);
    expect(prop("selection", "newIntegration")).toBeUndefined();
    expect(prop("selection", "activateAllServices")).toBe(false);
    ["setNewIntegration", "setIntegration", "setActivateAllServices"].forEach((setter) =>
      expect(typeof prop("selection", setter)).toBe("function")
    );

    await user.click(screen.getByRole("tab", { name: "Integraatiotiedot" }));
    expect(screen.getByTestId("details")).toBeInTheDocument();
  });

  it("sp: vain Integraatiotiedot-välilehti", () => {
    useIntegrationSafe.mockReturnValue([undefined, sp(6)]);
    renderTab(6);
    expect(tabNames()).toEqual(["Integraatiotiedot"]);
    expect(screen.getByTestId("details")).toBeInTheDocument();
  });

  it("set: vain Palvelutiedot-välilehti, joka näyttää tiedot", () => {
    useIntegrationSafe.mockReturnValue([undefined, set(7)]);
    renderTab(7);
    expect(tabNames()).toEqual(["Palvelutiedot"]);
    expect(screen.getByRole("tab", { name: "Palvelutiedot" })).toHaveAttribute(
      "id",
      "simple-tab-0"
    );
    expect(screen.getByTestId("details")).toBeInTheDocument();
  });

  it("valintavälilehdeltä sp-integraatioon siirryttäessä palataan tietovälilehdelle", async () => {
    const user = userEvent.setup();
    useIntegrationSafe.mockReturnValue([undefined, idp(5)]);
    const { rerenderWithId } = renderTab(5);
    await user.click(screen.getByRole("tab", { name: "Integraatiovalinnat" }));
    expect(screen.getByTestId("selection")).toBeInTheDocument();

    // Same component instance, new id (the route has no key).
    useIntegrationSafe.mockReturnValue([undefined, sp(6)]);
    rerenderWithId(6);

    expect(tabNames()).toEqual(["Integraatiotiedot"]);
    expect(screen.getByTestId("details")).toBeInTheDocument();
    expect(screen.queryByTestId("selection")).not.toBeInTheDocument();
    expect(prop<Components.Schemas.Integration>("details", "integration").id).toBe(6);
  });

  it("idp:stä toiseen idp:hen siirryttäessä valittu välilehti säilyy", async () => {
    const user = userEvent.setup();
    useIntegrationSafe.mockReturnValue([undefined, idp(5)]);
    const { rerenderWithId } = renderTab(5);
    await user.click(screen.getByRole("tab", { name: "Integraatiovalinnat" }));

    useIntegrationSafe.mockReturnValue([undefined, idp(8)]);
    rerenderWithId(8);

    expect(screen.getByTestId("selection")).toBeInTheDocument();
    expect(prop<Components.Schemas.Integration>("selection", "integration").id).toBe(8);
  });
});

describe("router-state", () => {
  it("saman id:n state näytetään haetun integraation sijaan", () => {
    const fetched = { ...idp(5), deploymentPhase: 0 };
    const fromState = { ...idp(5), deploymentPhase: 1 };
    useIntegrationSafe.mockReturnValue([undefined, fetched]);
    renderTab(5, { state: fromState });

    expect(prop<Components.Schemas.Integration>("details", "integration")).toEqual(fromState);
    // The fetch still happens.
    expect(useIntegrationSafe).toHaveBeenCalledWith({ id: 5 });
  });

  it("state näytetään jo ennen kuin haku on valmis", () => {
    // Role (and so the tabs) come from the fetched integration only.
    const fromState = idp(5);
    renderTab(5, { state: fromState });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(prop("details", "integration")).toEqual(fromState);
  });

  it("eri id:n state ohitetaan ja näytetään haettu integraatio", () => {
    const fetched = idp(5);
    useIntegrationSafe.mockReturnValue([undefined, fetched]);
    renderTab(5, { state: idp(99) });
    expect(prop("details", "integration")).toBe(fetched);
  });

  it("muu kuin integraatio statena ohitetaan", () => {
    const fetched = sp(6);
    useIntegrationSafe.mockReturnValue([undefined, fetched]);
    renderTab(6, { state: { from: "/" } });
    expect(prop("details", "integration")).toBe(fetched);
  });

  // After mount the integration is picked again only on the triggers the
  // former effects had: a new state or id (the state's integration), a new
  // loaded integration or state (the loaded one, unless the state has its id).
  it("tallennettu integraatio säilyy, kun haettu päivittyy ja statella on sama id", async () => {
    useIntegrationSafe.mockReturnValue([undefined, idp(5)]);
    const { rerenderWithId } = renderTab(5, { state: idp(5) });
    await userEvent.setup().click(screen.getByRole("tab", { name: "Integraatiovalinnat" }));
    const saved = idp(5, [permission(10)]);
    act(() => prop<(i: unknown) => void>("selection", "setIntegration")(saved));

    useIntegrationSafe.mockReturnValue([undefined, idp(5)]);
    rerenderWithId(5);
    expect(prop("selection", "integration")).toBe(saved);
  });

  it("ilman statea päivittynyt haettu integraatio korvaa tallennetun", async () => {
    useIntegrationSafe.mockReturnValue([undefined, idp(5)]);
    const { rerenderWithId } = renderTab(5);
    await userEvent.setup().click(screen.getByRole("tab", { name: "Integraatiovalinnat" }));
    act(() => prop<(i: unknown) => void>("selection", "setIntegration")(idp(5, [permission(10)])));

    const refetched = idp(5, [permission(11)]);
    useIntegrationSafe.mockReturnValue([undefined, refetched]);
    rerenderWithId(5);
    expect(prop("selection", "integration")).toBe(refetched);
  });

  it("id:n vaihtuessa näytetään uuden id:n state haetun sijaan", () => {
    const fetched = { 5: idp(5), 6: { ...idp(6), deploymentPhase: 0 } } as Record<number, Components.Schemas.Integration>;
    useIntegrationSafe.mockImplementation(({ id }: { id: number }) => [undefined, fetched[id]]);
    const fromState = idp(6);
    const { rerenderWithId } = renderTab(5, { state: fromState, path: "/integraatio/5" });
    expect(prop("details", "integration")).toBe(fetched[5]);

    rerenderWithId(6);
    expect(prop("details", "integration")).toBe(fromState);
  });
});

describe("activateAllServices-oletus", () => {
  const openSelection = async (permissions?: Components.Schemas.IntegrationPermission[]) => {
    const user = userEvent.setup();
    useIntegrationSafe.mockReturnValue([undefined, idp(5, permissions)]);
    renderTab(5);
    await user.click(screen.getByRole("tab", { name: "Integraatiovalinnat" }));
    return prop<boolean>("selection", "activateAllServices");
  };

  it("ei permissions-kenttää: kaikki sallittu", async () => {
    expect(await openSelection(undefined)).toBe(true);
  });

  it("tyhjä permissions-lista: kaikki sallittu", async () => {
    expect(await openSelection([])).toBe(true);
  });

  it("vain testipalvelu: kaikki sallittu", async () => {
    expect(await openSelection([permission(mpassIdUserAttributeTestService)])).toBe(true);
  });

  it("yksi muu palvelu: ei kaikkia", async () => {
    expect(await openSelection([permission(10)])).toBe(false);
  });

  it("testipalvelu ja muu palvelu: ei kaikkia", async () => {
    expect(
      await openSelection([permission(mpassIdUserAttributeTestService), permission(10)])
    ).toBe(false);
  });

  it("setIntegration päivittää näytettävän integraation ja laskee oletuksen uudelleen", async () => {
    await openSelection([]);
    expect(prop("selection", "activateAllServices")).toBe(true);

    const saved = idp(5, [permission(10), permission(11)]);
    act(() => prop<(i: unknown) => void>("selection", "setIntegration")(saved));

    expect(prop("selection", "integration")).toBe(saved);
    expect(prop("selection", "activateAllServices")).toBe(false);
  });

  it("setActivateAllServices ja setNewIntegration ovat tilan setterit", async () => {
    await openSelection([]);
    const draft = idp(5, [permission(10)]);
    act(() => {
      prop<(v: unknown) => void>("selection", "setNewIntegration")(draft);
      prop<(v: unknown) => void>("selection", "setActivateAllServices")(false);
    });
    expect(prop("selection", "newIntegration")).toBe(draft);
    expect(prop("selection", "activateAllServices")).toBe(false);
  });
});
