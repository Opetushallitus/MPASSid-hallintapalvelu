import type { Components } from "@/api";
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cloneDeep } from "lodash";
import { useState } from "react";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Attributes from "./Attributes";
import { dataConfiguration, type UiConfiguration } from "../../config";

// ---------------------------------------------------------------------------
// The real AttributeForm (and its InputForm / SwitchForm / MultiSelectForm
// children) renders, but its latest props are recorded per
// "<attributeType>.<name>", so a test can also inspect the configuration an
// attribute was rendered with or call its callbacks like the form would.
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const forms = vi.hoisted(() => ({}) as Record<string, Props>);
vi.mock("./Form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./Form")>();
  const AttributeForm = actual.default;
  return {
    ...actual,
    default: (props: Parameters<typeof AttributeForm>[0]) => {
      forms[`${props.attributeType}.${props.uiConfiguration.name}`] = props as unknown as Props;
      return <AttributeForm {...props} />;
    },
  };
});

// Every keystroke re-renders the whole form: allow for a loaded machine.
configure({ asyncUtilTimeout: 4000 });
vi.setConfig({ testTimeout: 20000 });

beforeEach(() => {
  Object.keys(forms).forEach((name) => delete forms[name]);
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_OID = "1.2.246.562.99.00000000001";
/** The organisation with extra (oid-specific) azure user attributes in config.ts. */
const SPECIAL_OID = "1.2.246.562.10.21199106507";

const attribute = (type: "data" | "user", name: string, content: string): Components.Schemas.Attribute => ({
  type,
  name,
  content,
});

const wilma = (attributes: Components.Schemas.Attribute[] = []): Components.Schemas.ConfigurationEntity => ({
  attributes,
  idp: { type: "wilma", flowName: "Wilma", idpId: "wilma_x", institutionTypes: [11] },
});

const idp = (type: string, attributes: Components.Schemas.Attribute[] = []): Components.Schemas.ConfigurationEntity => ({
  attributes,
  idp: { type, flowName: "Flow", idpId: `${type}_x`, institutionTypes: [11] },
});

/** All mandatory azure data attributes filled. */
const azureData = () => [
  attribute("data", "clientId", "11111111-2222-3333-4444-555555555555"),
  attribute("data", "clientKey", "salainen"),
  attribute("data", "tenantId", "66666666-7777-8888-9999-000000000000"),
  attribute("data", "azureApplicationIdUri", "api://mpassid"),
  attribute("data", "datasource", "azurev4"),
];

// ---------------------------------------------------------------------------
// Harness: owns the state IntegrationDetails owns (the shared attributes
// list, the configurationEntity draft, one validity flag per <Attributes>)
// with stable setters. Like IntegrationDetails it can render a data and a
// user instance that share setAttributes.
// ---------------------------------------------------------------------------

type AttributeType = "data" | "user";

interface Latest {
  attributes: Components.Schemas.Attribute[];
  entity: Components.Schemas.ConfigurationEntity;
  /** Every distinct canSave value per attribute type, in order. */
  canSave: Record<AttributeType, boolean[]>;
  /** Every value setNewConfigurationEntityData was called with. */
  entityCalls: Components.Schemas.ConfigurationEntity[];
  /** Every attribute addInitAttributes was called with. */
  initCalls: Components.Schemas.Attribute[];
  setEnvironment: (environment: number) => void;
}

interface Options {
  types?: AttributeType[];
  environment?: number;
  oid?: string;
  configuration?: UiConfiguration[];
}

const renderAttributes = (
  configurationEntity: Components.Schemas.ConfigurationEntity,
  { types = ["data"], environment = 1, oid = ORG_OID, configuration = dataConfiguration }: Options = {}
) => {
  const type = configurationEntity.idp?.type ?? configurationEntity.sp?.type ?? "unknown";
  const role = configurationEntity.idp ? "idp" : "sp";
  const latest: Latest = {
    attributes: [],
    entity: {},
    canSave: { data: [], user: [] },
    entityCalls: [],
    initCalls: [],
    setEnvironment: () => {},
  };

  function Harness() {
    const [entity, setEntity] = useState(() => cloneDeep(configurationEntity));
    const [setEntityRecorded] = useState(
      () => (value: Components.Schemas.ConfigurationEntity) => {
        latest.entityCalls.push(cloneDeep(value));
        setEntity(value);
      }
    );
    // IntegrationDetails starts the list from configurationEntity.attributes.
    const [attributes, setAttributes] = useState(() => cloneDeep(configurationEntity.attributes ?? []));
    const [dataCanSave, setDataCanSave] = useState(true);
    const [userCanSave, setUserCanSave] = useState(true);
    const [initAttributes] = useState<string[]>([]);
    const [addInitAttributes] = useState(() => (value: Components.Schemas.Attribute) => {
      latest.initCalls.push(value);
    });
    const [currentEnvironment, setCurrentEnvironment] = useState(environment);
    latest.setEnvironment = setCurrentEnvironment;
    latest.attributes = attributes;
    latest.entity = entity;
    if (latest.canSave.data.at(-1) !== dataCanSave) latest.canSave.data.push(dataCanSave);
    if (latest.canSave.user.at(-1) !== userCanSave) latest.canSave.user.push(userCanSave);

    return (
      <>
        {types.map((attributeType) => (
          <Attributes
            key={attributeType}
            dataConfiguration={configuration}
            newConfigurationEntityData={entity}
            setNewConfigurationEntityData={setEntityRecorded}
            attributes={attributes}
            setAttributes={setAttributes}
            initAttributes={initAttributes}
            addInitAttributes={addInitAttributes}
            attributeType={attributeType}
            environment={currentEnvironment}
            type={type}
            role={role}
            oid={oid}
            setCanSave={attributeType === "data" ? setDataCanSave : setUserCanSave}
          />
        ))}
      </>
    );
  }

  const utils = render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <Harness />
    </IntlProvider>
  );
  return { ...utils, latest };
};

const lastCanSave = (latest: Latest, type: AttributeType = "data") => latest.canSave[type].at(-1);

const formProp = <T,>(key: string, prop: string) => forms[key][prop] as T;

/** Names of the attributes whose AttributeForm rendered, in order. */
const formNames = (type: AttributeType) =>
  Object.keys(forms)
    .filter((key) => key.startsWith(`${type}.`))
    .map((key) => key.slice(type.length + 1));

const input = (name: string) => screen.getByPlaceholderText(`Lisää ${name}`);

/** The row (label + form) of one attribute. */
const row = (name: string) =>
  screen.getByText(name, { selector: "span" }).closest(".MuiGrid-container") as HTMLElement;

const content = (latest: Latest, name: string) => latest.attributes.find((a) => a.name === name)?.content;

/** Lets the effects queued by the render-time initialization run. */
const settled = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("wilma (data)", () => {
  it("näyttää datasource-valinnan ja hostname-kentän; uniqueId (ei näkyvä) puuttuu", async () => {
    const { latest } = renderAttributes(wilma());
    await waitFor(() => expect(content(latest, "datasource")).toBe("wilma"));

    expect(formNames("data")).toEqual(["datasource", "hostname"]);
    expect(input("hostname")).toBeInTheDocument();
    expect(within(row("datasource")).getByRole("combobox")).toHaveTextContent("wilma");
    // The datasource helper text (validation 'expert').
    expect(screen.getByText("VAROITUS älä koske tähän jollei erikseen ohjeistettu!")).toBeInTheDocument();
    expect(screen.queryByText("uniqueId")).not.toBeInTheDocument();
  });

  it("uusi wilma: datasourcen oletus (wilma) yhdistetään attribuutteihin, luonnokseen ei kirjoiteta; pakollinen hostname puuttuu -> ei voi tallentaa", async () => {
    const { latest } = renderAttributes(wilma());

    await waitFor(() =>
      expect(latest.attributes).toEqual([{ type: "data", content: "wilma", name: "datasource" }])
    );
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    // IntegrationDetails copies attributes to the draft in its own effect.
    expect(latest.entityCalls).toEqual([]);
    expect(latest.entity.attributes).toEqual([]);
    // addInitAttributes is called only for switch attributes without a value.
    expect(latest.initCalls).toEqual([]);
  });

  it("olemassa olevan wilman arvot säilyvät ja näytetään; kaikki pakolliset -> voi tallentaa", async () => {
    const attributes = [attribute("data", "datasource", "wilmav2"), attribute("data", "hostname", "wilma.example.fi")];
    const { latest } = renderAttributes(wilma(attributes));
    await settled();

    expect(latest.canSave.data).toEqual([true]);
    expect(latest.attributes).toEqual(attributes);
    expect(latest.entityCalls).toEqual([]);
    expect(input("hostname")).toHaveValue("wilma.example.fi");
    expect(within(row("datasource")).getByRole("combobox")).toHaveTextContent("wilmav2");
  });

  it("hostnamen kirjoitus lisää attribuutin listaan ja luonnokseen ja sallii tallennuksen", async () => {
    const user = userEvent.setup();
    const { latest } = renderAttributes(wilma());
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    await user.type(input("hostname"), "wilma.example.fi");

    await waitFor(() => expect(content(latest, "hostname")).toBe("wilma.example.fi"));
    expect(latest.attributes).toEqual([
      { type: "data", content: "wilma", name: "datasource" },
      { type: "data", name: "hostname", content: "wilma.example.fi" },
    ]);
    expect(latest.entity.attributes).toEqual(latest.attributes);
    expect(latest.entityCalls.at(-1)?.attributes).toEqual(latest.attributes);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });

  it("virheellinen hostname tallentuu attribuuttiin mutta estää tallennuksen", async () => {
    const user = userEvent.setup();
    const attributes = [attribute("data", "datasource", "wilma"), attribute("data", "hostname", "wilma.example.fi")];
    const { latest } = renderAttributes(wilma(attributes));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.type(input("hostname"), "!");

    await waitFor(() => expect(content(latest, "hostname")).toBe("wilma.example.fi!"));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    expect(screen.getByText("hostname ei ole validi!")).toBeInTheDocument();
  });

  it("pakollisen hostnamen tyhjennys estää tallennuksen", async () => {
    const user = userEvent.setup();
    const attributes = [attribute("data", "datasource", "wilma"), attribute("data", "hostname", "wilma.example.fi")];
    const { latest } = renderAttributes(wilma(attributes));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.clear(input("hostname"));

    await waitFor(() => expect(content(latest, "hostname")).toBe(""));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });

  it("datasourcen vaihto valikosta päivittää attribuutin ja luonnoksen", async () => {
    const user = userEvent.setup();
    const attributes = [attribute("data", "datasource", "wilma"), attribute("data", "hostname", "wilma.example.fi")];
    const { latest } = renderAttributes(wilma(attributes));
    await settled();

    await user.click(within(row("datasource")).getByRole("combobox"));
    await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "wilmav2" }));

    await waitFor(() => expect(content(latest, "datasource")).toBe("wilmav2"));
    expect(latest.entity.attributes?.find((a) => a.name === "datasource")?.content).toBe("wilmav2");
    expect(lastCanSave(latest)).toBe(true);
  });

  it("sama arvo uudelleen ei kutsu settereitä", async () => {
    const attributes = [attribute("data", "datasource", "wilma"), attribute("data", "hostname", "wilma.example.fi")];
    const { latest } = renderAttributes(wilma(attributes));
    await settled();

    act(() =>
      formProp<(name: string, value: string, type: string) => void>("data.hostname", "onUpdate")(
        "hostname",
        "wilma.example.fi",
        "data"
      )
    );

    expect(latest.entityCalls).toEqual([]);
    expect(latest.attributes).toEqual(attributes);
  });

  it("ilman configurationEntity.attributes-listaa käyttäjän syöte ei tallennu attribuutteihin eikä luonnokseen", async () => {
    const user = userEvent.setup();
    const { attributes: _none, ...withoutAttributes } = wilma();
    const { latest } = renderAttributes(withoutAttributes);
    await waitFor(() => expect(content(latest, "datasource")).toBe("wilma"));

    await user.type(input("hostname"), "wilma.example.fi");

    expect(content(latest, "hostname")).toBeUndefined();
    expect(latest.entityCalls).toEqual([]);
    expect(latest.entity.attributes).toBeUndefined();
    expect(lastCanSave(latest)).toBe(false);
  });

  // Korjattu: idp-kentästä (wilma: idp.hostname) alustettu arvo lisätään
  // attribuutteihin samoin kuin oletusarvot, joten tallennus sallitaan.
  it("idp-kentästä alustettu pakollinen arvo lisätään attribuutteihin ja sallii tallennuksen", async () => {
    const entity = wilma();
    (entity.idp as Components.Schemas.Wilma).hostname = "wilma.example.fi";
    const { latest } = renderAttributes(entity);
    await waitFor(() => expect(content(latest, "datasource")).toBe("wilma"));
    expect(input("hostname")).toHaveValue("wilma.example.fi");

    await waitFor(() => expect(content(latest, "hostname")).toBe("wilma.example.fi"));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });
});

describe("azure (data + user)", () => {
  it("näyttää azuren data- ja user-kentät määritysjärjestyksessä; piilotetut puuttuvat", async () => {
    const { latest } = renderAttributes(idp("azure"), { types: ["data", "user"] });
    await waitFor(() => expect(content(latest, "datasource")).toBe("azurev4"));

    expect(formNames("data")).toEqual([
      "clientId",
      "clientKey",
      "clientKeyValidUntil",
      "datasource",
      "tenantId",
      "azureApplicationIdUri",
    ]);
    expect(formNames("user")).toEqual([
      "firstName",
      "surname",
      "groups",
      "learningMaterialsCharges",
      "schoolIds",
      "nickname",
      "groupLevels",
      "learnerId",
      "roles",
    ]);
    // entityId (data) and username (user) are not visible for any type.
    expect(screen.queryByText("entityId")).not.toBeInTheDocument();
    expect(screen.queryByText("username")).not.toBeInTheDocument();
    // oid-specific attributes only for their organisation.
    expect(screen.queryByText("schoolIdStatic")).not.toBeInTheDocument();
    expect(input("clientKey")).toBeInTheDocument();
    expect(input("roles")).toBeInTheDocument();
  });

  it("uusi azure: vain datasource saa oletuksen (azurev4); pakolliset puuttuvat molemmissa -> ei voi tallentaa", async () => {
    const { latest } = renderAttributes(idp("azure"), { types: ["data", "user"] });

    await waitFor(() =>
      expect(latest.attributes).toEqual([{ type: "data", content: "azurev4", name: "datasource" }])
    );
    await waitFor(() => expect(lastCanSave(latest, "data")).toBe(false));
    await waitFor(() => expect(lastCanSave(latest, "user")).toBe(false));
  });

  it("pakollisten data-kenttien täyttö sallii tallennuksen; valinnaiset saavat jäädä tyhjiksi", async () => {
    const user = userEvent.setup();
    const { latest } = renderAttributes(idp("azure"));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    await user.type(input("clientId"), "client-1");
    await user.type(input("clientKey"), "salainen");
    await user.type(input("tenantId"), "tenant-1");
    expect(lastCanSave(latest)).toBe(false);
    await user.type(input("azureApplicationIdUri"), "api://mpassid");

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(latest.entity.attributes?.map((a) => a.name)).toEqual([
      "datasource",
      "clientId",
      "clientKey",
      "tenantId",
      "azureApplicationIdUri",
    ]);
  });

  it("valinnaisen clientKeyValidUntil-päivämäärän validointi: väärä muoto estää tallennuksen, pp-kk-vvvv kelpaa", async () => {
    const user = userEvent.setup();
    const { latest } = renderAttributes(idp("azure", azureData()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.type(input("clientKeyValidUntil"), "2030-12-31");
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    expect(screen.getByText("Kentän pitää olla pp-kk-vvvv muodossa!")).toBeInTheDocument();

    await user.clear(input("clientKeyValidUntil"));
    await user.type(input("clientKeyValidUntil"), "31-12-2030");
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(content(latest, "clientKeyValidUntil")).toBe("31-12-2030");
  });

  it("valinnaisen kentän validaattori hyväksyy tyhjän arvon, pakollisen ei tarkista tyhjyyttä (ei validointisääntöjä)", async () => {
    renderAttributes(idp("azure", azureData()));
    await waitFor(() => expect(forms["data.clientKeyValidUntil"]).toBeDefined());
    expect(formProp<(value: string) => boolean>("data.clientKeyValidUntil", "onValidate")("")).toBe(true);
    expect(formProp<(value: string) => boolean>("data.clientKeyValidUntil", "onValidate")("x")).toBe(false);
    expect(formProp<(value: string) => boolean>("data.clientId", "onValidate")("")).toBe(true);
  });

  it("user-kentän kirjoitus lisää user-tyyppisen attribuutin", async () => {
    const user = userEvent.setup();
    const { latest } = renderAttributes(idp("azure", azureData()), { types: ["data", "user"] });
    await waitFor(() => expect(lastCanSave(latest, "data")).toBe(true));

    await user.type(input("firstName"), "givenName");

    await waitFor(() => expect(latest.attributes.at(-1)).toEqual({ type: "user", name: "firstName", content: "givenName" }));
    expect(latest.entity.attributes?.at(-1)).toEqual({ type: "user", name: "firstName", content: "givenName" });
    expect(lastCanSave(latest, "user")).toBe(false);
  });

  it("kaikki pakolliset user-attribuutit -> user-osio voi tallentaa", async () => {
    const userAttributes = ["firstName", "surname", "schoolIds", "learnerId", "roles"].map((name) =>
      attribute("user", name, `extension_${name}`)
    );
    const { latest } = renderAttributes(idp("azure", [...azureData(), ...userAttributes]), { types: ["data", "user"] });
    await settled();
    expect(latest.canSave.user).toEqual([true]);
    expect(latest.canSave.data).toEqual([true]);
    expect(input("firstName")).toHaveValue("extension_firstName");
  });

  it("erityisorganisaatiolle (oid) näytetään sen omat user-attribuutit; customTeacherRole on piilotettu", async () => {
    renderAttributes(idp("azure"), { types: ["user"], oid: SPECIAL_OID });
    await settled();

    expect(formNames("user")).toEqual([
      "firstName",
      "surname",
      "groups",
      "schoolIdStatic",
      "learningMaterialsCharges",
      "schoolIds",
      "nickname",
      "studentGroupGuid",
      "groupLevels",
      "customStudentRole",
      "learnerId",
      "roles",
    ]);
    expect(screen.queryByText("customTeacherRole")).not.toBeInTheDocument();
    // schoolIdStatic is not editable for azure: no input.
    expect(screen.getByText("schoolIdStatic")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Lisää schoolIdStatic")).not.toBeInTheDocument();
    expect(input("studentGroupGuid")).toBeInTheDocument();
  });
});

describe("muut tyypit", () => {
  it.each(["adfs", "gsuite"])(
    "%s: user-attribuutit saavat tyyppikohtaiset oletukset, mitään ei näytetä ja tallennus sallitaan",
    async (type) => {
      const { latest } = renderAttributes(idp(type), { types: ["data", "user"] });

      await waitFor(() => expect(latest.attributes).toHaveLength(10));
      expect(latest.attributes).toEqual([
        { type: "user", content: "firstName", name: "firstName" },
        { type: "user", content: "surname", name: "surname" },
        { type: "user", content: "class", name: "groups" },
        { type: "user", content: "learningMaterialsCharge", name: "learningMaterialsCharges" },
        { type: "user", content: "schoolCode", name: "schoolIds" },
        { type: "user", content: "nickName", name: "nickname" },
        { type: "user", content: "classLevel", name: "groupLevels" },
        { type: "user", content: "mpassUserIdentity", name: "username" },
        { type: "user", content: "learnerId", name: "learnerId" },
        { type: "user", content: "userRole", name: "roles" },
      ]);
      expect(formNames("data")).toEqual([]);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(latest.canSave.user).toEqual([true]);
      expect(latest.canSave.data).toEqual([true]);
    }
  );

  it("opinsys: clientId:n validointi (binddn) estää tallennuksen väärällä arvolla", async () => {
    const user = userEvent.setup();
    const attributes = [
      attribute("data", "clientId", "uid=mpass,ou=apps,dc=example,dc=fi"),
      attribute("data", "clientKey", "salainen"),
      attribute("data", "tenantId", "tenant"),
      attribute("data", "datasource", "opinsys"),
    ];
    const { latest } = renderAttributes(idp("opinsys", attributes));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(formNames("data")).toEqual(["clientId", "clientKey", "datasource", "tenantId"]);

    await user.clear(input("clientId"));
    await user.type(input("clientId"), "ei dn");

    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    expect(screen.getByText("bind dn ei ole validi!")).toBeInTheDocument();
  });

  it("saml (data): allowtestlearnerid-kytkin alustetaan 'false' ja vaihto tallentaa 'true'", async () => {
    const user = userEvent.setup();
    const entity: Components.Schemas.ConfigurationEntity = { attributes: [], sp: { type: "saml", name: "Palvelu" } };
    const { latest } = renderAttributes(entity);
    await waitFor(() =>
      expect(latest.attributes).toEqual([{ type: "data", content: "false", name: "allowtestlearnerid" }])
    );
    const toggle = within(row("allowtestlearnerid")).getByRole("switch");
    expect(toggle).not.toBeChecked();
    expect(latest.canSave.data).toEqual([true]);

    await user.click(toggle);

    await waitFor(() => expect(content(latest, "allowtestlearnerid")).toBe("true"));
    expect(latest.entity.attributes).toEqual([{ type: "data", content: "true", name: "allowtestlearnerid" }]);
    expect(toggle).toBeChecked();
  });
});

describe("ympäristö- ja organisaatiokohtaiset määritykset", () => {
  // Real config has no environment-specific data/user items for an idp; add
  // some the way devUiConfiguration.ts does (appended to config.ts).
  const optionalTenantIdInTest: UiConfiguration = {
    name: "tenantId",
    type: "data",
    environment: 0,
    mandatory: false,
    array: false,
    switch: false,
    validation: [],
    integrationType: [{ name: "azure", editable: true, visible: true }],
  };
  const testOnly: UiConfiguration = {
    name: "testOnly",
    type: "data",
    environment: 0,
    mandatory: false,
    array: false,
    switch: false,
    validation: [],
    integrationType: [{ name: "azure", editable: true, visible: true }],
  };
  const configuration = [...dataConfiguration, optionalTenantIdInTest, testOnly];
  const withoutTenantId = () => azureData().filter((a) => a.name !== "tenantId");

  it("ympäristökohtainen määritys korvaa samannimisen yleisen ja ympäristön oma kenttä näytetään", async () => {
    const { latest } = renderAttributes(idp("azure", withoutTenantId()), { environment: 0, configuration });
    await settled();

    expect(formProp<UiConfiguration>("data.tenantId", "uiConfiguration").environment).toBe(0);
    expect(input("testOnly")).toBeInTheDocument();
    // tenantId is optional in this environment.
    expect(lastCanSave(latest)).toBe(true);
  });

  it("muussa ympäristössä käytetään yleistä määritystä eikä ympäristön omaa kenttää näytetä", async () => {
    const { latest } = renderAttributes(idp("azure", withoutTenantId()), { environment: 1, configuration });
    await settled();

    expect(formProp<UiConfiguration>("data.tenantId", "uiConfiguration").environment).toBeUndefined();
    expect(screen.queryByPlaceholderText("Lisää testOnly")).not.toBeInTheDocument();
    expect(lastCanSave(latest)).toBe(false);
  });

  it("ympäristön vaihto vaihtaa näytettävät kentät", async () => {
    const { latest } = renderAttributes(idp("azure", withoutTenantId()), { environment: 1, configuration });
    await settled();
    expect(screen.queryByPlaceholderText("Lisää testOnly")).not.toBeInTheDocument();

    act(() => latest.setEnvironment(0));

    expect(await screen.findByPlaceholderText("Lisää testOnly")).toBeInTheDocument();
    expect(formProp<UiConfiguration>("data.tenantId", "uiConfiguration").environment).toBe(0);
  });

  // Korjattu: validoinnin määritykset kerätään joka renderöinnillä uudelleen,
  // joten ympäristön vaihdon jälkeen käytetään uuden ympäristön määritystä.
  it("ympäristön vaihdon jälkeen validointi käyttää uuden ympäristön määritystä", async () => {
    const { latest } = renderAttributes(idp("azure", withoutTenantId()), { environment: 1, configuration });
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    act(() => latest.setEnvironment(0));

    await waitFor(() => expect(formProp<UiConfiguration>("data.tenantId", "uiConfiguration").environment).toBe(0));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });
});
