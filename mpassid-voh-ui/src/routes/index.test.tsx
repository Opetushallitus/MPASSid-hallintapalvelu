import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { MessageDescriptor } from "react-intl";
import { MemoryRouter, Outlet, useLocation, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { category, katselijaOphGroup, tallentajaOphGroup } from "@/config";
import fiMessages from "../../lang/fi-FI.json";
import Routes from "./index";

// ---------------------------------------------------------------------------
// Mocks: the data hooks and every page/layout (stubs that show which route
// matched and with which params).
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);

const api = vi.hoisted(() => ({
  // Must return the SAME array on every call: Routes memoizes on it.
  attributeNames: { current: undefined as string[] | undefined },
  useDataUserInterfaceConfigurationRaw: vi.fn(),
}));
vi.mock("@/api", () => ({
  useAttributeNames: () => api.attributeNames.current,
  useDataUserInterfaceConfigurationRaw: () => api.useDataUserInterfaceConfigurationRaw(),
}));

// Must be the SAME object on every render: Routes has an effect keyed on it.
const me = vi.hoisted(() => ({ current: { groups: [] as string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

vi.mock("@/layouts/Basic", () => ({
  default: () => (
    <div data-testid="layout">
      <Outlet />
    </div>
  ),
}));

function ParamsPage({ name }: { name: string }) {
  const params = useParams();
  return <div>{`${name} ${JSON.stringify(params)}`}</div>;
}

vi.mock("./home", () => ({ default: () => <ParamsPage name="Home" /> }));
vi.mock("./integraatio", () => ({ default: () => <ParamsPage name="Integraatio" /> }));
vi.mock("./integraationMuokkaus", () => ({ default: () => <ParamsPage name="IntegraatioMuokkaus" /> }));
vi.mock("@/components/NotFound", () => ({ default: () => <div>NotFound</div> }));
vi.mock("@/utils/mui-theme/Showcase", () => ({ default: () => <div>ThemeShowcase</div> }));
vi.mock("@/utils/components/Localisations", () => ({
  default: (props: Props) => {
    children.localisations = props;
    return <div>Localisations</div>;
  },
}));

const prop = <T,>(child: string, name: string) => children[child][name] as T;

const probe = { pathname: "" };
function LocationProbe() {
  const { pathname } = useLocation();
  useEffect(() => {
    probe.pathname = pathname;
  });
  return null;
}

const renderRoutes = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes />
    </MemoryRouter>
  );

const originalProd = ENV.PROD;

beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  api.attributeNames.current = undefined;
  api.useDataUserInterfaceConfigurationRaw.mockReset();
  me.current = { groups: [] };
  probe.pathname = "";
});

afterEach(() => {
  ENV.PROD = originalProd;
});

describe("reitit", () => {
  it.each([
    ["/", "Home {}"],
    ["/index.html", "Home {}"],
    ["/integraatio/5", 'Integraatio {"integrationId":"5"}'],
    ["/muokkaa/sp/oidc/0", 'IntegraatioMuokkaus {"role":"sp","type":"oidc","id":"0"}'],
    ["/tuntematon", "NotFound"],
    ["/integraatio", "NotFound"],
    ["/muokkaa/sp/oidc", "NotFound"],
  ])("%s -> %s", (path, text) => {
    renderRoutes(path);
    expect(screen.getByText(text)).toBeInTheDocument();
    // Every route renders inside the Basic layout.
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("käyttöliittymäkonfiguraation lataus käynnistetään heti", () => {
    renderRoutes("/");
    expect(api.useDataUserInterfaceConfigurationRaw).toHaveBeenCalled();
  });
});

describe("lokalisointi", () => {
  it.each([
    ["OPH-tallentajalle", tallentajaOphGroup],
    ["OPH-katselijalle", katselijaOphGroup],
  ])("näytetään %s", async (_, group) => {
    me.current = { groups: [group] };
    renderRoutes("/lokalisointi");
    expect(await screen.findByText("Localisations")).toBeInTheDocument();
    expect(prop("localisations", "category")).toBe(category);
  });

  it("muille käyttäjille lokalisointi on NotFound", () => {
    me.current = { groups: ["APP_MPASSID_TALLENTAJA", "APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000002"] };
    renderRoutes("/lokalisointi");
    expect(screen.getByText("NotFound")).toBeInTheDocument();
    expect(screen.queryByText("Localisations")).not.toBeInTheDocument();
  });

  it("/_lokalisointi ohjaa /lokalisointi-sivulle", async () => {
    me.current = { groups: [tallentajaOphGroup] };
    renderRoutes("/_lokalisointi");
    expect(await screen.findByText("Localisations")).toBeInTheDocument();
    expect(probe.pathname).toBe("/lokalisointi");
  });

  it("oletusviestit ovat fi-FI.json:n viestit, kun attribuutteja ei ole", async () => {
    me.current = { groups: [tallentajaOphGroup] };
    renderRoutes("/lokalisointi");
    await screen.findByText("Localisations");
    expect(prop("localisations", "defaultMessages")).toEqual(fiMessages);
  });

  it("puuttuville attribuuteille lisätään tyhjät attribuutti- ja työkaluvihje-avaimet", async () => {
    api.attributeNames.current = ["clientId", "uusiAttribuutti"];
    me.current = { groups: [tallentajaOphGroup] };
    renderRoutes("/lokalisointi");
    await screen.findByText("Localisations");

    const messages = prop<Record<string, MessageDescriptor>>("localisations", "defaultMessages");
    expect(messages["attribuutti.uusiAttribuutti"]).toEqual({ description: "attribuutti", defaultMessage: "" });
    expect(messages["työkaluvihje.uusiAttribuutti"]).toEqual({
      description: "attribuutin työkaluvihje",
      defaultMessage: "",
    });
    // Existing translations are kept as they are.
    expect(messages["attribuutti.clientId"]).toEqual(
      (fiMessages as Record<string, MessageDescriptor>)["attribuutti.clientId"]
    );
    expect(Object.keys(messages).length).toBeGreaterThan(Object.keys(fiMessages).length);
  });
});

describe("teeman esittely", () => {
  it("näytetään kehitysympäristössä (myös alipolut)", () => {
    ENV.PROD = false;
    renderRoutes("/theme-showcase/painikkeet");
    expect(screen.getByText("ThemeShowcase")).toBeInTheDocument();
  });

  it("tuotannossa NotFound", () => {
    ENV.PROD = true;
    renderRoutes("/theme-showcase");
    expect(screen.getByText("NotFound")).toBeInTheDocument();
  });
});
