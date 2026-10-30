import type { Components } from "@/api";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useEffect, useState, type MutableRefObject } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes, useLocation, type Location } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewIntegrationSelection from "./NewIntegrationSelection";

// ---------------------------------------------------------------------------
// Mocks: the blank-integration call, the user's groups, organisation names
// and the PossibleServices child (a stub recording its props, so the tests
// can pick a service through its handleService callback).
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);

const getBlankIntegration = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  getBlankIntegration: (...args: unknown[]) => getBlankIntegration(...args),
}));

// Must be the SAME object on every render: the component has an effect keyed on it.
const me = vi.hoisted(() => ({ current: { groups: [] as string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

const getOrganisaatioNimet = vi.hoisted(() => vi.fn());
vi.mock("@/api/organisaatio", () => ({
  getOrganisaatioNimet: (...args: unknown[]) => getOrganisaatioNimet(...args),
}));

vi.mock("./PossibleServices", () => ({
  default: (props: Props) => {
    children.services = props;
    return <div data-testid="possible-services" />;
  },
}));

const prop = <T,>(child: string, name: string) => children[child][name] as T;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const IDP_OID = "1.2.246.562.10.00000000011";
const SP_OID = "1.2.246.562.10.00000000022";
const NAMES: Record<string, string> = {
  [IDP_OID]: "Koulutuskunta",
  [SP_OID]: "Palveluyritys",
};

const nimet = (oid: string) => [{ oid, nimi: { fi: NAMES[oid], sv: `${NAMES[oid]} (sv)` } }];

const blankSp = (): Components.Schemas.Integration => ({
  id: undefined,
  organization: { oid: SP_OID },
  configurationEntity: {
    sp: { type: "saml", name: "Tyhjä nimi", metadata: null } as unknown as Components.Schemas.ServiceProvider,
  },
});

const blankIdp = (): Components.Schemas.Integration => ({
  organization: { oid: IDP_OID },
  configurationEntity: { idp: { type: "wilma" } },
});

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

const setOpenSpy = vi.fn();
const harness: { setOpen: (open: boolean) => void } = { setOpen: () => {} };

function Harness() {
  const [open, setOpenState] = useState(true);
  // A stable setter, like Home's useState setter.
  const setOpen = useCallback((value: boolean) => {
    setOpenSpy(value);
    setOpenState(value);
  }, []);
  useEffect(() => {
    harness.setOpen = setOpen;
  });
  return <NewIntegrationSelection open={open} setOpen={setOpen} />;
}

const renderSelection = ({ messages = {} as Record<string, string> } = {}) => {
  const user = userEvent.setup();
  render(
    <IntlProvider locale="fi" defaultLocale="fi" messages={messages} onError={() => {}}>
      <MemoryRouter initialEntries={["/"]}>
        <LocationProbe />
        <Routes>
          <Route path="/" element={<Harness />} />
          <Route path="/muokkaa/:role/:type/:id" element={<div>Muokkaussivu</div>} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>
  );
  return user;
};

// The three Selects in order: organisaatio, integraatio, tyyppi.
const combobox = (index: 0 | 1 | 2) => screen.getAllByRole("combobox")[index];

const optionNames = async (user: ReturnType<typeof userEvent.setup>, select: HTMLElement) => {
  await user.click(select);
  const listbox = await screen.findByRole("listbox");
  const names = within(listbox)
    .getAllByRole("option")
    .map((option) => option.textContent);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  return names;
};

const choose = async (user: ReturnType<typeof userEvent.setup>, select: HTMLElement, name: string) => {
  await user.click(select);
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name }));
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
};

const luo = () => screen.getByRole("button", { name: "Luo" });

/** Waits until the organisation names have resolved and the first one is selected. */
const organizationsReady = (name: string) => waitFor(() => expect(combobox(0)).toHaveTextContent(name));

beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  getBlankIntegration.mockReset();
  getOrganisaatioNimet.mockReset();
  getOrganisaatioNimet.mockImplementation(async (oid: string) => nimet(oid));
  setOpenSpy.mockReset();
  me.current = { groups: [`APP_MPASSID_TALLENTAJA_${IDP_OID}`, `APP_MPASSID_PALVELU_TALLENTAJA_${SP_OID}`] };
  locationRef.current = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dialogi", () => {
  it("näyttää otsikon 'Luo uusi integraatio'", async () => {
    renderSelection();
    expect(screen.getByText("Luo uusi integraatio")).toBeInTheDocument();
    await organizationsReady(NAMES[IDP_OID]);
  });

  it("Peruuta kutsuu setOpen(false) ja sulkee dialogin", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);
    await user.click(screen.getByRole("button", { name: "Peruuta" }));
    expect(setOpenSpy).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByText("Luo uusi integraatio")).not.toBeInTheDocument());
  });
});

describe("organisaatiot", () => {
  it("haetaan nimet TALLENTAJA- ja PALVELU_TALLENTAJA-ryhmien oideille, ensimmäinen valitaan", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);

    expect(getOrganisaatioNimet.mock.calls.map(([oid]) => oid)).toEqual([IDP_OID, SP_OID]);
    expect(await optionNames(user, combobox(0))).toEqual([NAMES[IDP_OID], NAMES[SP_OID]]);
  });

  it("muut ryhmät ohitetaan", async () => {
    me.current = { groups: ["APP_MPASSID", `APP_MPASSID_KATSELIJA_${IDP_OID}`, `APP_MPASSID_PALVELU_TALLENTAJA_${SP_OID}`] };
    renderSelection();
    await organizationsReady(NAMES[SP_OID]);
    expect(getOrganisaatioNimet).toHaveBeenCalledTimes(1);
    expect(getOrganisaatioNimet).toHaveBeenCalledWith(SP_OID);
  });

  it("puuttuva kielen nimi, vastaamaton oid tai epäonnistunut haku näyttää oidin", async () => {
    const third = "1.2.246.562.10.00000000033";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    me.current = {
      groups: [
        `APP_MPASSID_TALLENTAJA_${IDP_OID}`,
        `APP_MPASSID_PALVELU_TALLENTAJA_${SP_OID}`,
        `APP_MPASSID_PALVELU_TALLENTAJA_${third}`,
      ],
    };
    getOrganisaatioNimet.mockImplementation(async (oid: string) => {
      if (oid === IDP_OID) return [{ oid, nimi: { sv: "Bara svenska" } }];
      if (oid === SP_OID) return [{ oid: "joku.muu", nimi: { fi: "Väärä" } }];
      throw new Error("404");
    });
    const user = renderSelection();
    await organizationsReady(IDP_OID);
    expect(await optionNames(user, combobox(0))).toEqual([IDP_OID, SP_OID, third]);
  });

  it("organisaatioita ei näytetä ennen kuin kaikkien nimet on haettu", async () => {
    let resolveSecond: (value: unknown) => void = () => {};
    getOrganisaatioNimet.mockImplementation((oid: string) =>
      oid === SP_OID ? new Promise((resolve) => (resolveSecond = resolve)) : Promise.resolve(nimet(oid))
    );
    renderSelection();
    await act(async () => {});
    expect(combobox(0)).not.toHaveTextContent(NAMES[IDP_OID]);

    await act(async () => resolveSecond(nimet(SP_OID)));
    await organizationsReady(NAMES[IDP_OID]);
  });
});

describe("koulutustoimija (idp)", () => {
  it("TALLENTAJA-organisaatiolla integraatioksi valitaan Koulutustoimija ja tyypiksi wilma", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);

    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));
    expect(combobox(2)).toHaveTextContent("wilma");
    expect(screen.queryByTestId("possible-services")).not.toBeInTheDocument();
    expect(luo()).toBeEnabled();
    expect(await optionNames(user, combobox(1))).toEqual(["Koulutustoimija", "Palveluintegraatio"]);
    expect(await optionNames(user, combobox(2))).toEqual(["wilma", "opinsys", "azure", "adfs", "gsuite"]);
  });

  it("tyyppien nimet käännetään, jos tyyppi.<tyyppi>-käännös on olemassa", async () => {
    const user = renderSelection({ messages: { "tyyppi.wilma": "Wilma", "tyyppi.azure": "Entra ID" } });
    await organizationsReady(NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(2)).toHaveTextContent("Wilma"));
    expect(await optionNames(user, combobox(2))).toEqual(["Wilma", "opinsys", "Entra ID", "adfs", "gsuite"]);
  });

  it("Luo hakee tyhjän integraation ja navigoi muokkaukseen (id 0, deploymentPhase 1)", async () => {
    getBlankIntegration.mockResolvedValue(blankIdp());
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));
    await choose(user, combobox(2), "azure");

    await user.click(luo());

    expect(await screen.findByText("Muokkaussivu")).toBeInTheDocument();
    expect(getBlankIntegration).toHaveBeenCalledWith({ role: "idp", type: "azure", organization: IDP_OID });
    expect(locationRef.current?.pathname).toBe("/muokkaa/idp/azure/0");
    expect(locationRef.current?.state).toEqual({ ...blankIdp(), id: 0, deploymentPhase: 1 });
  });

  it("Palveluintegraation valinta vaihtaa tyypit ja näyttää palvelun valinnan", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));

    await choose(user, combobox(1), "Palveluintegraatio");

    expect(combobox(2)).toHaveTextContent("saml");
    expect(screen.getByTestId("possible-services")).toBeInTheDocument();
    expect(prop("services", "oid")).toBe(IDP_OID);
    expect(luo()).toBeDisabled();
  });
});

describe("palveluintegraatio (sp)", () => {
  beforeEach(() => {
    me.current = { groups: [`APP_MPASSID_PALVELU_TALLENTAJA_${SP_OID}`] };
  });

  it("PALVELU_TALLENTAJA-organisaatiolla vain Palveluintegraatio ja tyypit saml/oidc", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[SP_OID]);

    expect(combobox(1)).toHaveTextContent("Palveluintegraatio");
    expect(combobox(2)).toHaveTextContent("saml");
    expect(await optionNames(user, combobox(1))).toEqual(["Palveluintegraatio"]);
    expect(await optionNames(user, combobox(2))).toEqual(["saml", "oidc"]);
    expect(prop("services", "oid")).toBe(SP_OID);
  });

  it("Luo on pois käytöstä, kunnes palvelu on valittu", async () => {
    renderSelection();
    await organizationsReady(NAMES[SP_OID]);
    expect(luo()).toBeDisabled();

    act(() => prop<(value: unknown) => void>("services", "handleService")({ name: "uusi", environment: 0, setId: 0 }));
    expect(luo()).toBeEnabled();
  });

  it("olemassa oleva palvelu: nimi, ympäristö ja setti kopioidaan, null-metadata -> {}", async () => {
    getBlankIntegration.mockResolvedValue(blankSp());
    const user = renderSelection();
    await organizationsReady(NAMES[SP_OID]);
    await choose(user, combobox(2), "oidc");
    act(() =>
      prop<(value: unknown) => void>("services", "handleService")({ name: "Oppimisalusta", environment: 2, setId: 42 })
    );

    await user.click(luo());

    expect(await screen.findByText("Muokkaussivu")).toBeInTheDocument();
    expect(getBlankIntegration).toHaveBeenCalledWith({ role: "sp", type: "oidc", organization: SP_OID });
    expect(locationRef.current?.pathname).toBe("/muokkaa/sp/oidc/0");
    expect(locationRef.current?.state).toEqual({
      id: 0,
      organization: { oid: SP_OID },
      deploymentPhase: 2,
      integrationSets: [{ id: 42 }],
      configurationEntity: { sp: { type: "saml", name: "Oppimisalusta", metadata: {} } },
    });
  });

  it("uusi palvelu (setId 0): tyhjän integraation nimi säilyy, setiksi {id: 0}", async () => {
    getBlankIntegration.mockResolvedValue(blankSp());
    const user = renderSelection();
    await organizationsReady(NAMES[SP_OID]);
    act(() => prop<(value: unknown) => void>("services", "handleService")({ name: "uusi", environment: 1, setId: 0 }));

    await user.click(luo());

    await screen.findByText("Muokkaussivu");
    expect(locationRef.current?.pathname).toBe("/muokkaa/sp/saml/0");
    expect(locationRef.current?.state).toMatchObject({
      deploymentPhase: 1,
      integrationSets: [{ id: 0 }],
      configurationEntity: { sp: { name: "Tyhjä nimi" } },
    });
  });

  it("dialogin uudelleenavaus nollaa valitun palvelun", async () => {
    renderSelection();
    await organizationsReady(NAMES[SP_OID]);
    act(() => prop<(value: unknown) => void>("services", "handleService")({ name: "uusi", environment: 1, setId: 0 }));
    expect(luo()).toBeEnabled();

    act(() => harness.setOpen(false));
    act(() => harness.setOpen(true));

    expect(await screen.findByRole("button", { name: "Luo" })).toBeDisabled();
  });
});

describe("organisaation vaihto", () => {
  it("vaihtaa integraation automaattisesti organisaation oikeuksien mukaan", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));

    await choose(user, combobox(0), NAMES[SP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Palveluintegraatio"));
    expect(prop("services", "oid")).toBe(SP_OID);

    await choose(user, combobox(0), NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));
  });

  it("käyttäjän itse valitsemaa integraatiota ei enää vaihdeta automaattisesti", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));
    await choose(user, combobox(1), "Palveluintegraatio");

    await choose(user, combobox(0), NAMES[SP_OID]);
    await choose(user, combobox(0), NAMES[IDP_OID]);

    expect(combobox(1)).toHaveTextContent("Palveluintegraatio");
  });

  it("dialogin uudelleenavaus palauttaa automaattisen valinnan", async () => {
    const user = renderSelection();
    await organizationsReady(NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));
    await choose(user, combobox(1), "Palveluintegraatio");

    act(() => harness.setOpen(false));
    act(() => harness.setOpen(true));

    await choose(user, combobox(0), NAMES[SP_OID]);
    await choose(user, combobox(0), NAMES[IDP_OID]);
    await waitFor(() => expect(combobox(1)).toHaveTextContent("Koulutustoimija"));
  });
});
