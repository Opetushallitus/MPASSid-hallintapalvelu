import type { Components } from "@/api";
import { integrationTypesDefault } from "@/config";
import { render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IntegrationDetails, { integrationTypes, UniqueIdValue } from ".";

// ---------------------------------------------------------------------------
// Child components with their own logic are replaced by stubs that record
// their props. DataRow (the label/value rows) is real.
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);

// Nothing from "@/api" is used at runtime here (IntegrationsTable imports
// hooks from it, but only getRole and the messages are used).
vi.mock("@/api", () => ({}));

const me = vi.hoisted(() => ({ current: {} as { groups?: string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

vi.mock("./Role", () => ({
  default: (props: Props) => {
    children.role = props;
    return <div data-testid="role" />;
  },
}));
vi.mock("./Metadata", () => ({
  default: (props: Props) => {
    children.metadata = props;
    return <div data-testid="metadata" />;
  },
}));
vi.mock("./Attributes", () => ({
  default: (props: Props) => {
    children[`attributes-${String(props.type)}`] = props;
    return <div data-testid={`attributes-${String(props.type)}`} />;
  },
}));
vi.mock("./UniqueId", () => ({
  default: (props: Props) => {
    children.uniqueId = props;
    return <span data-testid="unique-id" />;
  },
}));
vi.mock("./EditIntegrationButton", () => ({
  default: (props: Props) => {
    children.edit = props;
    return <div data-testid="edit-button" />;
  },
}));

beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  me.current = {};
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_OID = "1.2.246.562.10.00000000001";
const ORG = { oid: ORG_OID, name: "Mansikkalan testi kunta", ytunnus: "1234567-8" };
const LOGO = "https://example.test/logo.png";
const ATTRIBUTES = [
  { name: "hostname", type: "data", content: "koulu.inschool.fi" },
  { name: "firstName", type: "user", content: "etunimi" },
] as Components.Schemas.Attribute[];

// deploymentPhase null -> field left undefined.
const idp = (type = "wilma", deploymentPhase: number | null = 1): Components.Schemas.Integration => ({
  id: 5,
  deploymentPhase: deploymentPhase ?? undefined,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes: ATTRIBUTES,
    idp: { type, logoUrl: LOGO, flowName: "x", idpId: "x" },
  },
  discoveryInformation: {
    customDisplayName: "Näyttönimi",
    showSchools: true,
    schools: ["30001", "30002"],
    excludedSchools: [],
    title: "Otsikko",
  },
});

const sp = (type = "saml"): Components.Schemas.Integration => ({
  id: 6,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes: ATTRIBUTES,
    sp: { type, name: "Palvelu" } as Components.Schemas.ServiceProvider,
  },
});

const set = (): Components.Schemas.Integration => ({
  id: 7,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: { set: { type: "set", name: "Palvelukokonaisuus" } },
});

const renderDetails = (integration: Components.Schemas.Integration) =>
  render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter>
        <IntegrationDetails integration={integration} />
      </MemoryRouter>
    </IntlProvider>
  );

/** The value next to a DataRow label (the attribute name when untranslated). */
const valueOf = (label: string) =>
  screen.getByText(label, { selector: "span" }).closest(".MuiGrid-root")!
    .nextElementSibling as HTMLElement;

// "Organisaation tiedot" is a div, so match the h2 typography instead of roles.
const headings = () =>
  Array.from(document.querySelectorAll(".MuiTypography-h2")).map((h) => h.textContent);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("idp", () => {
  it("osiot ja organisaation tiedot", () => {
    renderDetails(idp());

    expect(headings()).toEqual([
      "Organisaation tiedot",
      "Oppilaitoksen valintanäkymän tiedot",
      "Integraation perustiedot",
    ]);
    expect(valueOf("name")).toHaveTextContent("Mansikkalan testi kunta");
    expect(valueOf("oid")).toHaveTextContent(ORG_OID);
    expect(valueOf("ytunnus")).toHaveTextContent("1234567-8");
    expect(screen.getByAltText("organisaation logo")).toHaveAttribute("src", LOGO);
  });

  it("valintanäkymän tiedot", () => {
    renderDetails(idp());

    expect(screen.getByText("Ympäristö").closest(".MuiGrid-root")!.nextElementSibling).toHaveTextContent(
      "Tuotanto"
    );
    expect(valueOf("customDisplayName")).toHaveTextContent("Näyttönimi");
    expect(valueOf("showSchools")).toHaveTextContent("Kyllä");
    expect(valueOf("schools")).toHaveTextContent("3000130002");
    expect(valueOf("excludedSchools")).toHaveTextContent("–");
    expect(valueOf("title")).toHaveTextContent("Otsikko");
  });

  it.each([
    [0, "Testi"],
    [1, "Tuotanto"],
    [2, "Tuotanto-Testi"],
    [3, "Tuntematon"],
    [null, "Tuntematon"],
  ])("ympäristö %s näytetään tekstinä %s", (deploymentPhase, text) => {
    renderDetails(idp("wilma", deploymentPhase));
    expect(screen.getByText("Ympäristö").closest(".MuiGrid-root")!.nextElementSibling).toHaveTextContent(
      new RegExp(`^${text}$`)
    );
  });

  it("perustiedot: id, jäsentyyppi ja yksilöllinen tunniste", () => {
    renderDetails(idp());

    expect(valueOf("id")).toHaveTextContent(/^5$/);
    expect(screen.getByText("Jäsentyyppi").closest(".MuiGrid-root")!.nextElementSibling).toHaveTextContent(
      "OKJ (Opetuksen ja koulutuksen järjestäjä)"
    );
    expect(screen.getByText("Yksilöllinen tunniste")).toBeInTheDocument();
    expect(children.uniqueId).toEqual({
      configurationEntity: idp().configurationEntity,
      role: "idp",
      ValueComponent: UniqueIdValue,
    });
  });

  it("roolikohtaiset tiedot ja metatiedot saavat integraation", () => {
    const integration = idp();
    renderDetails(integration);
    expect(children.role).toEqual({ integration });
    expect(children.metadata).toEqual({
      configurationEntity: integration.configurationEntity,
      role: "idp",
    });
  });

  it.each(["wilma", "opinsys", "adfs", "gsuite"])(
    "%s: vain data-attribuutit, ei Attribuutit-osiota",
    (type) => {
      renderDetails(idp(type));
      expect(children["attributes-data"]).toEqual({ attributes: ATTRIBUTES, type: "data" });
      expect(children["attributes-user"]).toBeUndefined();
      expect(screen.queryByText("Attribuutit")).not.toBeInTheDocument();
    }
  );

  it("azure: myös käyttäjäattribuutit Attribuutit-otsikon alla", () => {
    renderDetails(idp("azure"));
    expect(screen.getByRole("heading", { name: "Attribuutit" })).toBeInTheDocument();
    expect(children["attributes-user"]).toEqual({ attributes: ATTRIBUTES, type: "user" });
    expect(children["attributes-data"]).toEqual({ attributes: ATTRIBUTES, type: "data" });
  });

  it("puuttuvat attribuutit välitetään tyhjänä listana", () => {
    const integration = idp("azure");
    delete integration.configurationEntity!.attributes;
    renderDetails(integration);
    expect(children["attributes-data"].attributes).toEqual([]);
    expect(children["attributes-user"].attributes).toEqual([]);
  });

  it("ilman logoa logoriviä ei näytetä kuvana", () => {
    const integration = idp();
    delete integration.configurationEntity!.idp!.logoUrl;
    renderDetails(integration);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("logoUrl")).toBeInTheDocument();
  });
});

describe("sp", () => {
  it("ei logoa eikä valintanäkymän tietoja, jäsentyyppi PI", () => {
    renderDetails(sp());

    expect(headings()).toEqual(["Organisaation tiedot", "Integraation perustiedot"]);
    expect(screen.queryByAltText("organisaation logo")).not.toBeInTheDocument();
    expect(screen.queryByText("Ympäristö")).not.toBeInTheDocument();
    expect(screen.getByText("Jäsentyyppi").closest(".MuiGrid-root")!.nextElementSibling).toHaveTextContent(
      "PI (Palveluintegraatio)"
    );
    expect(children.uniqueId.role).toBe("sp");
    expect(children.metadata.role).toBe("sp");
    expect(children["attributes-data"]).toBeDefined();
    expect(children["attributes-user"]).toBeUndefined();
  });
});

describe("set", () => {
  it("vain organisaation tiedot, rooli- ja metatiedot", () => {
    const integration = set();
    renderDetails(integration);

    expect(headings()).toEqual(["Organisaation tiedot"]);
    expect(screen.queryByText("Jäsentyyppi")).not.toBeInTheDocument();
    expect(children.uniqueId).toBeUndefined();
    expect(children.role).toEqual({ integration });
    expect(children.metadata).toEqual({
      configurationEntity: integration.configurationEntity,
      role: "set",
    });
    expect(children["attributes-data"]).toEqual({ attributes: [], type: "data" });
  });
});

describe("muokkauspainike", () => {
  const TALLENTAJA = `APP_MPASSID_TALLENTAJA_${ORG_OID}`;
  const PALVELU_TALLENTAJA = `APP_MPASSID_PALVELU_TALLENTAJA_${ORG_OID}`;

  it("ei näytetä ilman ryhmiä", () => {
    renderDetails(idp());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });

  it.each(integrationTypesDefault.typesOKJ)(
    "idp (%s) + organisaation tallentaja: näytetään",
    async (type) => {
      me.current = { groups: [TALLENTAJA] };
      const integration = idp(type);
      renderDetails(integration);
      expect(await screen.findByTestId("edit-button")).toBeInTheDocument();
      expect(children.edit).toEqual({ integration });
    }
  );

  it("idp, tuntematon tyyppi: ei näytetä", async () => {
    me.current = { groups: [TALLENTAJA] };
    renderDetails(idp("google"));
    await waitFor(() => expect(children.role).toBeDefined());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });

  it("idp + palvelutallentaja: ei näytetä", async () => {
    me.current = { groups: [PALVELU_TALLENTAJA] };
    renderDetails(idp());
    await waitFor(() => expect(children.role).toBeDefined());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });

  it("idp + toisen organisaation tallentaja: ei näytetä", async () => {
    me.current = { groups: ["APP_MPASSID_TALLENTAJA_1.2.246.562.10.99999999999"] };
    renderDetails(idp());
    await waitFor(() => expect(children.role).toBeDefined());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });

  it.each([
    ["saml", TALLENTAJA],
    ["oidc", TALLENTAJA],
    ["saml", PALVELU_TALLENTAJA],
    ["oidc", PALVELU_TALLENTAJA],
  ])("sp (%s) + %s: näytetään", async (type, group) => {
    me.current = { groups: [group] };
    renderDetails(sp(type));
    expect(await screen.findByTestId("edit-button")).toBeInTheDocument();
  });

  it("sp, tuntematon tyyppi: ei näytetä", async () => {
    me.current = { groups: [TALLENTAJA] };
    renderDetails(sp("ws-fed"));
    await waitFor(() => expect(children.role).toBeDefined());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });

  it("set: ei näytetä koskaan", async () => {
    me.current = { groups: [TALLENTAJA, PALVELU_TALLENTAJA] };
    renderDetails(set());
    await waitFor(() => expect(children.role).toBeDefined());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });

  it("organisaation oid puuttuu: ei näytetä", async () => {
    me.current = { groups: ["APP_MPASSID_TALLENTAJA_undefined"] };
    const integration = idp();
    integration.organization = { name: "Nimetön" } as Components.Schemas.Integration["organization"];
    renderDetails(integration);
    await waitFor(() => expect(children.role).toBeDefined());
    expect(screen.queryByTestId("edit-button")).not.toBeInTheDocument();
  });
});

describe("integrationTypes", () => {
  it("on kopio oletustyypeistä", () => {
    expect(integrationTypes).toEqual(integrationTypesDefault);
    expect(integrationTypes).not.toBe(integrationTypesDefault);
    // Shallow copy: the arrays are shared with the config.
    expect(integrationTypes.typesOKJ).toBe(integrationTypesDefault.typesOKJ);
  });
});

describe("UniqueIdValue", () => {
  const renderValue = (ui: React.ReactElement) =>
    render(
      <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
        <div data-testid="value">{ui}</div>
      </IntlProvider>
    );

  it("arvo ja nimi suluissa", () => {
    renderValue(
      <UniqueIdValue name="entityId">
        <Value value="https://idp.example.test" />
      </UniqueIdValue>
    );
    expect(screen.getByTestId("value")).toHaveTextContent("https://idp.example.test (entityId)");
  });

  it("tyhjä arvo näytetään viivana", () => {
    renderValue(
      <UniqueIdValue name="entityId">
        <Value value="" />
      </UniqueIdValue>
    );
    expect(screen.getByTestId("value")).toHaveTextContent("– (entityId)");
  });

  it("ilman lapsia näytetään viiva", () => {
    renderValue(<UniqueIdValue name="clientId" />);
    expect(screen.getByTestId("value")).toHaveTextContent("– (clientId)");
  });

  it("käännetty otsikko korvaa nimen", () => {
    renderValue(
      <UniqueIdValue name="entityId" label={{ id: "x", defaultMessage: "Entiteetti" }}>
        <Value value="abc" />
      </UniqueIdValue>
    );
    expect(screen.getByTestId("value")).toHaveTextContent("abc (Entiteetti)");
  });
});

function Value({ value }: { value: string }) {
  return <>{value}</>;
}
