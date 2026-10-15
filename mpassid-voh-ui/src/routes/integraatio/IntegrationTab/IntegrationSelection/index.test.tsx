import type { Components } from "@/api";
import { mpassIdUserAttributeTestService } from "@/config";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTheme, ThemeProvider } from "@mui/material";
import { cloneDeep } from "lodash";
import { useEffect, useState } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationSelection from ".";

// ---------------------------------------------------------------------------
// Mocks: the candidate list (set integrations), the save call and the user.
// SearchForm, RowsPerPage, TableHeaderCell and the pagination are real.
// ---------------------------------------------------------------------------

const TEST_SERVICE = mpassIdUserAttributeTestService;

const search = vi.hoisted(() => ({
  current: {} as { content?: unknown[]; totalPages?: number; totalElements?: number },
}));
const updateIntegration = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  useIntegrationsSpecSearchPageable: () => search.current,
  updateIntegration: (...args: unknown[]) => updateIntegration(...args),
}));

// useMe must return the same object between renders (effect dependency).
const me = vi.hoisted(() => ({ current: {} as { groups?: string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_OID = "1.2.246.562.99.00000000001";
const WRITER = `APP_MPASSID_TALLENTAJA_${ORG_OID}`;
const DATE = "2024-01-02T12:00:00Z";

const candidate = (id: number, name?: string, organization = "Palveluorganisaatio") =>
  ({
    id,
    configurationEntity: { set: name ? { name } : {} },
    organization: { name: organization },
  }) as Components.Schemas.Integration;

const CANDIDATES = [
  candidate(TEST_SERVICE, "Testipalvelu", "OPH"),
  candidate(10, "Palvelu A", "Org A"),
  candidate(11, "Palvelu B", "Org B"),
  candidate(12, undefined, "Org C"),
];

const permission = (id: number, lastUpdatedOn: string | undefined = DATE) => ({
  to: { id },
  lastUpdatedOn,
});

const idp = (
  permissions?: Components.Schemas.IntegrationPermission[],
  deploymentPhase = 1
): Components.Schemas.Integration => ({
  id: 5,
  deploymentPhase,
  organization: { oid: ORG_OID, name: "Mansikkalan testi kunta" } as Components.Schemas.Integration["organization"],
  configurationEntity: { idp: { type: "wilma", flowName: "x", idpId: "x" } },
  permissions,
});

// ---------------------------------------------------------------------------
// Harness: owns the state IntegrationTab/index.tsx owns (stable setters) and
// recomputes activateAllServices on integration change like it does.
// ---------------------------------------------------------------------------

const allServicesDefault = (integration?: Components.Schemas.Integration) =>
  integration?.permissions === undefined ||
  integration.permissions.length === 0 ||
  (integration.permissions.length === 1 &&
    integration.permissions[0].to?.id === TEST_SERVICE);

interface Latest {
  integration?: Components.Schemas.Integration;
  newIntegration?: Components.Schemas.Integration;
  activateAllServices: boolean;
  setNewIntegration: (value: Components.Schemas.Integration) => void;
  setActivateAllServices: (value: boolean) => void;
  search: string;
}

// Instant Snackbar/Dialog transitions: closed ones leave the DOM right away.
const theme = createTheme({
  components: {
    MuiSnackbar: { defaultProps: { transitionDuration: 0 } },
    MuiDialog: { defaultProps: { transitionDuration: 0 } },
  },
});

const renderSelection = (
  integration: Components.Schemas.Integration,
  { initialEntry = "/integraatio/5" }: { initialEntry?: string } = {}
) => {
  const latest: Latest = {
    activateAllServices: false,
    setNewIntegration: () => {},
    setActivateAllServices: () => {},
    search: "",
  };

  function Harness() {
    const [current, setIntegration] = useState<Components.Schemas.Integration | undefined>(
      () => cloneDeep(integration)
    );
    const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration>();
    const [activateAllServices, setActivateAllServices] = useState(false);
    useEffect(() => {
      setActivateAllServices(allServicesDefault(current));
    }, [current]);
    latest.integration = current;
    latest.newIntegration = newIntegration;
    latest.activateAllServices = activateAllServices;
    latest.setNewIntegration = setNewIntegration;
    latest.setActivateAllServices = setActivateAllServices;
    return (
      <IntegrationSelection
        integration={current!}
        newIntegration={newIntegration}
        setNewIntegration={setNewIntegration}
        setIntegration={setIntegration}
        activateAllServices={activateAllServices}
        setActivateAllServices={setActivateAllServices}
      />
    );
  }

  function LocationProbe() {
    latest.search = useLocation().search;
    return null;
  }

  const utils = render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Harness />
          <LocationProbe />
        </MemoryRouter>
      </ThemeProvider>
    </IntlProvider>
  );
  return { ...utils, latest };
};

beforeEach(() => {
  search.current = { content: CANDIDATES, totalPages: 3, totalElements: 40 };
  me.current = { groups: [WRITER] };
  updateIntegration.mockReset();
  updateIntegration.mockImplementation(
    async (_params: unknown, body: Components.Schemas.Integration) => cloneDeep(body)
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The div-based MUI table gives rows a role but not cells.
const cellsOf = (row: HTMLElement) => Array.from(row.children).map((cell) => cell.textContent);

const row = (id: number) =>
  screen.getAllByRole("row").find((r) => cellsOf(r)[0] === String(id))!;

const rowSwitch = (id: number) => within(row(id)).getByRole("switch");
const rowCells = (id: number) => cellsOf(row(id));

const allSwitch = () => screen.getByRole("switch", { name: "Salli kaikki palvelut" });
const saveButton = () => screen.getByRole("button", { name: "Tallenna" });
/** The "Tallenna muutokset" snackbar is (eventually) shown / gone. */
const snackbar = (visible: boolean) =>
  waitFor(() =>
    expect(screen.queryByText("Tallenna muutokset") !== null).toBe(visible)
  );
const permissionIds = (integration?: Components.Schemas.Integration) =>
  integration?.permissions?.map((p) => p.to?.id);

const ALL_WARNING =
  "Yksittäisten palvelujen tilaa ei voi muuttaa, kun kaikki palvelut ovat sallittuja";
const NO_RIGHTS = "Ei oikeuksia muuttaa sallittuja palveluja";
const SELECT_ONE = "Tallentaaksesi valinnat sinun pitää sallia vähintään yksi tai useampi palvelu";

/** Waits until the user's groups (set in an effect) grant write access. */
const writable = async () => {
  await waitFor(() => expect(screen.queryByText(NO_RIGHTS)).not.toBeInTheDocument());
  // The snackbar flashes open on the first render (newIntegration is still
  // undefined then) and closes once the draft is initialized.
  await snackbar(false);
};

const heading = () => screen.getByText("Palvelun tarjoajat").closest("h2")!.textContent;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("näkymä", () => {
  it("otsikko, ohje, palvelukuvauslinkki ja sarakeotsikot", async () => {
    renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    expect(heading()).toBe("Palvelun tarjoajat ( 2/40 )");
    expect(
      screen.getByText(
        "Sivulla MPASSid-pääkäyttäjä voi hallinnoida palveluita, joissa on sallittu kirjautuminen MPASSid-tunnistuksenvälityspalveluun."
      )
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Palvelu kuvaukset" });
    expect(link).toHaveAttribute(
      "href",
      "https://www.oph.fi/fi/palvelumme/tietopalvelut/mpassid/yhteensopivat-palvelut"
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(cellsOf(screen.getAllByRole("row")[0])).toEqual([
      "Tunniste",
      "Sallittu palvelu",
      "Palvelu",
      "Organisaatio",
      "Aktivoitu",
    ]);
    expect(screen.getByPlaceholderText("Etsi nimellä, OID:lla tai y-tunnuksella")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Näytä sivulla/ })).toHaveTextContent("10");
  });

  it("valittujen määrä: permissions-listan pituus (testipalvelu mukaan lukien)", async () => {
    renderSelection(idp([permission(TEST_SERVICE), permission(10), permission(11)]));
    await writable();
    expect(heading()).toContain("( 3/40 )");
  });

  it("valittujen määrä: kaikki sallittu -> kokonaismäärä", async () => {
    renderSelection(idp([]));
    await writable();
    expect(heading()).toContain("( 40/40 )");
  });

  it("rivit: tunniste, kytkin, palvelun nimi, organisaatio ja aktivointipäivä", async () => {
    renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    expect(rowCells(10)).toEqual(["10", "", "Palvelu A", "Org A", "2.1.2024"]);
    expect(rowCells(11)).toEqual(["11", "", "Palvelu B", "Org B", "-"]);
    // No set name.
    expect(rowCells(12)).toEqual(["12", "", "Ei määritelty!", "Org C", "-"]);

    expect(rowSwitch(10)).toBeChecked();
    expect(rowSwitch(10)).toBeEnabled();
    expect(rowSwitch(11)).not.toBeChecked();
    expect(rowSwitch(11)).toBeEnabled();
  });

  it("testipalvelun kytkin on aina päällä ja lukittu", async () => {
    renderSelection(idp([permission(10), permission(11)]));
    await writable();
    expect(rowSwitch(TEST_SERVICE)).toBeChecked();
    expect(rowSwitch(TEST_SERVICE)).toBeDisabled();
    // Not in permissions, so no date.
    expect(rowCells(TEST_SERVICE)[4]).toBe("-");
  });

  it("kaikki sallittu: kytkimet päällä ja lukittu, varoitus näkyy", async () => {
    renderSelection(idp([]));
    await writable();

    expect(allSwitch()).toBeChecked();
    expect(screen.getByText(ALL_WARNING)).toBeInTheDocument();
    [10, 11, 12].forEach((id) => {
      expect(rowSwitch(id)).toBeChecked();
      expect(rowSwitch(id)).toBeDisabled();
    });
  });

  it("koskematon oletustila (tyhjä lista): ei tallennusvaroitusta eikä tallennuspalkkia", async () => {
    renderSelection(idp([]));
    await writable();
    expect(screen.queryByText(SELECT_ONE)).not.toBeInTheDocument();
    await snackbar(false);
  });

  it("permissions puuttuu: tallennusvaroitus näkyy heti", async () => {
    // cannotSave() needs a permissions array.
    renderSelection(idp(undefined));
    await writable();
    expect(allSwitch()).toBeChecked();
    expect(screen.getByText(SELECT_ONE)).toBeInTheDocument();
    await snackbar(false);
  });

  it("tyhjä hakutulos: ilmoitus eikä sivutusta", async () => {
    search.current = { content: [], totalPages: 0, totalElements: 0 };
    renderSelection(idp([permission(10), permission(11)]));
    await writable();
    expect(
      screen.getByText("Valitsemillasi hakuehdoilla ei löytynyt yhtään integraatiota.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(heading()).toContain("( 2/0 )");
  });

  it("hakutulos: sivutus totalPages-arvolla", async () => {
    renderSelection(idp([permission(10), permission(11)]));
    await writable();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("button", { name: "Go to page 3" })).toBeInTheDocument();
    expect(within(nav).queryByRole("button", { name: "Go to page 4" })).not.toBeInTheDocument();
  });

  it("rivejä ei näytetä ennen kuin newIntegration on alustettu", () => {
    // newIntegration stays undefined (no-op setter): Row renders nothing.
    render(
      <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
        <MemoryRouter>
          <IntegrationSelection
            integration={idp([permission(10)])}
            newIntegration={undefined}
            setNewIntegration={() => {}}
            setIntegration={() => {}}
            activateAllServices={false}
            setActivateAllServices={() => {}}
          />
        </MemoryRouter>
      </IntlProvider>
    );
    // Only the header row.
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});

describe("oikeudet", () => {
  it("ilman tallentajaryhmää: varoitus, eikä muutoksia voi tehdä", async () => {
    const user = userEvent.setup();
    me.current = { groups: ["APP_MPASSID_KATSELIJA_" + ORG_OID] };
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10)]));

    expect(screen.getByText(NO_RIGHTS)).toBeInTheDocument();
    expect(screen.queryByText(ALL_WARNING)).not.toBeInTheDocument();

    await user.click(rowSwitch(11));
    await user.click(rowSwitch(10));
    await user.click(allSwitch());
    await user.click(screen.getByRole("button", { name: "poista" }));

    expect(rowSwitch(10)).toBeChecked();
    expect(rowSwitch(11)).not.toBeChecked();
    expect(allSwitch()).not.toBeChecked();
    expect(permissionIds(latest.newIntegration)).toEqual([TEST_SERVICE, 10]);
    await snackbar(false);
  });

  it("toisen organisaation tallentajaryhmä ei riitä", async () => {
    me.current = { groups: ["APP_MPASSID_TALLENTAJA_1.2.246.562.10.99999999999"] };
    renderSelection(idp([permission(10), permission(11)]));
    await act(async () => {});
    expect(screen.getByText(NO_RIGHTS)).toBeInTheDocument();
  });

  it("ilman ryhmiä: ei oikeuksia", async () => {
    me.current = {};
    renderSelection(idp([permission(10), permission(11)]));
    await act(async () => {});
    expect(screen.getByText(NO_RIGHTS)).toBeInTheDocument();
  });

  it("kaikki sallittu ilman oikeuksia: vain oikeusvaroitus", async () => {
    me.current = {};
    renderSelection(idp([]));
    await act(async () => {});
    expect(screen.getByText(NO_RIGHTS)).toBeInTheDocument();
    expect(screen.queryByText(ALL_WARNING)).not.toBeInTheDocument();
  });
});

describe("yksittäiset palvelut", () => {
  it("palvelun salliminen: Editoitu, tallennuspalkki ja tallennus käytössä", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();
    await snackbar(false);

    await user.click(rowSwitch(11));

    expect(rowSwitch(11)).toBeChecked();
    expect(rowCells(11)[4]).toBe("Editoitu");
    expect(latest.newIntegration?.permissions?.at(-1)).toEqual({
      to: { id: 11 },
      lastUpdatedOn: "edited",
    });
    expect(heading()).toContain("( 3/40 )");
    await snackbar(true);
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(SELECT_ONE)).not.toBeInTheDocument();
    // The saved integration is untouched.
    expect(permissionIds(latest.integration)).toEqual([TEST_SERVICE, 10]);
  });

  it("palvelun poistaminen niin, että jää vain testipalvelu: tallennus estetty", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    await user.click(rowSwitch(10));

    expect(rowSwitch(10)).not.toBeChecked();
    expect(permissionIds(latest.newIntegration)).toEqual([TEST_SERVICE]);
    await snackbar(true);
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(SELECT_ONE)).toBeInTheDocument();
  });

  it("muutoksen peruminen kytkimellä piilottaa tallennuspalkin", async () => {
    const user = userEvent.setup();
    renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    await user.click(rowSwitch(11));
    await snackbar(true);
    await user.click(rowSwitch(11));
    await snackbar(false);
  });

  it("vertailu tehdään vain id-joukoilla (järjestys ei vaikuta)", async () => {
    const user = userEvent.setup();
    renderSelection(idp([permission(TEST_SERVICE), permission(10), permission(11)]));
    await writable();

    // Remove 10 and add it back: now last in the list, but the same set.
    await user.click(rowSwitch(10));
    await snackbar(true);
    await user.click(rowSwitch(10));
    await snackbar(false);
  });

  it("Peruuta palauttaa tallennetut valinnat", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    await user.click(rowSwitch(11));
    await user.click(rowSwitch(10));
    await user.click(screen.getByRole("button", { name: "Peruuta" }));

    await snackbar(false);
    expect(rowSwitch(10)).toBeChecked();
    expect(rowSwitch(11)).not.toBeChecked();
    expect(latest.newIntegration).toBe(latest.integration);
    expect(allSwitch()).not.toBeChecked();
  });

  it("tallennus: lähettää valinnat ilman lastUpdatedOn-kenttiä ja näyttää ilmoituksen", async () => {
    const user = userEvent.setup();
    const saved = idp([permission(TEST_SERVICE), permission(10), permission(11, DATE)]);
    updateIntegration.mockResolvedValue(saved);
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    await user.click(rowSwitch(11));
    await user.click(saveButton());

    expect(updateIntegration).toHaveBeenCalledTimes(1);
    const [params, body] = updateIntegration.mock.calls[0];
    expect(params).toEqual({ id: 5 });
    expect(body.permissions).toEqual([
      { to: { id: TEST_SERVICE } },
      { to: { id: 10 } },
      { to: { id: 11 } },
    ]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Muutokset astuvat voimaan viimeistään 2 arkipäivän kuluessa muutoksen tallentamishetkestä."
      )
    ).toBeInTheDocument();
    expect(latest.integration).toBe(saved);
    await waitFor(() => expect(latest.newIntegration).toBe(saved));
    await snackbar(false);

    await user.click(within(dialog).getByRole("button", { name: "OK" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await snackbar(false);
    // The saved permission's date replaces "Editoitu".
    expect(rowCells(11)[4]).toBe("2.1.2024");
  });

  it("tallennus poistaa lastUpdatedOn-kentät myös luonnostilasta (mutaatio)", async () => {
    const user = userEvent.setup();
    // Never resolves: the draft stays in place after the call.
    updateIntegration.mockReturnValue(new Promise(() => {}));
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    await user.click(rowSwitch(11));
    const draft = latest.newIntegration!;
    await user.click(saveButton());

    expect(updateIntegration.mock.calls[0][1]).toBe(draft);
    expect(draft.permissions?.every((p) => !("lastUpdatedOn" in p))).toBe(true);
  });
});

describe("Salli kaikki palvelut", () => {
  it("päälle kytkeminen: vain testipalvelu, varoitus ja tallennus käytössä", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10), permission(11)]));
    await writable();
    expect(allSwitch()).not.toBeChecked();

    await user.click(allSwitch());

    expect(allSwitch()).toBeChecked();
    expect(latest.activateAllServices).toBe(true);
    expect(latest.newIntegration?.permissions).toEqual([{ to: { id: TEST_SERVICE } }]);
    expect(screen.getByText(ALL_WARNING)).toBeInTheDocument();
    expect(heading()).toContain("( 40/40 )");
    await snackbar(true);
    expect(saveButton()).toBeEnabled();

    // The saved individual services (10, 11) are removed: confirmed first.
    await user.click(saveButton());
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Olet sallimassa kaikki palvelut")).toBeInTheDocument();
    expect(updateIntegration).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "OK" }));
    expect(updateIntegration).toHaveBeenCalledTimes(1);
    expect(updateIntegration.mock.calls[0][1].permissions).toEqual([{ to: { id: TEST_SERVICE } }]);
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
  });

  it("päälle kytkeminen ja tallennus: PERUUTA ei tallenna, ja tallennuspalkki palaa", async () => {
    const user = userEvent.setup();
    renderSelection(idp([permission(TEST_SERVICE), permission(10)]));
    await writable();

    await user.click(allSwitch());
    await user.click(saveButton());
    await user.click(await screen.findByRole("button", { name: "PERUUTA" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(updateIntegration).not.toHaveBeenCalled();
    expect(allSwitch()).toBeChecked();
    await snackbar(true);
  });

  it("ilman tallennettuja yksittäisiä palveluja kaikki sallittu tallennetaan ilman vahvistusta", async () => {
    // Only the test service saved: nothing individual is removed.
    const user = userEvent.setup();
    updateIntegration.mockResolvedValue(idp([permission(TEST_SERVICE)]));
    renderSelection(idp([]));
    await writable();

    await user.click(screen.getByRole("button", { name: "poista" }));
    await user.click(saveButton());

    expect(updateIntegration).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
    expect(screen.queryByText("Olet sallimassa kaikki palvelut")).not.toBeInTheDocument();
  });

  it("pois kytkeminen (tyhjä lista): tallennuspalkki näkyy, tallennus estetty", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([]));
    await writable();

    await user.click(allSwitch());

    expect(allSwitch()).not.toBeChecked();
    expect(latest.newIntegration?.permissions).toEqual([]);
    expect(screen.queryByText(ALL_WARNING)).not.toBeInTheDocument();
    expect(screen.getByText(SELECT_ONE)).toBeInTheDocument();
    await snackbar(true);
    expect(saveButton()).toBeDisabled();
    expect(rowSwitch(10)).toBeEnabled();
    expect(rowSwitch(10)).not.toBeChecked();
  });

  it("pois kytkeminen palauttaa tallennetut yksittäiset valinnat", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10), permission(11)]));
    await writable();

    await user.click(allSwitch());
    await user.click(allSwitch());

    expect(allSwitch()).not.toBeChecked();
    expect(permissionIds(latest.newIntegration)).toEqual([TEST_SERVICE, 10, 11]);
    expect(rowSwitch(10)).toBeChecked();
    await snackbar(false);
  });

  it("Peruuta palauttaa kaikki sallittu -tilan (tyhjä lista)", async () => {
    const user = userEvent.setup();
    renderSelection(idp([]));
    await writable();

    await user.click(allSwitch());
    await snackbar(true);
    await user.click(screen.getByRole("button", { name: "Peruuta" }));

    await snackbar(false);
    expect(allSwitch()).toBeChecked();
  });

  it("Peruuta palauttaa kaikki sallittu -tilan, kun tallennettuna on vain testipalvelu", async () => {
    // Korjattu: clearIntegrations() käyttää samaa sääntöä kuin IntegrationTab
    // (tyhjä lista tai pelkkä testipalvelu = "kaikki sallittu").
    const user = userEvent.setup();
    renderSelection(idp([permission(TEST_SERVICE)]));
    await writable();
    expect(allSwitch()).toBeChecked();

    await user.click(allSwitch());
    await user.click(rowSwitch(10));
    await snackbar(true);
    await user.click(screen.getByRole("button", { name: "Peruuta" }));

    await snackbar(false);
    expect(allSwitch()).toBeChecked();
  });

  it("yhden palvelun salliminen ilman testipalvelua voidaan tallentaa", async () => {
    // Korjattu: cannotSave() vaatii vähintään yhden muun kuin testipalvelun,
    // joten yksi valittu palvelu tyhjästä listasta voidaan tallentaa.
    const user = userEvent.setup();
    renderSelection(idp([]));
    await writable();

    await user.click(allSwitch());
    await user.click(rowSwitch(10));

    expect(saveButton()).toBeEnabled();
  });

  it("yksi palvelu ilman testipalvelua: tallennus sallittu, valinnan poisto estää sen", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([]));
    await writable();

    await user.click(allSwitch());
    await user.click(rowSwitch(10));

    expect(permissionIds(latest.newIntegration)).toEqual([10]);
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByText(SELECT_ONE)).not.toBeInTheDocument();

    await user.click(rowSwitch(10));
    expect(permissionIds(latest.newIntegration)).toEqual([]);
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(SELECT_ONE)).toBeInTheDocument();
  });
});

describe("Poista valinnat", () => {
  it("kaikki sallittu: asettaa testipalvelun ja tallennus on käytössä", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([]));
    await writable();

    await user.click(screen.getByRole("button", { name: "poista" }));

    expect(latest.newIntegration?.permissions).toEqual([{ to: { id: TEST_SERVICE } }]);
    expect(latest.activateAllServices).toBe(true);
    await snackbar(true);
    expect(saveButton()).toBeEnabled();

    await user.click(saveButton());
    expect(updateIntegration.mock.calls[0][1].permissions).toEqual([{ to: { id: TEST_SERVICE } }]);
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
  });

  it("yksittäiset valinnat: tyhjentää valinnat, tallennus estetty", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(TEST_SERVICE), permission(10), permission(11)]));
    await writable();

    await user.click(screen.getByText("Poista valinnat"));

    expect(permissionIds(latest.newIntegration)).toEqual([TEST_SERVICE]);
    expect(rowSwitch(10)).not.toBeChecked();
    await snackbar(true);
    expect(saveButton()).toBeDisabled();
  });

  it("vain testipalvelu tallennettuna: ei muutosta, ei tallennuspalkkia", async () => {
    const user = userEvent.setup();
    renderSelection(idp([permission(TEST_SERVICE)]));
    await writable();

    await user.click(screen.getByRole("button", { name: "poista" }));
    await snackbar(false);
  });
});

describe("vahvistusdialogi (tyhjä lista tallennettaessa)", () => {
  // An empty list is not reachable through the UI (every path to it either
  // keeps the save button disabled or replaces the list with the test
  // service), so the draft is set directly through the parent's setters.
  // Through the UI the dialog opens when "allow all" is saved over
  // individually allowed services (describe "Salli kaikki palvelut").
  const openWithEmptyDraft = async () => {
    const user = userEvent.setup();
    const utils = renderSelection(idp([permission(TEST_SERVICE), permission(10), permission(11)]));
    await writable();
    act(() => {
      utils.latest.setActivateAllServices(true);
      utils.latest.setNewIntegration({ ...idp([permission(TEST_SERVICE), permission(10), permission(11)]), permissions: [] });
    });
    await snackbar(true);
    await user.click(saveButton());
    return { user, ...utils };
  };

  it("tallennus avaa vahvistuksen eikä kutsu rajapintaa", async () => {
    await openWithEmptyDraft();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Olet sallimassa kaikki palvelut")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Haluatko varmasti tallentaa? Tieto yksittäisistä valinnoista poistuu tallennuksen yhteydessä."
      )
    ).toBeInTheDocument();
    expect(updateIntegration).not.toHaveBeenCalled();
    await snackbar(false);
  });

  it("PERUUTA sulkee vahvistuksen ja tallennuspalkki palaa", async () => {
    const { user } = await openWithEmptyDraft();
    await user.click(await screen.findByRole("button", { name: "PERUUTA" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(updateIntegration).not.toHaveBeenCalled();
    await snackbar(true);
  });

  it("OK tallentaa tyhjän listan ja näyttää ilmoituksen", async () => {
    const { user, latest } = await openWithEmptyDraft();
    await user.click(await screen.findByRole("button", { name: "OK" }));

    expect(updateIntegration).toHaveBeenCalledTimes(1);
    expect(updateIntegration.mock.calls[0][1].permissions).toEqual([]);
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
    expect(screen.queryByText("Olet sallimassa kaikki palvelut")).not.toBeInTheDocument();
    expect(latest.integration?.permissions).toEqual([]);
    // IntegrationTab recomputes the default from the saved integration.
    expect(latest.activateAllServices).toBe(true);
  });

  it("Esc sulkee vahvistusdialogin", async () => {
    // Korjattu: vahvistusdialogin onClose sulkee vahvistuksen
    // (setOpenConfirmation(false)), joten Esc/taustaklikkaus sulkee dialogin.
    const { user } = await openWithEmptyDraft();
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("haku", () => {
  it("haku asettaa hae- ja ympäristö-parametrit ja nollaa sivun", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(10), permission(11)], 2), {
      initialEntry: "/integraatio/5?sivu=3",
    });
    await writable();

    await user.type(
      screen.getByPlaceholderText("Etsi nimellä, OID:lla tai y-tunnuksella"),
      "palvelu{Enter}"
    );

    const params = new URLSearchParams(latest.search);
    expect(params.get("hae")).toBe("palvelu");
    expect(params.get("ympäristö")).toBe("2");
    expect(params.has("sivu")).toBe(false);
  });

  it("testiympäristö (0): ympäristö-parametria ei aseteta", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(10), permission(11)], 0));
    await writable();

    await user.type(
      screen.getByPlaceholderText("Etsi nimellä, OID:lla tai y-tunnuksella"),
      "x{Enter}"
    );

    const params = new URLSearchParams(latest.search);
    expect(params.get("hae")).toBe("x");
    expect(params.has("ympäristö")).toBe(false);
  });

  it("tyhjä haku poistaa hae-parametrin", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(10), permission(11)]), {
      initialEntry: "/integraatio/5?hae=vanha",
    });
    await writable();

    const input = screen.getByPlaceholderText("Etsi nimellä, OID:lla tai y-tunnuksella");
    expect(input).toHaveValue("vanha");
    await user.clear(input);
    await user.type(input, "{Enter}");

    const params = new URLSearchParams(latest.search);
    expect(params.has("hae")).toBe(false);
    expect(params.get("ympäristö")).toBe("1");
  });

  it("sarakeotsikon klikkaus asettaa lajittelun", async () => {
    const user = userEvent.setup();
    const { latest } = renderSelection(idp([permission(10), permission(11)]));
    await writable();
    await user.click(screen.getByRole("button", { name: "Sallittu palvelu" }));
    expect(new URLSearchParams(latest.search).getAll("sort")).toEqual(["permissions,asc"]);
  });
});
