import type { Components } from "@/api";
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cloneDeep } from "lodash";
import { useState } from "react";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Metadata from "./Metadata";
import { dataConfiguration } from "../../config";
import type { MetadataMap, MetadataUpdate } from "./Form/types";

// ---------------------------------------------------------------------------
// The real MetadataForm (and its InputForm / ListForm / SwitchForm /
// MultiSelectForm children) renders, but its latest props are recorded per
// attribute name, so a test can also call a callback (onUpdate / onDelete /
// onValidate) exactly like the form would.
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const forms = vi.hoisted(() => ({}) as Record<string, Props>);
vi.mock("./Form", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./Form")>();
  return {
    ...actual,
    MetadataForm: (props: Parameters<typeof actual.MetadataForm>[0]) => {
      forms[props.attribute.name] = props as unknown as Props;
      return <actual.MetadataForm {...props} />;
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
const ENTITY_ID = "https://palvelu.example.fi/saml";
const CERT = "MIIBszCCAVmgAwIBAgIUQmFzZTY0";
const ACS = { index: "1", isDefault: "true", binding: "HTTP-POST", location: "https://palvelu.example.fi/acs" };

const saml = (metadata?: MetadataMap): Components.Schemas.ConfigurationEntity => ({
  attributes: [],
  sp: {
    type: "saml",
    name: "Palvelu",
    // The schema types metadata values as objects (see Form/types.ts).
    metadata: metadata as Components.Schemas.ServiceProvider["metadata"],
  },
});

const oidc = (metadata?: MetadataMap): Components.Schemas.ConfigurationEntity => ({
  attributes: [],
  sp: {
    type: "oidc",
    name: "Palvelu",
    metadata: metadata as Components.Schemas.ServiceProvider["metadata"],
  },
});

/** A complete, saveable saml metadata (existing integration). */
const completeSaml = (): MetadataMap => ({
  entityId: ENTITY_ID,
  wantAssertionsSigned: true,
  authnRequestsSigned: false,
  signingCertificates: [CERT],
  assertionConsumerServiceUrls: [ACS],
});

/** A complete, saveable oidc metadata (existing integration). */
const completeOidc = (): MetadataMap => ({
  client_id: "id_0123456789abcdef0123456789abcdef01234567",
  client_secret: "0123456789abcdef0123456789abcdef01234567",
  grant_types: ["authorization_code"],
  response_types: ["code"],
  redirect_uris: ["https://palvelu.example.fi/callback"],
  scope: "openid profile",
  token_endpoint_auth_method: "client_secret_basic",
});

// ---------------------------------------------------------------------------
// Harness: owns the state IntegrationDetails owns (metadata, the
// configurationEntity draft, the metadata validity) with stable setters.
// ---------------------------------------------------------------------------

interface Latest {
  metadata: MetadataMap;
  entity: Components.Schemas.ConfigurationEntity;
  /** Every distinct canSave value the parent state went through, in order. */
  canSave: boolean[];
  /** Every value setNewConfigurationEntityData was called with. */
  entityCalls: Components.Schemas.ConfigurationEntity[];
  setEnvironment: (environment: number) => void;
}

interface Options {
  type?: string;
  role?: string;
  environment?: number;
  oid?: string;
  /** The parent's metadata state; IntegrationDetails starts it from sp.metadata. */
  metadata?: MetadataMap;
}

const renderMetadata = (
  configurationEntity: Components.Schemas.ConfigurationEntity,
  { type = configurationEntity.sp?.type ?? "", role = "sp", environment = 0, oid = ORG_OID, metadata }: Options = {}
) => {
  const latest: Latest = {
    metadata: {},
    entity: {},
    canSave: [],
    entityCalls: [],
    setEnvironment: () => {},
  };

  function Harness() {
    const [entity, setEntity] = useState(() => cloneDeep(configurationEntity));
    // Stable, recording setter (like the real useState setter).
    const [setEntityRecorded] = useState(
      () => (value: Components.Schemas.ConfigurationEntity) => {
        latest.entityCalls.push(cloneDeep(value));
        setEntity(value);
      }
    );
    const [metadataState, setMetadata] = useState<MetadataMap>(() =>
      cloneDeep(metadata ?? (configurationEntity.sp?.metadata as MetadataMap | undefined) ?? {})
    );
    const [canSave, setCanSave] = useState(true);
    const [currentEnvironment, setCurrentEnvironment] = useState(environment);
    latest.setEnvironment = setCurrentEnvironment;
    if (latest.canSave.at(-1) !== canSave) latest.canSave.push(canSave);
    latest.metadata = metadataState;
    latest.entity = entity;

    return (
      <Metadata
        dataConfiguration={dataConfiguration}
        newConfigurationEntityData={entity}
        setNewConfigurationEntityData={setEntityRecorded}
        configurationEntity={configurationEntity}
        role={role}
        type={type}
        setCanSave={setCanSave}
        oid={oid}
        environment={currentEnvironment}
        metadata={metadataState}
        setMetadata={setMetadata}
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

const lastCanSave = (latest: Latest) => latest.canSave.at(-1);

/** Calls a callback the given attribute's MetadataForm received. */
const formCall = (name: string, callback: string, ...args: unknown[]) =>
  act(() => (forms[name][callback] as (...a: unknown[]) => void)(...args));

const formProp = <T,>(name: string, prop: string) => forms[name][prop] as T;

/** The attribute names in the order their rows are rendered. */
const renderedNames = (names: string[]) =>
  Array.from(document.querySelectorAll("span"))
    .map((span) => span.textContent ?? "")
    .filter((text) => names.includes(text));

/** The row (label + form) of one attribute. */
const row = (name: string) =>
  screen.getByText(name, { selector: "span" }).closest(".MuiGrid-container") as HTMLElement;

const SAML_NAMES = [
  "assertionConsumerServiceUrls",
  "authnRequestsSigned",
  "encryptionCertificates",
  "entityId",
  "signingCertificates",
  "wantAssertionsSigned",
];

const OIDC_NAMES = [
  "client_id",
  "client_secret",
  "grant_types",
  "id_token_signed_response_alg",
  "redirect_uris",
  "response_types",
  "scope",
  "token_endpoint_auth_method",
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("saml: näytettävät kentät ja alustus", () => {
  it("näyttää saml-tyypin näkyvät metadata-kentät käänteisessä aakkosjärjestyksessä", async () => {
    const { latest } = renderMetadata(saml({}));
    await waitFor(() => expect(latest.metadata.authnRequestsSigned).toBe(true));

    // Sort is b.localeCompare(a): descending.
    expect(renderedNames([...SAML_NAMES, ...OIDC_NAMES, "post_logout_redirect_uris"])).toEqual(
      [...SAML_NAMES].reverse()
    );
    expect(screen.getByPlaceholderText("Lisää entityId")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Lisää uusi signingCertificates")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Lisää uusi encryptionCertificates")).toBeInTheDocument();
    // assertionConsumerServiceUrls is an object list (ObjectForm).
    expect(screen.getByPlaceholderText("Lisää location")).toBeInTheDocument();
    expect(within(row("wantAssertionsSigned")).getByRole("switch")).toBeInTheDocument();
    expect(within(row("authnRequestsSigned")).getByRole("switch")).toBeInTheDocument();
  });

  it("uusi saml (ympäristö 0): kytkimet alustetaan oletusarvoihin booleaneina, pakolliset puuttuvat -> ei voi tallentaa", async () => {
    const { latest } = renderMetadata(saml({}), { environment: 0 });

    await waitFor(() =>
      expect(latest.metadata).toEqual({ wantAssertionsSigned: false, authnRequestsSigned: true })
    );
    // The draft's sp.metadata gets the same values.
    expect(latest.entity.sp?.metadata).toEqual({ wantAssertionsSigned: false, authnRequestsSigned: true });
    expect(latest.entity.sp?.name).toBe("Palvelu");
    expect(lastCanSave(latest)).toBe(false);
    expect(within(row("wantAssertionsSigned")).getByRole("switch")).not.toBeChecked();
    expect(within(row("authnRequestsSigned")).getByRole("switch")).toBeChecked();
  });

  it("tuotantoympäristössä (1) käytetään ympäristökohtaista wantAssertionsSigned-määritystä (oletus true, ei muokattava)", async () => {
    const { latest } = renderMetadata(saml({}), { environment: 1 });

    await waitFor(() =>
      expect(latest.metadata).toEqual({ wantAssertionsSigned: true, authnRequestsSigned: true })
    );
    const configuration = formProp<{ environment?: number; integrationType: { name: string; editable: boolean }[] }>(
      "wantAssertionsSigned",
      "uiConfiguration"
    );
    expect(configuration.environment).toBe(1);
    expect(configuration.integrationType.find((t) => t.name === "saml")?.editable).toBe(false);
    expect(within(row("wantAssertionsSigned")).getByRole("switch")).toBeChecked();
  });

  it("ympäristö 0 käyttää yleistä (muokattavaa) wantAssertionsSigned-määritystä", async () => {
    renderMetadata(saml({}), { environment: 0 });
    await waitFor(() => expect(forms.wantAssertionsSigned).toBeDefined());
    const configuration = formProp<{ environment?: number; integrationType: { name: string; editable: boolean }[] }>(
      "wantAssertionsSigned",
      "uiConfiguration"
    );
    expect(configuration.environment).toBeUndefined();
    expect(configuration.integrationType.find((t) => t.name === "saml")?.editable).toBe(true);
  });

  it("olemassa olevan integraation arvot säilyvät eikä oletuksia kirjoiteta päälle; täydellinen metadata -> voi tallentaa", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));

    await waitFor(() => expect(latest.canSave).toEqual([true]));
    expect(latest.metadata).toEqual(completeSaml());
    expect(latest.entityCalls).toEqual([]);
    expect(screen.getByPlaceholderText("Lisää entityId")).toHaveValue(ENTITY_ID);
    expect(within(row("signingCertificates")).getByText(CERT)).toBeInTheDocument();
    expect(within(row("wantAssertionsSigned")).getByRole("switch")).toBeChecked();
    expect(within(row("authnRequestsSigned")).getByRole("switch")).not.toBeChecked();
  });

  it("metadata-tilasta puuttuva yksittäisarvo kopioidaan luonnoksen sp.metadatasta", async () => {
    const { entityId: _entityId, ...withoutEntityId } = completeSaml();
    const { latest } = renderMetadata(saml(completeSaml()), { metadata: withoutEntityId });
    await waitFor(() => expect(latest.metadata).toEqual(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });

  // Korjattu: luonnoksesta kopioitu taulukkoarvo asetetaan kokonaisena
  // (ennen [CERT] -> [[CERT]]).
  it("metadata-tilasta puuttuva taulukkoarvo kopioidaan luonnoksesta sisäkkäistämättä", async () => {
    const { signingCertificates: _certificates, ...withoutCertificates } = completeSaml();
    const { latest } = renderMetadata(saml(completeSaml()), { metadata: withoutCertificates });
    await waitFor(() => expect(latest.metadata.signingCertificates).toBeDefined());
    expect(latest.metadata.signingCertificates).toEqual([CERT]);
  });
});

describe("saml: käyttäjän muutokset", () => {
  it("entityId:n kirjoitus päivittää metadatan ja luonnoksen; puuttuvat pakolliset estävät tallennuksen", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(saml({}));
    await waitFor(() => expect(latest.metadata.authnRequestsSigned).toBe(true));

    await user.type(screen.getByPlaceholderText("Lisää entityId"), ENTITY_ID);

    await waitFor(() => expect(latest.metadata.entityId).toBe(ENTITY_ID));
    expect(latest.entity.sp?.metadata?.entityId).toBe(ENTITY_ID);
    expect(latest.entityCalls.at(-1)?.sp?.metadata?.entityId).toBe(ENTITY_ID);
    // signingCertificates and assertionConsumerServiceUrls are still missing.
    expect(lastCanSave(latest)).toBe(false);
  });

  it("viimeisen puuttuvan pakollisen kentän täyttö sallii tallennuksen", async () => {
    const user = userEvent.setup();
    const { entityId: _entityId, ...withoutEntityId } = completeSaml();
    const { latest } = renderMetadata(saml(withoutEntityId));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));

    await user.type(screen.getByPlaceholderText("Lisää entityId"), ENTITY_ID);

    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    expect(latest.metadata).toEqual(completeSaml());
  });

  it("pakollisen kentän tyhjennys estää tallennuksen (tyhjä merkkijono jää metadataan)", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.clear(screen.getByPlaceholderText("Lisää entityId"));

    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    expect(latest.metadata.entityId).toBe("");
    expect(latest.entity.sp?.metadata?.entityId).toBe("");
  });

  it("kytkimen vaihto tallentaa boolean-arvon", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.click(within(row("authnRequestsSigned")).getByRole("switch"));

    await waitFor(() => expect(latest.metadata.authnRequestsSigned).toBe(true));
    expect(latest.entity.sp?.metadata?.authnRequestsSigned).toBe(true);
    expect(lastCanSave(latest)).toBe(true);
  });

  it("sertifikaattikentän arvosta poistetaan PEM-otsakkeet ja rivinvaihdot ennen tallennusta", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(forms.encryptionCertificates).toBeDefined());

    await formCall(
      "encryptionCertificates",
      "onUpdate",
      "encryptionCertificates",
      `-----BEGIN CERTIFICATE-----\n${CERT}\n-----END CERTIFICATE-----\n`
    );

    await waitFor(() => expect(latest.metadata.encryptionCertificates).toEqual([CERT]));
    expect(latest.entity.sp?.metadata?.encryptionCertificates).toEqual([CERT]);
  });

  it("taulukkokentän onUpdate lisää arvon, ja sama arvo uudelleen poistaa sen (ListFormin poisto)", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await formCall("signingCertificates", "onUpdate", "signingCertificates", "TOINEN");
    await waitFor(() => expect(latest.metadata.signingCertificates).toEqual([CERT, "TOINEN"]));

    await formCall("signingCertificates", "onUpdate", "signingCertificates", CERT);
    await waitFor(() => expect(latest.metadata.signingCertificates).toEqual(["TOINEN"]));
  });

  it("viimeisen pakollisen taulukkoarvon poisto (ListFormin poistopainike) estää tallennuksen", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.click(within(row("signingCertificates")).getByRole("button", { name: "poista" }));

    await waitFor(() => expect(latest.metadata.signingCertificates).toEqual([]));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });

  it("onDelete poistaa objektilistan alkion indeksillä ja päivittää tallennettavuuden", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await formCall("assertionConsumerServiceUrls", "onDelete", "assertionConsumerServiceUrls", 0);

    await waitFor(() => expect(latest.metadata.assertionConsumerServiceUrls).toEqual([]));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
    // The deletion reaches the draft too (it used to update only the
    // metadata state, so a deletion alone was not saved).
    expect(latest.entity.sp?.metadata?.assertionConsumerServiceUrls).toEqual([]);
  });

  it("onDelete ei muuta nykyistä listaa paikallaan", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(forms.assertionConsumerServiceUrls).toBeDefined());
    const before = latest.metadata.assertionConsumerServiceUrls;

    await formCall("assertionConsumerServiceUrls", "onDelete", "assertionConsumerServiceUrls", 0);

    await waitFor(() => expect(latest.metadata.assertionConsumerServiceUrls).toEqual([]));
    expect(before).toEqual([ACS]);
  });

  it("objektilistan onUpdate lisää objektin listaan", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(forms.assertionConsumerServiceUrls).toBeDefined());
    const second = { ...ACS, index: "2", isDefault: "false", location: "https://palvelu.example.fi/acs2" };

    await formCall("assertionConsumerServiceUrls", "onUpdate", "assertionConsumerServiceUrls", second);

    await waitFor(() => expect(latest.metadata.assertionConsumerServiceUrls).toEqual([ACS, second]));
    expect(latest.entity.sp?.metadata?.assertionConsumerServiceUrls).toEqual([ACS, second]);
  });

  it("onUpdate arvolla null poistaa avaimen metadatasta", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await formCall("entityId", "onUpdate", "entityId", null as MetadataUpdate);

    await waitFor(() => expect("entityId" in latest.metadata).toBe(false));
    expect(latest.entity.sp?.metadata && "entityId" in latest.entity.sp.metadata).toBe(false);
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });

  // Korjattu: taulukkoarvon lisäys luo uuden taulukon eikä muuta edellistä
  // metadata-tilaa paikallaan.
  it("taulukkoarvon lisäys ei muuta edellistä metadata-tilaa paikallaan", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    const before = latest.metadata;
    const certificatesBefore = before.signingCertificates;

    await formCall("signingCertificates", "onUpdate", "signingCertificates", "TOINEN");
    await waitFor(() => expect(latest.metadata).not.toBe(before));

    expect(certificatesBefore).toEqual([CERT]);
  });

  it("päivitys ei muuta edellistä luonnosta (newConfigurationEntityData) paikallaan", async () => {
    const { latest } = renderMetadata(saml(completeSaml()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
    const before = latest.entity;
    const metadataBefore = before.sp?.metadata;

    await formCall("entityId", "onUpdate", "entityId", "https://uusi.example.fi");
    await waitFor(() => expect(latest.entity).not.toBe(before));

    expect(latest.entity.sp?.metadata?.entityId).toBe("https://uusi.example.fi");
    expect(before.sp?.metadata).toBe(metadataBefore);
  });
});

describe("oidc: näytettävät kentät ja alustus", () => {
  it("näyttää vain oidc:lle näkyvät kentät (post_logout_redirect_uris ja saml-kentät piilossa)", async () => {
    const { latest } = renderMetadata(oidc({}));
    await waitFor(() => expect(latest.metadata.client_id).toBeDefined());

    expect(renderedNames([...SAML_NAMES, ...OIDC_NAMES, "post_logout_redirect_uris"])).toEqual(
      [...OIDC_NAMES].reverse()
    );
    expect(screen.getByPlaceholderText("Lisää uusi redirect_uris")).toBeInTheDocument();
    // Not editable: shown as text only.
    expect(screen.queryByPlaceholderText("Lisää scope")).not.toBeInTheDocument();
    expect(within(row("scope")).getByText("openid profile")).toBeInTheDocument();
  });

  it("uusi oidc: oletusarvot, monivalinnat taulukkoina ja generoidut client_id/client_secret; ei voi tallentaa ilman redirect_uris", async () => {
    const { latest } = renderMetadata(oidc({}));

    await waitFor(() => expect(latest.metadata.client_secret).toBeDefined());
    await waitFor(() => expect(latest.metadata.client_id).toBeDefined());
    const { client_id, client_secret, ...rest } = latest.metadata;
    expect(rest).toEqual({
      grant_types: ["authorization_code"],
      response_types: ["code"],
      scope: "openid profile",
      token_endpoint_auth_method: "client_secret_basic",
    });
    // id_token_signed_response_alg: first enum value is 'null' -> not initialized.
    expect("id_token_signed_response_alg" in latest.metadata).toBe(false);
    // SHA-1 of a random number; client_id with an id_ prefix.
    expect(client_id).toMatch(/^id_[0-9a-f]{40}$/);
    expect(client_secret).toMatch(/^[0-9a-f]{40}$/);
    expect(latest.entity.sp?.metadata).toEqual(latest.metadata);
    expect(lastCanSave(latest)).toBe(false);
  });

  it("olemassa olevan oidc:n arvot säilyvät (ei uutta client_id:tä) ja täydellinen metadata -> voi tallentaa", async () => {
    const { latest } = renderMetadata(oidc(completeOidc()));
    await waitFor(() => expect(latest.canSave).toEqual([true]));
    expect(latest.metadata).toEqual(completeOidc());
    expect(latest.entityCalls).toEqual([]);
  });

  it("redirect_uris:n lisäys Enterillä tekee uudesta oidc:stä tallennettavan", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(oidc({}));
    await waitFor(() => expect(latest.metadata.client_id).toBeDefined());
    await waitFor(() => expect(latest.metadata.client_secret).toBeDefined());
    expect(lastCanSave(latest)).toBe(false);

    await user.type(screen.getByPlaceholderText("Lisää uusi redirect_uris"), "https://palvelu.example.fi/cb{Enter}");

    await waitFor(() => expect(latest.metadata.redirect_uris).toEqual(["https://palvelu.example.fi/cb"]));
    expect(latest.entity.sp?.metadata?.redirect_uris).toEqual(["https://palvelu.example.fi/cb"]);
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));
  });

  it("ympäristö 0: redirect_uris-validointi sallii http:n ja localhostin, mutta ei #-merkkiä", async () => {
    renderMetadata(oidc(completeOidc()), { environment: 0 });
    await waitFor(() => expect(forms.redirect_uris).toBeDefined());
    const validateTest = formProp<(value: string) => boolean>("redirect_uris", "onValidate");
    expect(formProp<{ validation: string[] }>("redirect_uris", "uiConfiguration").validation).toEqual(["uri", "nohash"]);
    expect(validateTest("http://localhost:8080/cb")).toBe(true);
    expect(validateTest("https://palvelu.example.fi/cb#x")).toBe(false);
  });

  it("tuotantoympäristössä (1) redirect_uris vaatii https:n eikä salli localhostia", async () => {
    renderMetadata(oidc(completeOidc()), { environment: 1 });
    await waitFor(() => expect(forms.redirect_uris).toBeDefined());
    const validateProduction = formProp<(value: string) => boolean>("redirect_uris", "onValidate");
    expect(formProp<{ validation: string[] }>("redirect_uris", "uiConfiguration").validation).toEqual([
      "uri",
      "https",
      "nolocalhost",
      "nohash",
    ]);
    expect(validateProduction("http://palvelu.example.fi/cb")).toBe(false);
    expect(validateProduction("https://localhost/cb")).toBe(false);
    expect(validateProduction("https://palvelu.example.fi/cb")).toBe(true);
  });

  it("ympäristön vaihto vaihtaa redirect_uris-määrityksen lennossa", async () => {
    const { latest } = renderMetadata(oidc(completeOidc()), { environment: 0 });
    await waitFor(() => expect(forms.redirect_uris).toBeDefined());
    act(() => latest.setEnvironment(1));
    await waitFor(() =>
      expect(formProp<{ environment?: number }>("redirect_uris", "uiConfiguration").environment).toBe(1)
    );
    expect(formProp<(value: string) => boolean>("redirect_uris", "onValidate")("http://localhost/cb")).toBe(false);
  });

  it("yksivalinnan (token_endpoint_auth_method) valinta tallentaa merkkijonon", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(oidc(completeOidc()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.click(within(row("token_endpoint_auth_method")).getByRole("combobox"));
    await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "client_secret_post" }));

    await waitFor(() => expect(latest.metadata.token_endpoint_auth_method).toBe("client_secret_post"));
    expect(latest.entity.sp?.metadata?.token_endpoint_auth_method).toBe("client_secret_post");
  });

  it("'Ei arvoa' -valinta poistaa avaimen, muu valinta asettaa sen (id_token_signed_response_alg)", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(oidc({ ...completeOidc(), id_token_signed_response_alg: "HS256" }));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.click(within(row("id_token_signed_response_alg")).getByRole("combobox"));
    await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Ei arvoa" }));
    await waitFor(() => expect("id_token_signed_response_alg" in latest.metadata).toBe(false));

    await user.click(within(row("id_token_signed_response_alg")).getByRole("combobox"));
    await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "HS256" }));
    await waitFor(() => expect(latest.metadata.id_token_signed_response_alg).toBe("HS256"));
  });

  it("monivalinta (response_types) tallentaa valitut arvot taulukkona", async () => {
    const user = userEvent.setup();
    const { latest } = renderMetadata(oidc(completeOidc()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await user.click(within(row("response_types")).getByRole("combobox"));
    await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "code id_token" }));
    await user.keyboard("{Escape}");

    await waitFor(() => expect(latest.metadata.response_types).toEqual(["code", "code id_token"]));
  });

  it("pakollisen monivalinnan tyhjennys estää tallennuksen", async () => {
    const { latest } = renderMetadata(oidc(completeOidc()));
    await waitFor(() => expect(lastCanSave(latest)).toBe(true));

    await formCall("response_types", "onUpdate", "response_types", []);

    await waitFor(() => expect(latest.metadata.response_types).toEqual([]));
    await waitFor(() => expect(lastCanSave(latest)).toBe(false));
  });
});

describe("muut roolit ja tyypit", () => {
  it("sp ilman metadataa alkuperäisessä configurationEntityssä: ei näytetä mitään", () => {
    const { container, latest } = renderMetadata(saml(undefined), { metadata: {} });
    expect(container).toBeEmptyDOMElement();
    expect(latest.canSave).toEqual([true]);
  });

  it("muu sp-tyyppi: metadata näytetään JSON-muodossa", () => {
    const entity: Components.Schemas.ConfigurationEntity = {
      sp: {
        type: "shibboleth",
        metadata: { content: { a: 1 } } as Components.Schemas.ServiceProvider["metadata"],
      },
    };
    renderMetadata(entity);
    expect(screen.getByText("Metatiedot")).toBeInTheDocument();
    expect(document.querySelector("code")?.textContent).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("muu sp-tyyppi: base64-koodattu metadata (encoding) puretaan", () => {
    const entity: Components.Schemas.ConfigurationEntity = {
      sp: {
        type: "shibboleth",
        metadata: {
          encoding: "base64",
          content: btoa("<EntityDescriptor/>"),
        } as unknown as Components.Schemas.ServiceProvider["metadata"],
      },
    };
    renderMetadata(entity);
    expect(document.querySelector("code")?.textContent).toBe("<EntityDescriptor/>");
  });

  it.each(["azure", "adfs", "gsuite"])("idp %s, jolla metadataUrl: näytetään linkki", (type) => {
    const metadataUrl = "https://login.example.fi/metadata.xml";
    renderMetadata({ idp: { type, metadataUrl } as Components.Schemas.IdentityProvider }, { role: "idp", type });
    expect(screen.getByText("Metatiedot")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: metadataUrl })).toHaveAttribute("href", metadataUrl);
  });

  it("idp ilman metadataUrlia tai muu idp-tyyppi: ei näytetä mitään", () => {
    const { container } = renderMetadata({ idp: { type: "azure" } }, { role: "idp", type: "azure" });
    expect(container).toBeEmptyDOMElement();
    const wilma = renderMetadata(
      { idp: { type: "wilma", metadataUrl: "https://x.example.fi" } as Components.Schemas.IdentityProvider },
      { role: "idp", type: "wilma" }
    );
    expect(wilma.container).toBeEmptyDOMElement();
  });
});
