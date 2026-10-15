import type { Components } from "@/api";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cloneDeep } from "lodash";
import { useState } from "react";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolSelection from "./SchoolSelection";

// ---------------------------------------------------------------------------
// Mocks: the two data sources SchoolSelection reads.
// ---------------------------------------------------------------------------

const getIntegrationDiscoveryInformation = vi.fn();
vi.mock("@/api", () => ({
  getIntegrationDiscoveryInformation: (...args: unknown[]) =>
    getIntegrationDiscoveryInformation(...args),
}));

// Must return the SAME array on every call, like the real (cached) hook does:
// SchoolSelection has an effect keyed on it that sets state, so a fresh array
// per render would loop forever.
vi.mock("@/api/koodisto", () => {
  const institutionTypes = [
    { koodiArvo: "11", metadata: [{ kieli: "FI", nimi: "Peruskoulut" }] },
    { koodiArvo: "15", metadata: [{ kieli: "FI", nimi: "Lukiot" }] },
  ];
  return { useKoodisByKoodisto: () => institutionTypes };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_OID = "1.2.246.562.10.00000000001";
const ORG_NAME = "Mansikkalan testi kunta";

// organisaatio children carry the institution type as "oppilaitostyyppi_<n>#<version>".
const school = (name: string, code: string, type: number) => ({
  oid: `${ORG_OID}.${code}`,
  name,
  oppilaitosKoodi: code,
  oppilaitostyyppi: `oppilaitostyyppi_${type}#1`,
});

const SCHOOLS = [
  school("Koulu A", "30001", 11),
  school("Koulu B", "30002", 11),
  school("Koulu C", "30003", 11),
  school("Lukio L", "30077", 15),
];

interface IntegrationOptions {
  id?: number;
  institutionTypes?: number[];
  logoUrl?: string;
  discoveryInformation?: Components.Schemas.DiscoveryInformation;
  deploymentPhase?: number;
}

const makeIntegration = ({
  id = 0,
  institutionTypes = [],
  logoUrl,
  discoveryInformation = {
    showSchools: false,
    schools: [],
    excludedSchools: [],
    earlyEducationProvider: false,
  },
  deploymentPhase = 0,
}: IntegrationOptions = {}): Components.Schemas.Integration => ({
  id,
  deploymentPhase,
  organization: {
    oid: ORG_OID,
    name: ORG_NAME,
    children: SCHOOLS,
  } as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes: [],
    idp: { type: "wilma", institutionTypes, logoUrl, flowName: "x", idpId: "x" },
  },
  discoveryInformation,
});

// ---------------------------------------------------------------------------
// Harness: owns the draft state like IntegrationDetails.tsx does and exposes
// the latest values (incl. every canSave report) to the test.
// ---------------------------------------------------------------------------

interface Latest {
  discoveryInformation: Components.Schemas.DiscoveryInformation;
  configurationEntity: Components.Schemas.ConfigurationEntity;
  /** Every distinct canSave value the parent state went through, in order. */
  canSave: boolean[];
  /** Changes the environment prop, like IntegrationDetails' Palveluympäristö. */
  setEnvironment: (environment: number) => void;
}

/** Freezes an object graph, so any in-place mutation throws (strict mode). */
const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const renderSchoolSelection = (
  integration: Components.Schemas.Integration,
  environment: number,
  { newLogo = false, freezeProps = false }: { newLogo?: boolean; freezeProps?: boolean } = {}
) => {
  const prepare = <T,>(value: T): T => {
    const copy = cloneDeep(value);
    return freezeProps ? deepFreeze(copy) : copy;
  };
  const latest: Latest = {
    discoveryInformation: {},
    configurationEntity: {},
    canSave: [],
    setEnvironment: () => {},
  };

  const setLogo = vi.fn();
  const setNewLogo = vi.fn();

  function Harness() {
    // Same type as IntegrationDetails' state (undefined until loaded).
    const [configurationEntity, setConfigurationEntity] = useState<
      Components.Schemas.ConfigurationEntity | undefined
    >(() => prepare(integration.configurationEntity!));
    const [discoveryInformation, setDiscoveryInformation] = useState(() =>
      prepare(integration.discoveryInformation!)
    );
    // A stable setter, like IntegrationDetails' useState setter (the component
    // has an effect depending on setCanSave's identity).
    const [canSave, setCanSave] = useState(true);
    const [currentEnvironment, setCurrentEnvironment] = useState(environment);
    latest.setEnvironment = setCurrentEnvironment;
    if (latest.canSave.at(-1) !== canSave) latest.canSave.push(canSave);
    latest.discoveryInformation = discoveryInformation;
    latest.configurationEntity = configurationEntity!;

    return (
      <SchoolSelection
        integration={integration}
        environment={currentEnvironment}
        configurationEntity={configurationEntity!}
        setConfigurationEntity={setConfigurationEntity}
        discoveryInformation={discoveryInformation}
        setDiscoveryInformation={setDiscoveryInformation}
        setCanSave={setCanSave}
        setLogo={setLogo}
        newLogo={newLogo}
        setNewLogo={setNewLogo}
      />
    );
  }

  const utils = render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <Harness />
    </IntlProvider>
  );
  return { ...utils, latest };
};

beforeEach(() => {
  getIntegrationDiscoveryInformation.mockReset();
  getIntegrationDiscoveryInformation.mockResolvedValue({
    existingIncluded: null,
    existingExcluded: null,
  });
});


// ---------------------------------------------------------------------------
// Interaction helpers (MUI Select / Switch)
// ---------------------------------------------------------------------------

const CODE = { A: "30001", B: "30002", C: "30003", L: "30077" };

/** The MUI Switch next to a row label (rendered by DataRowTitle as the attribute name). */
const switchFor = (rowLabel: string) => {
  const label = screen.getByText(rowLabel);
  const row = label.closest(".MuiGrid-root")!.nextElementSibling as HTMLElement;
  return within(row).getByRole("switch");
};

const comboboxes = () => screen.queryAllByRole("combobox");

/** Opens a MultiSelectForm, clicks the given option labels and closes it. */
const pick = async (
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  labels: string[]
) => {
  await user.click(combobox);
  const listbox = await screen.findByRole("listbox");
  await labels.reduce(
    (previous, label) =>
      previous.then(() => user.click(within(listbox).getByRole("option", { name: label }))),
    Promise.resolve()
  );
  await user.keyboard("{Escape}");
};

const openOptions = async (
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement
) => {
  await user.click(combobox);
  const listbox = await screen.findByRole("listbox");
  const names = within(listbox)
    .queryAllByRole("option")
    .map((o) => o.textContent ?? "")
    .filter(Boolean);
  await user.keyboard("{Escape}");
  return names;
};

const lastCanSave = (latest: Latest) => latest.canSave.at(-1);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("alkunäkymä", () => {
  it("uusi integraatio: koulunäkymä päällä, oppilaitostyyppi pakollinen, logo pakollinen", () => {
    renderSchoolSelection(makeIntegration(), 0);

    expect(screen.getByText("Oppilaitoksen valintanäkymän tiedot")).toBeInTheDocument();
    expect(switchFor("showSchools")).toBeChecked();
    expect(screen.getByText("Oppilaitostyypit")).toBeInTheDocument();
    expect(comboboxes()).toHaveLength(1);
    // Koulujen lisäkonfiguraation kytkin näkyy vasta, kun tyyppi on valittu.
    expect(screen.queryByText("extraSchoolsConfiguration")).not.toBeInTheDocument();
    expect(screen.getByText("Valitse, logo on pakollinen")).toBeInTheDocument();
  });

  it("olemassa oleva logo näytetään eikä logo ole enää pakollinen", () => {
    renderSchoolSelection(
      makeIntegration({ id: 5, logoUrl: "https://example.test/logo.png" }),
      0
    );
    expect(screen.getByAltText("organisaation logo")).toHaveAttribute(
      "src",
      "https://example.test/logo.png"
    );
    expect(screen.queryByText("Valitse, logo on pakollinen")).not.toBeInTheDocument();
    expect(screen.getByText("Valitse")).toBeInTheDocument();
  });

  it("olemassa oleva integraatio ilman koulunäkymää: oppilaitostyyppejä ei näytetä", () => {
    renderSchoolSelection(
      makeIntegration({
        id: 5,
        discoveryInformation: { showSchools: false, schools: [], excludedSchools: [] },
      }),
      0
    );
    expect(switchFor("showSchools")).not.toBeChecked();
    expect(screen.queryByText("Oppilaitostyypit")).not.toBeInTheDocument();
  });

  it("esimerkkiteksti käyttää organisaation nimeä otsikkona", () => {
    renderSchoolSelection(makeIntegration({ institutionTypes: [11] }), 0);
    expect(screen.getByText(`Esim. Koulu A (${ORG_NAME})`)).toBeInTheDocument();
  });

  it("esimerkkikoulu seuraa valintoja", async () => {
    const user = userEvent.setup();
    renderSchoolSelection(makeIntegration(), 0);
    // Ei tyyppiä valittuna: ei tarjolla olevaa koulua (ennen Koulu A, vaikka sen tyyppiä ei ollut valittu).
    expect(screen.getByText(`Esim. Mansikkalan koulu (${ORG_NAME})`)).toBeInTheDocument();

    await pick(user, comboboxes()[0], ["Lukiot (15)"]);
    expect(await screen.findByText(`Esim. Lukio L (${ORG_NAME})`)).toBeInTheDocument();

    await pick(user, comboboxes()[0], ["Lukiot (15)", "Peruskoulut (11)"]);
    await user.click(switchFor("extraSchoolsConfiguration"));
    await waitFor(() => expect(comboboxes()).toHaveLength(3));
    await pick(user, comboboxes()[1], ["Koulu C"]);
    // Valittu koulu.
    expect(await screen.findByText(`Esim. Koulu C (${ORG_NAME})`)).toBeInTheDocument();
  });
});

describe("oppilaitostyyppi ja koulut, ei-tuotantoympäristö", () => {
  it("tyypin valinta päivittää configurationEntityn eikä kutsu discovery-rajapintaa", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(makeIntegration(), 0);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() =>
      expect(latest.configurationEntity.idp?.institutionTypes).toEqual([11])
    );
    expect(getIntegrationDiscoveryInformation).not.toHaveBeenCalled();
    const extra = switchFor("extraSchoolsConfiguration");
    expect(extra).not.toBeChecked();
    expect(extra).toBeEnabled();
  });

  it("lisäkonfiguraatio näyttää vain valitun tyypin koulut", async () => {
    const user = userEvent.setup();
    renderSchoolSelection(makeIntegration(), 0);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await user.click(switchFor("extraSchoolsConfiguration"));

    await waitFor(() => expect(comboboxes()).toHaveLength(3));
    expect(await openOptions(user, comboboxes()[1])).toEqual([
      "Koulu A",
      "Koulu B",
      "Koulu C",
    ]);
  });

  it("koulun valinta tallentuu schools-listaan ja tyhjentää poissulut", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(makeIntegration(), 0);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await user.click(switchFor("extraSchoolsConfiguration"));
    await waitFor(() => expect(comboboxes()).toHaveLength(3));
    await pick(user, comboboxes()[1], ["Koulu A"]);

    await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([CODE.A]));
    expect(latest.discoveryInformation.excludedSchools).toEqual([]);
    expect(latest.discoveryInformation.showSchools).toBe(true);
  });

  it("poissuljetun koulun valinta piilottaa koulujen sisällytysvalinnan", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(makeIntegration(), 0);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await user.click(switchFor("extraSchoolsConfiguration"));
    await waitFor(() => expect(comboboxes()).toHaveLength(3));
    await pick(user, comboboxes()[2], ["Koulu B"]);

    await waitFor(() =>
      expect(latest.discoveryInformation.excludedSchools).toEqual([CODE.B])
    );
    expect(screen.queryByText("schools")).not.toBeInTheDocument();
    expect(comboboxes()).toHaveLength(2);
  });

  it("tallennus sallitaan, kun logo ja oppilaitostyyppi ovat olemassa", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      makeIntegration({ logoUrl: "https://example.test/logo.png" }),
      0
    );
    // Ilman oppilaitostyyppiä tallennus on estetty.
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });

  it("logo ei ole koulunvalinnan sääntö (sen vaatii IntegrationDetails)", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(makeIntegration(), 0);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() =>
      expect(latest.configurationEntity.idp?.institutionTypes).toEqual([11])
    );
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });
});

describe("tuotantoympäristö: saman organisaation muut integraatiot", () => {
  it("ilman muita integraatioita: rajapintaa kutsutaan ja kaikki koulut ovat tarjolla", async () => {
    const user = userEvent.setup();
    renderSchoolSelection(makeIntegration(), 1);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() =>
      expect(getIntegrationDiscoveryInformation).toHaveBeenCalledWith({
        organizationOid: ORG_OID,
        institutionType: [11],
        id: 0,
      })
    );
    const extra = switchFor("extraSchoolsConfiguration");
    expect(extra).toBeEnabled();
    await user.click(extra);
    await waitFor(() => expect(comboboxes().length).toBeGreaterThan(1));
    expect(await openOptions(user, comboboxes()[1])).toEqual([
      "Koulu A",
      "Koulu B",
      "Koulu C",
    ]);
  });

  it("toinen integraatio sisältää koulun A: A ei ole sisällytettävissä, kytkin lukittu ja A lisätään luonnoksen poissuluiksi", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValue({
      existingIncluded: [CODE.A],
      existingExcluded: null,
    });
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(makeIntegration(), 1);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() =>
      expect(latest.discoveryInformation.excludedSchools).toEqual([CODE.A])
    );
    const extra = switchFor("extraSchoolsConfiguration");
    expect(extra).toBeChecked();
    expect(extra).toBeDisabled();
    // Huom: A lisätään vain luonnokseen (checkDiscoveryInformation /
    // updateExcludeSchools); komponentin oma excludeSchools-tila jää tyhjäksi,
    // joten sekä sisällytys- että poissulkuvalinta näkyvät eikä A näy
    // käyttäjälle poissuljettuna.
    await waitFor(() => expect(comboboxes()).toHaveLength(3));
    expect(await openOptions(user, comboboxes()[1])).toEqual(["Koulu B", "Koulu C"]);
    expect(await openOptions(user, comboboxes()[2])).toEqual([
      "Koulu A",
      "Koulu B",
      "Koulu C",
    ]);
  });

  it("toinen integraatio sulkee pois B:n ja C:n: vain B ja C ovat lisättävissä, poissulkuvalinta piilossa", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValue({
      existingIncluded: [],
      existingExcluded: [CODE.B, CODE.C],
    });
    const user = userEvent.setup();
    renderSchoolSelection(makeIntegration(), 1);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    const extra = switchFor("extraSchoolsConfiguration");
    await waitFor(() => expect(extra).toBeChecked());
    expect(extra).toBeDisabled();
    await waitFor(() => expect(comboboxes()).toHaveLength(2));
    expect(screen.queryByText("excludedSchools")).not.toBeInTheDocument();
    expect(await openOptions(user, comboboxes()[1])).toEqual(["Koulu B", "Koulu C"]);
  });

  it("rajapintavirhe: palataan valitun tyypin kaikkiin kouluihin", async () => {
    getIntegrationDiscoveryInformation.mockRejectedValue(new Error("500"));
    const user = userEvent.setup();
    renderSchoolSelection(makeIntegration(), 1);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await waitFor(() => expect(getIntegrationDiscoveryInformation).toHaveBeenCalled());
    await user.click(switchFor("extraSchoolsConfiguration"));

    await waitFor(() => expect(comboboxes().length).toBeGreaterThan(1));
    expect(await openOptions(user, comboboxes()[1])).toEqual([
      "Koulu A",
      "Koulu B",
      "Koulu C",
    ]);
  });

  // Virhe hylkää myös edellisen onnistuneen haun
  // tiedot muista integraatioista (kuten ei-tuotantohaara), joten kytkin ei
  // jää edellisen tyyppivalinnan lukitsemaksi eikä validointi käytä niitä.
  it("rajapintavirhe onnistuneen haun jälkeen: edellisen haun lukitus ja tiedot hylätään", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValueOnce({
      existingIncluded: [CODE.A],
      existingExcluded: null,
    });
    const user = userEvent.setup();
    renderSchoolSelection(makeIntegration(), 1);

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    const extra = switchFor("extraSchoolsConfiguration");
    await waitFor(() => expect(extra).toBeDisabled());
    expect(extra).toBeChecked();

    getIntegrationDiscoveryInformation.mockRejectedValue(new Error("500"));
    await pick(user, comboboxes()[0], ["Peruskoulut (11)", "Lukiot (15)"]);
    await waitFor(() => expect(getIntegrationDiscoveryInformation).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(switchFor("extraSchoolsConfiguration")).toBeEnabled());
  });
});

describe("tallennuskelpoisuus johdettuna arvona", () => {
  it("oppilaitostyypin poistaminen estää tallennuksen uudelleen", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      makeIntegration({ logoUrl: "https://example.test/logo.png" }),
      0
    );
    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() =>
      expect(latest.configurationEntity.idp?.institutionTypes).toEqual([])
    );
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });

  it("pakolliset säännöt: tallennus sallitaan vasta oman koulun valinnan jälkeen", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValue({
      existingIncluded: [CODE.A],
      existingExcluded: null,
    });
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      makeIntegration({ logoUrl: "https://example.test/logo.png" }),
      1
    );

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await waitFor(() => expect(comboboxes()).toHaveLength(3));
    expect(lastCanSave(latest)).toBe(false);

    await pick(user, comboboxes()[1], ["Koulu B"]);

    await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([CODE.B]));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });
});

describe("ei-tuotantoympäristö: ei sisarintegraatioita", () => {
  // existingIncluded = [] tarkoittaa, että toisella integraatiolla on kaikki
  // koulut. Ei-tuotannossa sisaria ei haeta, joten tiedon pitää olla null
  // eikä alkuarvo [] - muuten omia poissulkuja ei voinut tallentaa.
  it.each([0, 2])("ympäristö %i: oma poissulku säännöt päällä on tallennettavissa", async (env) => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      makeIntegration({ logoUrl: "https://example.test/logo.png" }),
      env
    );
    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await user.click(switchFor("extraSchoolsConfiguration"));
    await waitFor(() => expect(comboboxes()).toHaveLength(3));

    await pick(user, comboboxes()[2], ["Koulu B"]);

    await waitFor(() =>
      expect(latest.discoveryInformation.excludedSchools).toEqual([CODE.B])
    );
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(getIntegrationDiscoveryInformation).not.toHaveBeenCalled();
  });
});

describe("omat koulut, jotka ovat jo toisen tuotantointegraation käytössä", () => {
  const ownAll = () =>
    makeIntegration({
      id: 5,
      institutionTypes: [11],
      logoUrl: "https://example.test/logo.png",
      discoveryInformation: {
        showSchools: true,
        schools: [CODE.A, CODE.B, CODE.C],
        excludedSchools: [],
        title: "T",
      },
    });
  const ALL_USED = "Kaikki koulut ovat jo käytössä muissa integraatioissa";

  beforeEach(() => {
    getIntegrationDiscoveryInformation.mockResolvedValue({
      existingIncluded: [CODE.A, CODE.B, CODE.C],
      existingExcluded: null,
    });
  });

  it("avattu Tuotannossa: omat koulut pysyvät tarjolla", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(ownAll(), 1);

    await waitFor(() => expect(getIntegrationDiscoveryInformation).toHaveBeenCalled());
    await waitFor(() => expect(comboboxes()).toHaveLength(2));
    expect(await openOptions(user, comboboxes()[1])).toEqual(["Koulu A", "Koulu B", "Koulu C"]);
    expect(screen.queryByText(ALL_USED)).not.toBeInTheDocument();
    expect(latest.discoveryInformation.schools).toEqual([CODE.A, CODE.B, CODE.C]);
  });

  it("avattu Tuotanto-Testissä ja vaihdettu Tuotantoon: koulut säilyvät, varoitus ja tallennus estetty", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(ownAll(), 2);
    expect(getIntegrationDiscoveryInformation).not.toHaveBeenCalled();

    act(() => latest.setEnvironment(1));

    await waitFor(() => expect(getIntegrationDiscoveryInformation).toHaveBeenCalled());
    expect(await screen.findByText(ALL_USED)).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Kaikki valitut koulut eivät ole sallittuja Tuotannossa, koska ne ovat jo käytössä muissa integraatioissa: Koulu A, Koulu B, Koulu C. Poista ne ennen tallennusta."
      )
    ).toBeInTheDocument();
    // Ei poisteta automaattisesti.
    expect(latest.discoveryInformation.schools).toEqual([CODE.A, CODE.B, CODE.C]);
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    // Käyttäjä poistaa ne itse: ne näkyvät valinnoissa merkittyinä.
    await pick(user, comboboxes()[1], [
      "Koulu A (ei sallittu)",
      "Koulu B (ei sallittu)",
      "Koulu C (ei sallittu)",
    ]);
    await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([]));
    expect(screen.queryByText(/eivät ole sallittuja Tuotannossa/)).not.toBeInTheDocument();

    // Tyhjien vaihtoehtojen "Ei valintoja" on paikanpitäjä, ei valittava arvo.
    await user.click(comboboxes()[1]);
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "Ei valintoja" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await user.keyboard("{Escape}");
    expect(latest.discoveryInformation.schools).toEqual([]);
  });

  it("vain osa omista kouluista ei sallittu: vain ne luetellaan, ja niiden poisto sallii tallennuksen", async () => {
    getIntegrationDiscoveryInformation.mockResolvedValue({
      existingIncluded: [CODE.A],
      existingExcluded: null,
    });
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      makeIntegration({
        id: 5,
        institutionTypes: [11],
        logoUrl: "https://example.test/logo.png",
        discoveryInformation: { showSchools: true, schools: [CODE.A, CODE.B], excludedSchools: [], title: "T" },
      }),
      2
    );

    act(() => latest.setEnvironment(1));

    expect(
      await screen.findByText(/eivät ole sallittuja Tuotannossa, koska ne ovat jo käytössä muissa integraatioissa: Koulu A\. /)
    ).toBeInTheDocument();
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    await pick(user, comboboxes()[1], ["Koulu A (ei sallittu)"]);

    await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([CODE.B]));
    expect(screen.queryByText(/eivät ole sallittuja Tuotannossa/)).not.toBeInTheDocument();
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });
});

describe("oppilaitostyypin muutos karsii sen tyypin koulut", () => {
  const twoTypes = (discoveryInformation: Components.Schemas.DiscoveryInformation) =>
    makeIntegration({
      id: 5,
      institutionTypes: [11, 15],
      logoUrl: "https://example.test/logo.png",
      deploymentPhase: 1,
      discoveryInformation: { showSchools: true, title: "T", ...discoveryInformation },
    });

  it.each([0, 1])("ympäristö %i: valitut koulut", async (env) => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      twoTypes({ schools: [CODE.A, CODE.L], excludedSchools: [] }),
      env
    );
    await waitFor(() => expect(comboboxes()).toHaveLength(2));

    await pick(user, comboboxes()[0], ["Lukiot (15)"]);

    await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([CODE.A]));
    expect(latest.configurationEntity.idp?.institutionTypes).toEqual([11]);
    expect(screen.queryByText(/eivät ole sallittuja Tuotannossa/)).not.toBeInTheDocument();
  });

  it.each([0, 1])("ympäristö %i: poissuljetut koulut", async (env) => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(
      twoTypes({ schools: [], excludedSchools: [CODE.B, CODE.L] }),
      env
    );
    await waitFor(() => expect(comboboxes()).toHaveLength(2));

    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);

    await waitFor(() => expect(latest.discoveryInformation.excludedSchools).toEqual([CODE.L]));
    expect(latest.configurationEntity.idp?.institutionTypes).toEqual([15]);
  });
});

describe("koulunäkymän kytkin", () => {
  it("pois kytkeminen tyhjentää oppilaitostyypit ja otsikon ja asettaa näyttönimeksi organisaation nimen", async () => {
    const user = userEvent.setup();
    const { latest } = renderSchoolSelection(makeIntegration(), 0);
    await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
    await waitFor(() =>
      expect(latest.configurationEntity.idp?.institutionTypes).toEqual([11])
    );

    await user.click(switchFor("showSchools"));

    await waitFor(() => expect(latest.discoveryInformation.showSchools).toBe(false));
    expect(latest.configurationEntity.idp?.institutionTypes).toEqual([]);
    expect(latest.discoveryInformation.title).toBeUndefined();
    expect(latest.discoveryInformation.customDisplayName).toBe(ORG_NAME);
    expect(screen.queryByText("Oppilaitostyypit")).not.toBeInTheDocument();
  });
});

describe("propsien muuttumattomuus", () => {
  it("käsittelijät eivät mutatoi discoveryInformation- eikä configurationEntity-propsia", async () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.error);
    window.addEventListener("error", onError);
    try {
      const user = userEvent.setup();
      const { latest } = renderSchoolSelection(
        makeIntegration({ logoUrl: "https://example.test/logo.png" }),
        0,
        { freezeProps: true }
      );

      await pick(user, comboboxes()[0], ["Peruskoulut (11)"]);
      await waitFor(() =>
        expect(latest.configurationEntity.idp?.institutionTypes).toEqual([11])
      );
      await user.click(switchFor("extraSchoolsConfiguration"));
      await waitFor(() => expect(comboboxes()).toHaveLength(3));
      await pick(user, comboboxes()[1], ["Koulu A"]);
      await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([CODE.A]));
      await user.type(screen.getByPlaceholderText("Lisää title"), "x");
      await user.click(switchFor("showSchools"));
      await waitFor(() => expect(latest.discoveryInformation.showSchools).toBe(false));

      expect(errors).toEqual([]);
      expect(latest.discoveryInformation.schools).toEqual([]);
      expect(latest.configurationEntity.idp?.institutionTypes).toEqual([]);
    } finally {
      window.removeEventListener("error", onError);
    }
  });
});

// ---------------------------------------------------------------------------
// Korjattujen bugien regressiotestit.
// ---------------------------------------------------------------------------

describe("korjattujen bugien regressiot", () => {
  it(
    "koulunäkymän pois kytkeminen tyhjentää valitut koulut luonnoksesta",
    async () => {
      const user = userEvent.setup();
      const { latest } = renderSchoolSelection(
        makeIntegration({
          id: 5,
          institutionTypes: [11],
          discoveryInformation: {
            showSchools: true,
            schools: [CODE.A],
            excludedSchools: [],
            title: "Otsikko",
          },
        }),
        0
      );
      await waitFor(() => expect(latest.discoveryInformation.schools).toEqual([CODE.A]));

      await user.click(switchFor("showSchools"));

      await waitFor(() => expect(latest.discoveryInformation.showSchools).toBe(false));
      expect(latest.discoveryInformation.schools).toEqual([]);
    }
  );

  it(
    "koulunäkymän pois kytkeminen tyhjentää myös poissulut luonnoksesta",
    async () => {
      const user = userEvent.setup();
      const { latest } = renderSchoolSelection(
        makeIntegration({
          id: 5,
          institutionTypes: [11],
          discoveryInformation: {
            showSchools: true,
            schools: [],
            excludedSchools: [CODE.B],
            title: "Otsikko",
          },
        }),
        0
      );
      await waitFor(() =>
        expect(latest.discoveryInformation.excludedSchools).toEqual([CODE.B])
      );

      await user.click(switchFor("showSchools"));

      await waitFor(() => expect(latest.discoveryInformation.showSchools).toBe(false));
      expect(latest.discoveryInformation.schools).toEqual([]);
      expect(latest.discoveryInformation.excludedSchools).toEqual([]);
      expect(latest.configurationEntity.idp?.institutionTypes).toEqual([]);
    }
  );

  it(
    "integraation omat poissulut (schools=[]) säilyvät luonnoksessa latauksessa",
    async () => {
      const { latest } = renderSchoolSelection(
        makeIntegration({
          id: 5,
          institutionTypes: [11],
          discoveryInformation: {
            showSchools: true,
            schools: [],
            excludedSchools: [CODE.A],
            title: "Otsikko",
          },
        }),
        0
      );

      // Ruudulla A näkyy poissuljettuna...
      await screen.findByText("Koulu A");
      // ...ja myös tallennettava luonnos säilyttää sen.
      await new Promise((r) => setTimeout(r, 50));
      expect(latest.discoveryInformation.excludedSchools).toEqual([CODE.A]);
    }
  );

  it(
    "olemassa oleva integraatio ilman koulunäkymää saa organisaation nimen näyttönimeksi",
    async () => {
      const { latest } = renderSchoolSelection(
        makeIntegration({
          id: 5,
          discoveryInformation: { showSchools: false, schools: [], excludedSchools: [] },
        }),
        0
      );
      expect(screen.getByPlaceholderText("Lisää customDisplayName")).toHaveValue(ORG_NAME);
      // Oletus tallentuu, ei vain näy.
      await waitFor(() => expect(latest.discoveryInformation.customDisplayName).toBe(ORG_NAME));
    }
  );

  it("oma näyttönimi säilyy, eikä koulunäkymä päällä aseta näyttönimeä", async () => {
    const own = renderSchoolSelection(
      makeIntegration({
        id: 5,
        discoveryInformation: { showSchools: false, schools: [], excludedSchools: [], customDisplayName: "Oma" },
      }),
      0
    );
    expect(screen.getByPlaceholderText("Lisää customDisplayName")).toHaveValue("Oma");
    await new Promise((r) => setTimeout(r, 50));
    expect(own.latest.discoveryInformation.customDisplayName).toBe("Oma");
    own.unmount();

    const { latest } = renderSchoolSelection(makeIntegration(), 0);
    expect(screen.getByPlaceholderText("Lisää customDisplayName")).toHaveValue("");
    await new Promise((r) => setTimeout(r, 50));
    expect(latest.discoveryInformation.customDisplayName).toBeUndefined();
  });

  it("sääntökytkimen oletus lasketaan juuri ladatuista vaihtoehdoista", async () => {
    // Kaikki tyypin koulut ovat toisen integraation käytössä: vaihtoehtoja ei
    // ole, joten sääntöjä ei kytketä päälle (edellisen kierroksen 3 koulua
    // eivät vaikuta).
    getIntegrationDiscoveryInformation.mockResolvedValue({
      existingIncluded: [CODE.A, CODE.B, CODE.C],
      existingExcluded: null,
    });
    renderSchoolSelection(
      makeIntegration({ institutionTypes: [11], logoUrl: "https://example.test/logo.png" }),
      1
    );
    await waitFor(() => expect(getIntegrationDiscoveryInformation).toHaveBeenCalled());
    await screen.findByText("Kaikki koulut ovat jo käytössä muissa integraatioissa");
    expect(switchFor("extraSchoolsConfiguration")).not.toBeChecked();
  });
});
