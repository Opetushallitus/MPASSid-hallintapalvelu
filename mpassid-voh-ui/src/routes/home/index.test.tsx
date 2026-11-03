import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type MutableRefObject } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes, useLocation, type Location } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { katselijaOphGroup, openIntegrationsSessionStorageKey, tallentajaOphGroup } from "@/config";
import Home from "./index";

// ---------------------------------------------------------------------------
// Mocks: the total count hook, the user's groups and the heavy children
// (stubs recording their props).
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);

const useIntegrationsSpecSearchPageable = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  useIntegrationsSpecSearchPageable: () => useIntegrationsSpecSearchPageable(),
}));

// Must be the SAME object on every render: Home has an effect keyed on it.
const me = vi.hoisted(() => ({ current: { groups: [] as string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

vi.mock("./IntegrationsTable", () => ({
  default: (props: Props) => {
    children.table = props;
    return <div data-testid="integrations-table" />;
  },
}));
vi.mock("./SearchForm", () => ({
  default: (props: Props) => {
    children.search = props;
    return <div data-testid="search-form" />;
  },
}));
vi.mock("./NewIntegrationSelection", () => ({
  default: (props: Props) => {
    children.newIntegration = props;
    return null;
  },
}));

const prop = <T,>(child: string, name: string) => children[child][name] as T;

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const locationRef: MutableRefObject<Location | undefined> = { current: undefined };

function LocationProbe() {
  const location = useLocation();
  useEffect(() => {
    locationRef.current = location;
  });
  return null;
}

const renderHome = ({ path = "/", state }: { path?: string; state?: unknown } = {}) => {
  const user = userEvent.setup();
  render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[{ pathname: path.split("?")[0], search: path.split("?")[1] ?? "", state }]}>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>
  );
  return user;
};

const searchParams = () => new URLSearchParams(locationRef.current?.search);

const storedTabs = () => JSON.parse(sessionStorage.getItem(openIntegrationsSessionStorageKey) ?? "null");

beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  useIntegrationsSpecSearchPageable.mockReset();
  useIntegrationsSpecSearchPageable.mockReturnValue({ totalElements: 42 });
  me.current = { groups: [] };
  locationRef.current = undefined;
  sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sivun sisältö", () => {
  it("näyttää kuvauksen, otsikon, integraatioiden kokonaismäärän ja taulukon", () => {
    renderHome();
    expect(screen.getByText("(palvelun lyhyt kuvaus)")).toBeInTheDocument();
    expect(screen.getByText("Integraatiot")).toBeInTheDocument();
    expect(screen.getByText(/\(\s*42\s*\)/)).toBeInTheDocument();
    expect(screen.getByTestId("integrations-table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ohjeet" })).toBeInTheDocument();
  });

  it("kokonaismäärän latautuessa taulukko näytetään silti", () => {
    useIntegrationsSpecSearchPageable.mockImplementation(() => {
      throw new Promise(() => {});
    });
    renderHome();
    expect(screen.getByText("Integraatiot")).toBeInTheDocument();
    expect(screen.getByTestId("integrations-table")).toBeInTheDocument();
  });
});

describe("haku", () => {
  it("SearchForm saa nykyiset hakuparametrit", () => {
    renderHome({ path: "/?hae=abc" });
    expect(prop<URLSearchParams>("search", "formData").get("hae")).toBe("abc");
  });

  it("haku kopioi lomakkeen arvot URL:iin, poistaa tyhjät ja palaa ensimmäiselle sivulle", () => {
    renderHome({ path: "/?sivu=3&tyyppi=saml&määrä=25" });
    const formData = new FormData();
    formData.set("hae", "koulu");
    formData.set("tyyppi", "");

    act(() => prop<(formData: FormData) => void>("search", "onSearch")(formData));

    expect(searchParams().get("hae")).toBe("koulu");
    expect(searchParams().has("tyyppi")).toBe(false);
    expect(searchParams().has("sivu")).toBe(false);
    expect(searchParams().get("määrä")).toBe("25");
  });
});

describe("Passiiviset-kytkin", () => {
  it("ei näytetä tavalliselle käyttäjälle", () => {
    me.current = { groups: ["APP_MPASSID_TALLENTAJA", "APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000002"] };
    renderHome();
    expect(screen.queryByRole("switch", { name: "Passiiviset" })).not.toBeInTheDocument();
  });

  it.each([
    ["OPH-tallentajalle", tallentajaOphGroup],
    ["OPH-katselijalle", katselijaOphGroup],
  ])("näytetään %s", (_, group) => {
    me.current = { groups: [group] };
    renderHome();
    expect(screen.getByRole("switch", { name: "Passiiviset" })).not.toBeChecked();
  });

  it("päälle: ?passiiviset=1 ja sivu nollataan; pois: parametri poistetaan", async () => {
    me.current = { groups: [tallentajaOphGroup] };
    const user = renderHome({ path: "/?sivu=2" });
    const toggle = screen.getByRole("switch", { name: "Passiiviset" });

    await user.click(toggle);
    expect(searchParams().get("passiiviset")).toBe("1");
    expect(searchParams().has("sivu")).toBe(false);
    expect(toggle).toBeChecked();

    await user.click(toggle);
    expect(searchParams().has("passiiviset")).toBe(false);
    expect(toggle).not.toBeChecked();
  });

  it("URL:n passiiviset=1 näkyy valittuna", () => {
    me.current = { groups: [katselijaOphGroup] };
    renderHome({ path: "/?passiiviset=1" });
    expect(screen.getByRole("switch", { name: "Passiiviset" })).toBeChecked();
  });
});

describe("uuden integraation lisäys", () => {
  it("lisää-painiketta ja dialogia ei näytetä ilman tallentajaryhmää", () => {
    // Only the plain (organisation-less) group names count here.
    me.current = { groups: ["APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000002", katselijaOphGroup] };
    renderHome();
    expect(screen.queryByRole("button", { name: "lisää" })).not.toBeInTheDocument();
    expect(children.newIntegration).toBeUndefined();
  });

  it.each(["APP_MPASSID_TALLENTAJA", "APP_MPASSID_PALVELU_TALLENTAJA"])(
    "ryhmällä %s lisää-painike avaa NewIntegrationSelectionin",
    async (group) => {
      me.current = { groups: [group] };
      const user = renderHome();
      expect(prop("newIntegration", "open")).toBe(false);

      await user.click(screen.getByRole("button", { name: "lisää" }));
      expect(prop("newIntegration", "open")).toBe(true);

      act(() => prop<(open: boolean) => void>("newIntegration", "setOpen")(false));
      expect(prop("newIntegration", "open")).toBe(false);
    }
  );
});

describe("avoimet integraatiovälilehdet (location.state)", () => {
  const setTabs = (tabs: string[]) =>
    sessionStorage.setItem(openIntegrationsSessionStorageKey, JSON.stringify(tabs));

  it("ilman tilaa välilehtiin ei kosketa", () => {
    setTabs(["5", "7"]);
    renderHome();
    expect(storedTabs()).toEqual(["5", "7"]);
  });

  it("tila, jota ei ole välilehdissä, ei muuta niitä", () => {
    setTabs(["5", "7"]);
    renderHome({ state: "9" });
    expect(storedTabs()).toEqual(["5", "7"]);
  });

  it("poistetun integraation ainoa välilehti suljetaan", async () => {
    setTabs(["5"]);
    renderHome({ state: "5" });
    await waitFor(() => expect(storedTabs()).toEqual([]));
  });

  // Korjattu: välilehdistä suodatetaan pois vain poistetun integraation id,
  // joten muut välilehdet säilyvät.
  it("poistetun integraation välilehti suljetaan, muut säilyvät", async () => {
    setTabs(["7", "5"]);
    renderHome({ state: "5" });
    await waitFor(() => expect(storedTabs()).toEqual(["7"]));
  });
});
