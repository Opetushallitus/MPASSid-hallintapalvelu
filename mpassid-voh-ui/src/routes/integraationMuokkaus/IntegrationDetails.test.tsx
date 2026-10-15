import type { Components } from "@/api";
import { act, render, screen, waitFor } from "@testing-library/react";
import { cloneDeep } from "lodash";
import { useRef, useState } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationDetails from "./IntegrationDetails";
import { dataConfiguration as configDataConfiguration, type UiConfiguration } from "../../config";

// ---------------------------------------------------------------------------
// Child components are replaced by stubs that record their latest props, so
// the tests drive IntegrationDetails' own logic (drafts, validity, the "no
// changes" gate, the composed newIntegration) through the same setters the
// real children call. SchoolSelection, Role and LogoField have tests of
// their own.
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);
/** Every environment prop value the data Attributes stub rendered with. */
const attributeEnvironments = vi.hoisted(() => [] as unknown[]);

// Loading by id (no location.state): [error, integration], or suspends.
const useIntegrationSafe = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  useIntegrationSafe: (...args: unknown[]) => useIntegrationSafe(...args),
}));

vi.mock("./SchoolSelection", () => ({
  default: (props: Props) => {
    children.school = props;
    return <div data-testid="school-selection" />;
  },
}));
vi.mock("./Role", () => ({
  default: (props: Props) => {
    children.role = props;
    return null;
  },
}));
vi.mock("./Attributes", () => ({
  default: (props: Props) => {
    children[`attributes-${String(props.attributeType)}`] = props;
    if (props.attributeType === "data") attributeEnvironments.push(props.environment);
    return null;
  },
}));
vi.mock("./Metadata", () => ({
  default: (props: Props) => {
    children.metadata = props;
    return null;
  },
}));
vi.mock("./IntegrationBasicDetails", () => ({
  default: (props: Props) => {
    children.basic = props;
    return null;
  },
}));
vi.mock("../integraatio/IntegrationTab/DataRow", () => ({ DataRow: () => null }));

// Each test renders its own components: forget the previous test's props.
beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  attributeEnvironments.length = 0;
  useIntegrationSafe.mockReset();
  useIntegrationSafe.mockReturnValue([new Error("useIntegrationSafe: ei mockattu"), undefined]);
});

/** Calls a setter the given child received, like the real child would. */
const call = (child: string, setter: string, value: unknown) =>
  act(() => (children[child][setter] as (value: unknown) => void)(value));

const prop = <T,>(child: string, name: string) => children[child][name] as T;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG = { oid: "1.2.246.562.99.00000000001", name: "Mansikkalan testi kunta" };
const LOGO = "https://example.test/logo.png";

const wilma = ({
  deploymentPhase = 1,
  withLogo = true,
  discoveryInformation = {
    showSchools: true,
    schools: [],
    excludedSchools: [],
    title: "Otsikko",
    customDisplayName: "Nimi",
  } as Components.Schemas.DiscoveryInformation,
} = {}): Components.Schemas.Integration => ({
  id: 5,
  deploymentPhase,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes: [],
    idp: {
      type: "wilma",
      institutionTypes: [11],
      logoUrl: withLogo ? LOGO : undefined,
      flowName: "x",
      idpId: "x",
    },
  },
  discoveryInformation,
});

const adfs = (): Components.Schemas.Integration => ({
  id: 6,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes: [],
    idp: { type: "adfs", institutionTypes: [11], logoUrl: LOGO, flowName: "x", idpId: "x" },
  },
  discoveryInformation: { showSchools: true, schools: [], excludedSchools: [], title: "T" },
});

const saml = (): Components.Schemas.Integration => ({
  id: 7,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes: [],
    sp: {
      type: "saml",
      name: "Palvelu",
      entityId: "https://palvelu.example.test",
      // The schema types metadata values as objects (see Form/types.ts).
      metadata: { entityId: "https://palvelu.example.test" },
    } as unknown as Components.Schemas.ServiceProvider,
  },
});

// ---------------------------------------------------------------------------
// Harness: owns the state integraationMuokkaus/index.tsx owns.
// ---------------------------------------------------------------------------

interface Latest {
  canSave: boolean[];
  newIntegration?: Components.Schemas.Integration;
  deploymentPhase: { current: number };
}

const renderDetails = (
  integration: Components.Schemas.Integration | undefined,
  {
    id = integration?.id ?? 5,
    dataConfiguration = [] as UiConfiguration[],
  }: { id?: number; dataConfiguration?: UiConfiguration[] } = {}
) => {
  const latest: Latest = { canSave: [], deploymentPhase: { current: -5 } };

  function Harness() {
    // Stable setters, as in index.tsx: they are effect dependencies in
    // IntegrationDetails, so new functions per render would loop forever.
    const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration>();
    const [canSave, setCanSave] = useState(false);
    const [metadataFile, setMetadataFile] = useState<File[]>([]);
    const [, setSaveDialogState] = useState(true);
    const [, setLogo] = useState<Blob>();
    const deploymentPhase = useRef(-5);
    if (latest.canSave.at(-1) !== canSave) latest.canSave.push(canSave);
    latest.newIntegration = newIntegration;
    latest.deploymentPhase = deploymentPhase;
    return (
      <IntegrationDetails
        id={id}
        setSaveDialogState={setSaveDialogState}
        setCanSave={setCanSave}
        newIntegration={newIntegration}
        setNewIntegration={setNewIntegration}
        setLogo={setLogo}
        metadataFile={metadataFile}
        setMetadataFile={setMetadataFile}
        dataConfiguration={dataConfiguration}
        deploymentPhaseRef={deploymentPhase}
      />
    );
  }

  const state = cloneDeep(integration);
  render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[{ pathname: "/muokkaa", state }]}>
        <Harness />
      </MemoryRouter>
    </IntlProvider>
  );
  return { latest, state };
};

const lastCanSave = (latest: Latest) => latest.canSave.at(-1);

/** Waits until the drafts are initialized (SchoolSelection / Role rendered). */
const ready = async (child: "school" | "role") =>
  waitFor(() => expect(children[child]).toBeDefined());

const draftDiscoveryInformation = () =>
  prop<Components.Schemas.DiscoveryInformation>("school", "discoveryInformation");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("alustus", () => {
  it("luonnokset alustetaan integraatiosta ja newIntegration on sen kopio", async () => {
    const integration = wilma();
    const { latest } = renderDetails(integration);
    await ready("school");

    await waitFor(() => expect(latest.newIntegration).toEqual(integration));
    expect(draftDiscoveryInformation()).toEqual(integration.discoveryInformation);
    expect(prop("school", "configurationEntity")).toEqual(integration.configurationEntity);
    expect(prop("school", "environment")).toBe(1);
    expect(screen.getByTestId("school-selection")).toBeInTheDocument();
  });

  it("palveluintegraatiolla (sp) ei ole koulunvalintaa, mutta metadata on", async () => {
    renderDetails(saml());
    await ready("role");
    await waitFor(() => expect(children.metadata).toBeDefined());
    expect(screen.queryByTestId("school-selection")).not.toBeInTheDocument();
  });

  it("navigoinnin mukana tullut integraatio (location.state) käytetään sellaisenaan, ei haeta", async () => {
    renderDetails(wilma());
    await ready("school");
    expect(useIntegrationSafe).not.toHaveBeenCalled();
  });
});

describe("integraatio ladataan id:llä, kun location.state puuttuu", () => {
  // Muokkaus-URL avattu suoraan, kirjanmerkistä tai uuteen välilehteen.
  // Ennen komponentti kaatui TypeErroriin (luki integraatiota ennen
  // tarkistusta), joten "ei löydy" -ilmoitustakaan ei näytetty.
  it("ladattu integraatio näytetään lomakkeessa", async () => {
    const integration = wilma();
    useIntegrationSafe.mockReturnValue([undefined, integration]);
    const { latest } = renderDetails(undefined, { id: 5 });

    await ready("school");
    expect(useIntegrationSafe).toHaveBeenCalledWith({ id: 5 });
    expect(draftDiscoveryInformation()).toEqual(integration.discoveryInformation);
    await waitFor(() => expect(latest.newIntegration).toEqual(integration));
  });

  it("latauksen ajan näytetään latausindikaattori", () => {
    useIntegrationSafe.mockImplementation(() => {
      throw new Promise(() => {});
    });
    renderDetails(undefined, { id: 5 });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("tuntematon id (haku epäonnistuu) näyttää 'ei löydy' -ilmoituksen", () => {
    useIntegrationSafe.mockReturnValue([new Error("404"), undefined]);
    renderDetails(undefined, { id: 5 });
    expect(screen.getByText(/Integraatiota 5 ei löydy/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "etusivulle" })).toHaveAttribute("href", "/");
  });

  it("uutta integraatiota (id 0) ei haeta: 'ei löydy'", () => {
    renderDetails(undefined, { id: 0 });
    expect(screen.getByText(/Integraatiota 0 ei löydy/)).toBeInTheDocument();
    expect(useIntegrationSafe).not.toHaveBeenCalled();
  });

  it("ladattua (välimuistissa jaettua) integraatiota ei mutatoida", async () => {
    const loaded = wilma();
    useIntegrationSafe.mockReturnValue([undefined, loaded]);
    const { latest } = renderDetails(undefined, { id: 5 });
    await ready("school");

    call("role", "setEnvironment", 2);
    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });

    await waitFor(() => expect(latest.newIntegration?.deploymentPhase).toBe(2));
    expect(loaded.deploymentPhase).toBe(1);
    expect(loaded.discoveryInformation?.title).toBe("Otsikko");
  });
});

describe("ympäristö (Palveluympäristö)", () => {
  it("Role saa ympäristön arvona: integraation oma, Testillä 0, ja valinnan jälkeen uuden", async () => {
    renderDetails(wilma({ deploymentPhase: 0 }));
    await ready("role");
    expect(prop("role", "environment")).toBe(0);

    call("role", "setEnvironment", 2);
    expect(prop("role", "environment")).toBe(2);
  });

  it("Testi-integraatio (deploymentPhase 0) välittää koulunvalinnalle 0 eikä -5", async () => {
    renderDetails(wilma({ deploymentPhase: 0 }));
    await ready("school");
    expect(prop("school", "environment")).toBe(0);
  });

  it("vaihto näkyy koulunvalinnalle heti ja sallii tallennuksen ilman muita muutoksia", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    attributeEnvironments.length = 0;
    call("role", "setEnvironment", 2);

    expect(prop("school", "environment")).toBe(2);
    // Attributes saa ympäristön samasta arvosta jo ensimmäisellä
    // renderöinnillä (ennen refistä: yksi renderöinti vielä vanhalla arvolla).
    expect(attributeEnvironments.length).toBeGreaterThan(0);
    expect(attributeEnvironments.every((value) => value === 2)).toBe(true);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    // Tallennus lukee ympäristön deploymentPhase-refistä (index.tsx).
    // newIntegration päivittyy nyt myös (ennen vasta seuraavasta luonnoksen
    // muutoksesta), joten AttributeTest (index.tsx) saa oikean ympäristön.
    expect(latest.deploymentPhase.current).toBe(2);
    await waitFor(() => expect(latest.newIntegration?.deploymentPhase).toBe(2));
  });

  it("vaihdettu ympäristö päätyy newIntegrationiin, kun luonnos seuraavan kerran muuttuu", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    call("role", "setEnvironment", 2);

    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });

    await waitFor(() => expect(latest.newIntegration?.deploymentPhase).toBe(2));
  });

  it("location.staten integraatiota ei mutatoida (ennen ympäristö kirjoitettiin siihen)", async () => {
    const { state, latest } = renderDetails(wilma());
    await ready("school");
    call("role", "setEnvironment", 2);

    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });

    await waitFor(() => expect(latest.newIntegration?.deploymentPhase).toBe(2));
    expect(state?.deploymentPhase).toBe(1);
    expect(state?.discoveryInformation?.title).toBe("Otsikko");
  });
});

describe("tallennettavuus (canSave)", () => {
  it("muuttamaton integraatio: ei tallennettavaa, ei hetkeäkään", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Ei edes hetkellisesti true (environmentChanged alkoi ennen true:na).
    expect(latest.canSave).toEqual([false]);
  });

  it("koulunvalinnan luonnoksen muutos sallii tallennuksen ja päätyy newIntegrationiin", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");

    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(latest.newIntegration?.discoveryInformation?.title).toBe("Uusi otsikko");
  });

  it("koulunvalinnan oma validiteetti estää tallennuksen", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    call("school", "setCanSave", false);
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    call("school", "setCanSave", true);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });

  it("muiden lasten (Role, Attributes) validiteetti estää tallennuksen", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    call("role", "setCanSave", false);
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    call("role", "setCanSave", true);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    call("attributes-data", "setCanSave", false);
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });

  it("logo on pakollinen: ilman logoa ei tallennettavaa, uusi logo sallii", async () => {
    const { latest } = renderDetails(wilma({ withLogo: false }));
    await ready("school");

    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lastCanSave(latest)).toBe(false);

    call("school", "setNewLogo", true);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });

  it("configurationEntityn muutos (Attributes) sallii tallennuksen ja päätyy newIntegrationiin", async () => {
    const integration = wilma();
    const { latest } = renderDetails(integration);
    await ready("school");

    const changed = cloneDeep(integration.configurationEntity!);
    changed.idp!.institutionTypes = [11, 15];
    call("attributes-data", "setNewConfigurationEntityData", changed);

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(latest.newIntegration?.configurationEntity?.idp?.institutionTypes).toEqual([11, 15]);
  });
});

describe("newIntegrationin kokoaminen", () => {
  it("otsikon oletus: tyhjä otsikko koulunäkymän ollessa päällä tallentuu organisaation nimenä", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");

    const { title: _title, ...withoutTitle } = draftDiscoveryInformation();
    call("school", "setDiscoveryInformation", { ...withoutTitle, showSchools: true });

    await waitFor(() =>
      expect(latest.newIntegration?.discoveryInformation?.title).toBe(ORG.name)
    );
  });

  it("koulunäkymä pois: otsikkoa ei täytetä", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");

    const { title: _title, ...withoutTitle } = draftDiscoveryInformation();
    call("school", "setDiscoveryInformation", { ...withoutTitle, showSchools: false });

    await waitFor(() => expect(latest.newIntegration?.discoveryInformation?.showSchools).toBe(false));
    expect(latest.newIntegration?.discoveryInformation?.title).toBeUndefined();
  });
});

describe("newIntegrationin kokoaminen: palautettu muutos", () => {
  it("palautettu sp-nimi palauttaa myös koosteen", async () => {
    const { latest } = renderDetails(saml());
    await ready("role");
    call("role", "setName", "Uusi palvelu");
    await waitFor(() => expect(latest.newIntegration?.configurationEntity?.sp?.name).toBe("Uusi palvelu"));

    call("role", "setName", "Palvelu");

    await waitFor(() => expect(latest.newIntegration?.configurationEntity?.sp?.name).toBe("Palvelu"));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });

  it("koosteen otsikon oletus ei muuta koulunvalinnan luonnosta", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    const { title: _title, ...withoutTitle } = draftDiscoveryInformation();
    call("school", "setDiscoveryInformation", { ...withoutTitle, showSchools: true });

    await waitFor(() => expect(latest.newIntegration?.discoveryInformation?.title).toBe(ORG.name));
    expect(draftDiscoveryInformation().title).toBeUndefined();
  });

  // Tallennettava integraatio kootaan aina nykyisistä luonnoksista, joten
  // palautettu muutos ei jää voimaan.
  it("palautettu otsikko ei jää tallennettavaksi, kun sen jälkeen vaihdetaan ympäristö", async () => {
    const { latest } = renderDetails(wilma());
    await ready("school");
    const original = draftDiscoveryInformation();

    call("school", "setDiscoveryInformation", { ...original, title: "Uusi otsikko" });
    await waitFor(() => expect(latest.newIntegration?.discoveryInformation?.title).toBe("Uusi otsikko"));
    call("school", "setDiscoveryInformation", { ...original });
    call("role", "setEnvironment", 2);

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    // Tallennus (index.tsx) lähettää newIntegrationin: otsikon pitää olla
    // palautettu.
    expect(latest.newIntegration?.discoveryInformation?.title).toBe("Otsikko");
  });
});

describe("ADFS: metadata on pakollinen", () => {
  it("tyhjä metadataUrl ei muuta idp-luonnosta", async () => {
    const integration = adfs();
    (integration.configurationEntity!.idp as Components.Schemas.Adfs).metadataUrl =
      "https://adfs.example.test/vanha.xml";
    renderDetails(integration);
    await ready("role");
    expect(prop("role", "metadataUrl")).toBe("https://adfs.example.test/vanha.xml");

    call("role", "setMetadataUrl", "");

    expect(prop("role", "metadataUrl")).toBe("");
    const draft = prop<Components.Schemas.ConfigurationEntity>("attributes-data", "newConfigurationEntityData");
    expect((draft.idp as Components.Schemas.Adfs).metadataUrl).toBe("https://adfs.example.test/vanha.xml");
  });

  it("ilman metadataUrlia tai -tiedostoa ei tallennettavaa; metadataUrl sallii ja päätyy idp:hen", async () => {
    const { latest } = renderDetails(adfs());
    await ready("school");

    call("school", "setDiscoveryInformation", { ...draftDiscoveryInformation(), title: "Uusi otsikko" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lastCanSave(latest)).toBe(false);

    call("role", "setMetadataUrl", "https://adfs.example.test/metadata.xml");

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    const idp = latest.newIntegration?.configurationEntity?.idp as Components.Schemas.Adfs;
    expect(idp.metadataUrl).toBe("https://adfs.example.test/metadata.xml");
  });
});

describe("palveluintegraatio (sp)", () => {
  it("nimi ja metadata alustetaan integraatiosta", async () => {
    const integration = saml();
    renderDetails(integration);
    await ready("role");
    await waitFor(() => expect(children.metadata).toBeDefined());
    expect(prop("role", "name")).toBe("Palvelu");
    expect(prop("metadata", "metadata")).toEqual(integration.configurationEntity?.sp?.metadata);
  });

  it("pelkkä nimen muutos sallii tallennuksen ja päätyy sp.nameen", async () => {
    const { latest } = renderDetails(saml());
    await ready("role");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lastCanSave(latest)).toBe(false);

    call("role", "setName", "Uusi palvelu");

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(latest.newIntegration?.configurationEntity?.sp?.name).toBe("Uusi palvelu");
  });

  it("Metadata saa ympäristön renderöintiarvona: Testi (0) on 0 eikä -5", async () => {
    // Ennen `integration.deploymentPhase||-5`, joka muutti Testin (0) arvoksi -5.
    renderDetails({ ...saml(), deploymentPhase: 0 });
    await waitFor(() => expect(children.metadata).toBeDefined());
    expect(prop("metadata", "environment")).toBe(0);
  });

  it("logoa ei vaadita", async () => {
    const { latest } = renderDetails(saml());
    await ready("role");

    call("role", "setName", "Uusi palvelu");

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// uniqueId (config.ts "uniqueId" item): the integration type's unique id
// attribute is copied into the idp/sp field of the same name, which is what
// is saved and shown as "Yksilöllinen tunniste" (wilma: hostname, opinsys:
// tenantId, azure/saml: entityId, oidc: clientId). Uses the real config.ts.
// ---------------------------------------------------------------------------

describe("uniqueId: attribuutti kopioidaan idp/sp-kenttään (oikea config.ts)", () => {
  const withHostname = (hostname: string) => {
    const integration = wilma();
    integration.configurationEntity!.attributes = [{ type: "data", name: "hostname", content: hostname }];
    (integration.configurationEntity!.idp as Record<string, unknown>).hostname = hostname;
    return integration;
  };
  const real = { dataConfiguration: configDataConfiguration };
  const draft = () => prop<Components.Schemas.ConfigurationEntity>("attributes-data", "newConfigurationEntityData");

  it("muuttamaton integraatio (attribuutti = kenttä): ei tallennettavaa", async () => {
    const { latest } = renderDetails(withHostname("a.inschool.fi"), real);
    await ready("school");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(latest.canSave).toEqual([false]);
  });

  it("hostname-attribuutin muutos päätyy tallennettavaan idp.hostnameen", async () => {
    const { latest } = renderDetails(withHostname("a.inschool.fi"), real);
    await ready("school");

    call("attributes-data", "setNewConfigurationEntityData", {
      ...draft(),
      attributes: [{ type: "data", name: "hostname", content: "b.inschool.fi" }],
    });

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    const idp = latest.newIntegration?.configurationEntity?.idp as Record<string, unknown>;
    expect(idp.hostname).toBe("b.inschool.fi");
  });

  it("perustiedot (IntegrationBasicDetails) näyttävät päivitetyn tunnisteen", async () => {
    renderDetails(withHostname("a.inschool.fi"), real);
    await ready("school");
    await waitFor(() => expect(children.basic).toBeDefined());

    call("attributes-data", "setNewConfigurationEntityData", {
      ...draft(),
      attributes: [{ type: "data", name: "hostname", content: "b.inschool.fi" }],
    });

    await waitFor(() =>
      expect(
        (prop<Components.Schemas.ConfigurationEntity>("basic", "configurationEntity").idp as Record<string, unknown>)
          .hostname
      ).toBe("b.inschool.fi")
    );
  });

  it("tyhjä hostname-attribuutti: idp.hostname säilyy", async () => {
    const { latest } = renderDetails(withHostname("a.inschool.fi"), real);
    await ready("school");

    call("attributes-data", "setNewConfigurationEntityData", {
      ...draft(),
      attributes: [{ type: "data", name: "hostname", content: "" }],
      idp: { ...draft().idp, institutionTypes: [11, 15] } as Components.Schemas.IdentityProvider,
    });

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    const idp = latest.newIntegration?.configurationEntity?.idp as Record<string, unknown>;
    expect(idp.hostname).toBe("a.inschool.fi");
  });

  it("tyypillä ilman uniqueId-määritystä (ADFS) perustietoja ei näytetä", async () => {
    renderDetails(adfs(), real);
    await ready("school");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(children.basic).toBeUndefined();
  });

  it("SAML: perustiedot yhdistävät metadatan entityId:n ja palvelun nimen", async () => {
    renderDetails(saml(), real);
    await ready("role");
    await waitFor(() => expect(children.basic).toBeDefined());

    call("role", "setName", "Uusi palvelu");

    await waitFor(() =>
      expect(prop<Components.Schemas.ConfigurationEntity>("basic", "configurationEntity").sp).toMatchObject({
        name: "Uusi palvelu",
        entityId: "https://palvelu.example.test",
      })
    );
  });
});
