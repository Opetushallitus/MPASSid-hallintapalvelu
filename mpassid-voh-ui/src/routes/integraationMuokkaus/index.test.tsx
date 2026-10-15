import type { Components } from "@/api";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosResponse } from "axios";
import { useEffect, type MutableRefObject } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes, useLocation, type Location } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataConfiguration } from "../../config";
import { withDevUiConfiguration } from "./devUiConfiguration";
import IntegraatioMuokkaus from "./index";

// ---------------------------------------------------------------------------
// Mocks: the API functions the page calls and the heavy children. The
// IntegrationDetails stub records its props, so the tests drive the page
// through the same setters (setNewIntegration, setCanSave, setLogo, ...) the
// real form calls.
// ---------------------------------------------------------------------------

type Props = Record<string, unknown>;
const children = vi.hoisted(() => ({}) as Record<string, Props>);

const api = vi.hoisted(() => ({
  inactivateIntegration: vi.fn(),
  uploadLogo: vi.fn(),
  uploadSamlMetadata: vi.fn(),
  createIntegrationRaw: vi.fn(),
  updateIntegrationRaw: vi.fn(),
  testAttributesAuthorization: vi.fn(),
  useDataUserInterfaceConfigurationRawSafe: vi.fn(),
}));
vi.mock("@/api", () => api);

// Must be the SAME object on every render: the page has an effect keyed on it.
const me = vi.hoisted(() => ({ current: { groups: [] as string[] } }));
vi.mock("@/api/käyttöoikeus", () => ({ useMe: () => me.current }));

vi.mock("./IntegrationDetails", () => ({
  default: (props: Props) => {
    children.details = props;
    return <div data-testid="integration-details" />;
  },
}));
vi.mock("./AttributeTest", () => ({
  default: (props: Props) => {
    children.attributeTest = props;
    return null;
  },
}));

/** Calls a setter the given child received, like the real child would. */
const call = (child: string, setter: string, value: unknown) =>
  act(() => (children[child][setter] as (value: unknown) => void)(value));

const prop = <T,>(child: string, name: string) => children[child][name] as T;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_OID = "1.2.246.562.10.00000000002";
const PALVELU_TALLENTAJA = `APP_MPASSID_PALVELU_TALLENTAJA_${ORG_OID}`;
const TALLENTAJA = `APP_MPASSID_TALLENTAJA_${ORG_OID}`;

const oidc = ({
  id = 5,
  clientSecret = "*****",
}: { id?: number; clientSecret?: string } = {}): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 0,
  organization: { oid: ORG_OID, name: "Testiorganisaatio" },
  configurationEntity: {
    attributes: [
      { type: "user", name: "firstName", content: "givenName" },
      { type: "user", name: "surname", content: "" },
      { type: "data", name: "foo", content: "" },
    ],
    sp: {
      type: "oidc",
      name: "Palvelu",
      // The schema types metadata values as objects (see Form/types.ts).
      metadata: { client_id: "asiakas", client_secret: clientSecret },
    } as unknown as Components.Schemas.ServiceProvider,
  },
  permissions: [{ to: { id: 9 }, lastUpdatedOn: "2024-01-01T00:00:00Z" }],
  integrationSets: [{ id: 77, deploymentPhase: 0, configurationEntity: { set: { name: "Setti" } } }],
});

const saml = (id = 5): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 0,
  organization: { oid: ORG_OID },
  configurationEntity: {
    attributes: [],
    sp: {
      type: "saml",
      name: "Palvelu",
      metadata: { client_secret: "selvakielinen" },
    } as unknown as Components.Schemas.ServiceProvider,
  },
});

const wilma = (id = 5): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 1,
  organization: { oid: ORG_OID },
  configurationEntity: {
    attributes: [],
    idp: { type: "wilma", institutionTypes: [11], flowName: "x", idpId: "x" },
  },
});

const azure = ({
  id = 5,
  clientKey = "salainen",
}: { id?: number; clientKey?: string } = {}): Components.Schemas.Integration => ({
  id,
  deploymentPhase: 2,
  organization: { oid: ORG_OID },
  configurationEntity: {
    attributes: [
      { type: "data", name: "clientId", content: "asiakas-id" },
      { type: "data", name: "clientKey", content: clientKey },
      { type: "data", name: "tenantId", content: "vuokralainen" },
      { type: "user", name: "firstName", content: "givenName" },
    ],
    idp: { type: "azure", institutionTypes: [11], flowName: "x", idpId: "x" },
  },
});

const axiosError = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    data,
    statusText: "",
    headers: {},
    config: {},
  } as AxiosResponse);

// ---------------------------------------------------------------------------
// Rendering: the page under its real route, with probes for the navigation
// targets (pathname + location.state).
// ---------------------------------------------------------------------------

const locationRef: MutableRefObject<Location | undefined> = { current: undefined };

function LocationProbe() {
  const location = useLocation();
  useEffect(() => {
    locationRef.current = location;
  });
  return null;
}

const renderPage = (
  path = "/muokkaa/sp/oidc/5",
  { messages = {} as Record<string, string> } = {}
) =>
  render(
    <IntlProvider locale="fi" defaultLocale="fi" messages={messages} onError={() => {}}>
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/muokkaa/:role/:type/:id" element={<IntegraatioMuokkaus />} />
          <Route path="/integraatio/:integrationId" element={<div>Integraation sivu</div>} />
          <Route path="/" element={<div>Etusivu</div>} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>
  );

/** Renders the page and lets the IntegrationDetails stub "load" an integration. */
const renderLoaded = async (
  integration: Components.Schemas.Integration,
  { path, canSave = true, messages }: { path?: string; canSave?: boolean; messages?: Record<string, string> } = {}
) => {
  const user = userEvent.setup();
  renderPage(path, { messages });
  call("details", "setNewIntegration", integration);
  if (canSave) call("details", "setCanSave", true);
  await screen.findByText("Tallenna muutokset");
  return user;
};

/** The (open) MUI Dialog that contains the given text. */
const dialogWith = async (text: string) =>
  (await screen.findByText(text)).closest<HTMLElement>('[role="dialog"]')!;

const clickSave = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Tallenna" }));

/** Tallenna -> confirmation dialog OK. */
const saveAndConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await clickSave(user);
  const confirmation = await dialogWith("Haluatko varmasti tallentaa?");
  await user.click(within(confirmation).getByRole("button", { name: "OK" }));
};

const successDialog = () => dialogWith("Muutokset tallennettu onnistuneesti");

beforeEach(() => {
  Object.keys(children).forEach((name) => delete children[name]);
  Object.values(api).forEach((mock) => mock.mockReset());
  api.useDataUserInterfaceConfigurationRawSafe.mockReturnValue([undefined, { status: 200, data: [] }]);
  api.createIntegrationRaw.mockImplementation(async (_params: unknown, body: Components.Schemas.Integration) => ({
    data: { ...structuredClone(body), id: 1000 },
  }));
  api.updateIntegrationRaw.mockImplementation(async (params: { id: number }, body: Components.Schemas.Integration) => ({
    data: { ...structuredClone(body), id: params.id },
  }));
  api.inactivateIntegration.mockResolvedValue({ id: 5, active: false });
  api.testAttributesAuthorization.mockResolvedValue({});
  me.current = { groups: [PALVELU_TALLENTAJA] };
  locationRef.current = undefined;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("otsikko ja IntegrationDetails", () => {
  it("uuden jäsenen (id 0) otsikko on 'Uusi jäsen'", () => {
    renderPage("/muokkaa/sp/oidc/0");
    expect(screen.getByText("Uusi jäsen")).toBeInTheDocument();
  });

  it("olemassa olevan jäsenen otsikossa on id", () => {
    renderPage("/muokkaa/sp/oidc/5");
    expect(screen.getByText("Jäsenen 5 muokkaus")).toBeInTheDocument();
  });

  it("IntegrationDetails saa id:n numerona, dev-konfiguraation ja deploymentPhase-refin (-5)", () => {
    renderPage("/muokkaa/sp/oidc/5");
    expect(prop("details", "id")).toBe(5);
    expect(prop("details", "dataConfiguration")).toEqual(withDevUiConfiguration(dataConfiguration));
    expect(prop<{ current: number }>("details", "deploymentPhaseRef").current).toBe(-5);
    expect(prop("details", "newIntegration")).toBeUndefined();
    expect(prop("details", "metadataFile")).toEqual([]);
  });

  it("käyttöliittymäkonfiguraation virhe ei estä: käytetään silti paikallista konfiguraatiota", () => {
    api.useDataUserInterfaceConfigurationRawSafe.mockReturnValue([new Error("500"), undefined]);
    renderPage("/muokkaa/sp/oidc/5");
    expect(prop("details", "dataConfiguration")).toEqual(withDevUiConfiguration(dataConfiguration));
  });
});

describe("tallennuspalkki", () => {
  it("ennen kuin integraatio on ladattu, palkkia ja poistopainiketta ei näytetä", () => {
    renderPage("/muokkaa/sp/oidc/5");
    expect(screen.queryByText("Tallenna muutokset")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "poista" })).not.toBeInTheDocument();
  });

  it("Tallenna on pois käytöstä, kunnes lomake ilmoittaa canSave=true", async () => {
    await renderLoaded(oidc(), { canSave: false });
    expect(screen.getByRole("button", { name: "Tallenna" })).toBeDisabled();

    call("details", "setCanSave", true);
    expect(screen.getByRole("button", { name: "Tallenna" })).toBeEnabled();
  });

  it("Peruuta on linkki integraation sivulle muokattaessa", async () => {
    await renderLoaded(oidc());
    expect(screen.getByRole("link", { name: "Peruuta" })).toHaveAttribute("href", "/integraatio/5");
  });

  it("Peruuta on linkki etusivulle uutta luotaessa", async () => {
    await renderLoaded(oidc({ id: 0 }), { path: "/muokkaa/sp/oidc/0" });
    expect(screen.getByRole("link", { name: "Peruuta" })).toHaveAttribute("href", "/");
  });

  it("Peruuta navigoi ilman tallennusta", async () => {
    const user = await renderLoaded(oidc());
    await user.click(screen.getByRole("link", { name: "Peruuta" }));
    expect(await screen.findByText("Integraation sivu")).toBeInTheDocument();
    expect(locationRef.current?.pathname).toBe("/integraatio/5");
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
    expect(api.createIntegrationRaw).not.toHaveBeenCalled();
  });

  it("lomake voi piilottaa palkin setSaveDialogState(false):lla", async () => {
    await renderLoaded(oidc());
    call("details", "setSaveDialogState", false);
    await waitFor(() => expect(screen.queryByText("Tallenna muutokset")).not.toBeInTheDocument());
  });
});

describe("vahvistusdialogi", () => {
  it("Tallenna avaa vahvistuksen ja piilottaa palkin", async () => {
    const user = await renderLoaded(oidc());
    await clickSave(user);

    const dialog = await dialogWith("Olet muuttamassa integraation tietoja");
    expect(within(dialog).getByText("Haluatko varmasti tallentaa?")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Tallenna muutokset")).not.toBeInTheDocument());
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
  });

  it("PERUUTA sulkee vahvistuksen, palauttaa palkin eikä tallenna", async () => {
    const user = await renderLoaded(oidc());
    await clickSave(user);
    const dialog = await dialogWith("Haluatko varmasti tallentaa?");

    await user.click(within(dialog).getByRole("button", { name: "PERUUTA" }));

    await waitFor(() => expect(screen.queryByText("Haluatko varmasti tallentaa?")).not.toBeInTheDocument());
    expect(await screen.findByText("Tallenna muutokset")).toBeInTheDocument();
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
  });

  it("ilman kirjoitusoikeutta OK ei tee mitään: dialogi jää auki eikä mitään kutsuta", async () => {
    // Nykyinen käytös: Tallenna on käytössä, mutta OK on hiljaa no-op.
    me.current = { groups: ["APP_MPASSID_PALVELU_TALLENTAJA_1.2.246.562.10.99999999999"] };
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);

    expect(screen.getByText("Haluatko varmasti tallentaa?")).toBeInTheDocument();
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
    expect(screen.queryByText("Muutokset tallennettu onnistuneesti")).not.toBeInTheDocument();
  });
});

describe("kirjoitusoikeus", () => {
  it("palveluintegraatio: APP_MPASSID_PALVELU_TALLENTAJA_<oid> riittää", async () => {
    me.current = { groups: [PALVELU_TALLENTAJA] };
    const user = await renderLoaded(saml());
    await saveAndConfirm(user);
    await waitFor(() => expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(1));
  });

  it("palveluintegraatio: myös APP_MPASSID_TALLENTAJA_<oid> riittää", async () => {
    me.current = { groups: [TALLENTAJA] };
    const user = await renderLoaded(saml());
    await saveAndConfirm(user);
    await waitFor(() => expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(1));
  });

  it("koulutustoimija: APP_MPASSID_TALLENTAJA_<oid> riittää", async () => {
    me.current = { groups: [TALLENTAJA] };
    const user = await renderLoaded(wilma(), { path: "/muokkaa/idp/wilma/5" });
    await saveAndConfirm(user);
    await waitFor(() => expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(1));
  });

  it("koulutustoimija: APP_MPASSID_PALVELU_TALLENTAJA_<oid> ei riitä", async () => {
    me.current = { groups: [PALVELU_TALLENTAJA] };
    const user = await renderLoaded(wilma(), { path: "/muokkaa/idp/wilma/5" });
    await saveAndConfirm(user);
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
    expect(screen.getByText("Haluatko varmasti tallentaa?")).toBeInTheDocument();
  });
});

describe("uuden integraation luonti (id 0)", () => {
  it("OK kutsuu createIntegrationRaw:ia ja onnistumisen OK navigoi uuden integraation sivulle", async () => {
    const integration = oidc({ id: 0 });
    const user = await renderLoaded(integration, { path: "/muokkaa/sp/oidc/0" });
    await saveAndConfirm(user);

    const success = await successDialog();
    expect(api.createIntegrationRaw).toHaveBeenCalledTimes(1);
    expect(api.createIntegrationRaw.mock.calls[0][0]).toEqual({});
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
    expect(
      within(success).getByText(/Muutokset astuvat voimaan viimeistään 2 arkipäivän kuluessa/)
    ).toBeInTheDocument();

    await user.click(within(success).getByRole("button", { name: "OK" }));

    expect(await screen.findByText("Integraation sivu")).toBeInTheDocument();
    expect(locationRef.current?.pathname).toBe("/integraatio/1000");
    expect(locationRef.current?.state).toMatchObject({ id: 1000, configurationEntity: { sp: { type: "oidc" } } });
  });

  it("tyhjät user-attribuutit ja permissionien lastUpdatedOn poistetaan ennen tallennusta", async () => {
    const user = await renderLoaded(oidc({ id: 0 }), { path: "/muokkaa/sp/oidc/0" });
    await saveAndConfirm(user);
    await successDialog();

    const body = api.createIntegrationRaw.mock.calls[0][1] as Components.Schemas.Integration;
    // Empty *data* attributes are kept, only empty user attributes go.
    expect(body.configurationEntity?.attributes).toEqual([
      { type: "user", name: "firstName", content: "givenName" },
      { type: "data", name: "foo", content: "" },
    ]);
    expect(body.permissions).toEqual([{ to: { id: 9 } }]);
    // Create sends the integration sets as they are (only update maps them to ids).
    expect(body.integrationSets).toEqual(oidc().integrationSets);
  });

  it("siivous tehdään kopioon: newIntegration-tilaa ei mutatoida", async () => {
    const integration = oidc({ id: 0 });
    const original = structuredClone(integration);
    const user = await renderLoaded(integration, { path: "/muokkaa/sp/oidc/0" });
    await saveAndConfirm(user);
    await successDialog();

    const body = api.createIntegrationRaw.mock.calls[0][1];
    expect(body).not.toBe(integration);
    expect(body.permissions?.[0]).not.toHaveProperty("lastUpdatedOn");
    expect(integration).toEqual(original);
  });

  it("tallennuksen ajan OK on pois käytöstä ja näyttää latausindikaattorin", async () => {
    let resolve: (value: unknown) => void = () => {};
    api.createIntegrationRaw.mockImplementation(
      () => new Promise((r) => (resolve = r))
    );
    const user = await renderLoaded(oidc({ id: 0 }), { path: "/muokkaa/sp/oidc/0" });
    await saveAndConfirm(user);

    const confirmation = await dialogWith("Haluatko varmasti tallentaa?");
    const progress = await within(confirmation).findByRole("progressbar");
    expect(progress.closest("button")).toBeDisabled();
    expect(within(confirmation).queryByRole("button", { name: "OK" })).not.toBeInTheDocument();

    await act(async () => resolve({ data: { id: 1000 } }));
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
  });
});

describe("olemassa olevan integraation päivitys", () => {
  it("OK kutsuu updateIntegrationRaw:ia URL:n id:llä, setit pelkkinä id:inä", async () => {
    const integration = oidc();
    const user = await renderLoaded(integration);
    await saveAndConfirm(user);
    await successDialog();

    expect(api.createIntegrationRaw).not.toHaveBeenCalled();
    expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(1);
    const [params, body] = api.updateIntegrationRaw.mock.calls[0] as [unknown, Components.Schemas.Integration];
    expect(params).toEqual({ id: 5 });
    expect(body.integrationSets).toEqual([{ id: 77 }]);
    // A deep copy: the state keeps its full sets.
    expect(body).not.toBe(integration);
    expect(integration.integrationSets?.[0].configurationEntity).toBeDefined();
    // deploymentPhaseRef still -5: the integration's own phase is sent.
    expect(body.deploymentPhase).toBe(0);
  });

  it("päivityksen id otetaan newIntegrationista, ei URL:sta", async () => {
    const user = await renderLoaded(oidc({ id: 6 }), { path: "/muokkaa/sp/oidc/5" });
    await saveAndConfirm(user);
    await successDialog();
    expect(api.updateIntegrationRaw.mock.calls[0][0]).toEqual({ id: 6 });
  });

  it("deploymentPhaseRef >= 0 korvaa lähetettävän deploymentPhasen", async () => {
    const user = await renderLoaded(oidc());
    prop<{ current: number }>("details", "deploymentPhaseRef").current = 2;
    await saveAndConfirm(user);
    await successDialog();

    const body = api.updateIntegrationRaw.mock.calls[0][1] as Components.Schemas.Integration;
    expect(body.deploymentPhase).toBe(2);
  });

  it("onnistumisen OK navigoi integraation sivulle tuloksen kanssa", async () => {
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);
    const success = await successDialog();
    await user.click(within(success).getByRole("button", { name: "OK" }));

    expect(await screen.findByText("Integraation sivu")).toBeInTheDocument();
    expect(locationRef.current?.pathname).toBe("/integraatio/5");
    expect(locationRef.current?.state).toMatchObject({ id: 5, integrationSets: [{ id: 77 }] });
  });
});

describe("logo ja metadatatiedosto", () => {
  it("valittu logo ladataan tallennuksen jälkeen ja logoUrl päivitetään tulokseen", async () => {
    api.uploadLogo.mockResolvedValue("https://example.test/uusi-logo.png");
    me.current = { groups: [TALLENTAJA] };
    const user = await renderLoaded(wilma(), { path: "/muokkaa/idp/wilma/5" });
    const logo = new Blob(["png"], { type: "image/png" });
    call("details", "setLogo", logo);
    await saveAndConfirm(user);
    const success = await successDialog();

    expect(api.uploadLogo).toHaveBeenCalledTimes(1);
    const [params, formData] = api.uploadLogo.mock.calls[0] as [unknown, FormData];
    expect(params).toEqual({ id: 5 });
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("file")).toBeInstanceOf(Blob);

    await user.click(within(success).getByRole("button", { name: "OK" }));
    await screen.findByText("Integraation sivu");
    expect(locationRef.current?.state).toMatchObject({
      configurationEntity: { idp: { logoUrl: "https://example.test/uusi-logo.png" } },
    });
  });

  it("logoa ei ladata, jos tuloksella ei ole id:tä", async () => {
    api.createIntegrationRaw.mockResolvedValue({ data: { configurationEntity: { idp: {} } } });
    me.current = { groups: [TALLENTAJA] };
    const user = await renderLoaded(wilma(0), { path: "/muokkaa/idp/wilma/0" });
    call("details", "setLogo", new Blob(["png"]));
    await saveAndConfirm(user);
    await successDialog();
    expect(api.uploadLogo).not.toHaveBeenCalled();
  });

  it("yksi metadatatiedosto ladataan; koulutustoimijalla tulos korvataan latauksen vastauksella", async () => {
    me.current = { groups: [TALLENTAJA] };
    api.uploadSamlMetadata.mockResolvedValue({ id: 5, configurationEntity: { idp: { type: "adfs", metadataUrl: "m" } } });
    const user = await renderLoaded(wilma(), { path: "/muokkaa/idp/adfs/5" });
    const file = new File(["<xml/>"], "metadata.xml", { type: "text/xml" });
    call("details", "setMetadataFile", [file]);
    await saveAndConfirm(user);
    const success = await successDialog();

    expect(api.uploadSamlMetadata).toHaveBeenCalledTimes(1);
    const [params, formData] = api.uploadSamlMetadata.mock.calls[0] as [unknown, FormData];
    expect(params).toEqual({ id: 5 });
    expect((formData.get("file") as File).name).toBe("metadata.xml");

    await user.click(within(success).getByRole("button", { name: "OK" }));
    await screen.findByText("Integraation sivu");
    expect(locationRef.current?.state).toEqual({
      id: 5,
      configurationEntity: { idp: { type: "adfs", metadataUrl: "m" } },
    });
  });

  it("palveluintegraatiolla metadatan latauksen vastaus jätetään huomiotta", async () => {
    // Nykyinen käytös: tulos korvataan vain, jos tuloksella on idp.
    api.uploadSamlMetadata.mockResolvedValue({ id: 5, version: 99 });
    const user = await renderLoaded(saml());
    call("details", "setMetadataFile", [new File(["<xml/>"], "metadata.xml")]);
    await saveAndConfirm(user);
    const success = await successDialog();
    expect(api.uploadSamlMetadata).toHaveBeenCalledTimes(1);

    await user.click(within(success).getByRole("button", { name: "OK" }));
    await screen.findByText("Integraation sivu");
    expect(locationRef.current?.state).not.toHaveProperty("version");
  });

  it("useampaa kuin yhtä metadatatiedostoa ei ladata", async () => {
    const user = await renderLoaded(saml());
    call("details", "setMetadataFile", [new File(["a"], "a.xml"), new File(["b"], "b.xml")]);
    await saveAndConfirm(user);
    await successDialog();
    expect(api.uploadSamlMetadata).not.toHaveBeenCalled();
  });
});

describe("client_secret-muistutus onnistumisdialogissa", () => {
  it("uusi (maskaamaton) OIDC client_secret näytetään", async () => {
    const user = await renderLoaded(oidc({ clientSecret: "uusi-salaisuus" }));
    await saveAndConfirm(user);
    const success = await successDialog();
    expect(within(success).getByText(/Muista tallentaa client_secret:/)).toBeInTheDocument();
    expect(within(success).getByText(/client_secret: uusi-salaisuus/)).toBeInTheDocument();
  });

  it("maskattua (***) client_secretiä ei näytetä", async () => {
    const user = await renderLoaded(oidc({ clientSecret: "abc***" }));
    await saveAndConfirm(user);
    const success = await successDialog();
    expect(within(success).queryByText(/client_secret/)).not.toBeInTheDocument();
  });

  it("SAML-integraatiolle muistutusta ei näytetä", async () => {
    const user = await renderLoaded(saml());
    await saveAndConfirm(user);
    const success = await successDialog();
    expect(within(success).queryByText(/client_secret/)).not.toBeInTheDocument();
  });
});

describe("tallennusvirheet", () => {
  // Errors are logged with console.error (LOG_LEVEL ERROR): keep the output clean.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("409 viestillä näyttää palvelimen viestin", async () => {
    api.updateIntegrationRaw.mockRejectedValue(axiosError(409, { message: "Nimi on jo käytössä" }));
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);

    expect(await screen.findByText("Muutosten tallenus epäonnistui")).toBeInTheDocument();
    expect(screen.getByText(/Nimi on jo käytössä/)).toBeInTheDocument();
    expect(screen.queryByText(/Ongelma näytettäessä tietoja/)).not.toBeInTheDocument();
    expect(screen.queryByText("Muutokset tallennettu onnistuneesti")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Haluatko varmasti tallentaa?")).not.toBeInTheDocument());
  });

  it("409 viesti, joka on käännösavain, näytetään käännettynä", async () => {
    api.updateIntegrationRaw.mockRejectedValue(axiosError(409, { message: "virhe.nimi_varattu" }));
    const user = await renderLoaded(oidc(), { messages: { "virhe.nimi_varattu": "Käännetty virheteksti" } });
    await saveAndConfirm(user);

    expect(await screen.findByText(/Käännetty virheteksti/)).toBeInTheDocument();
    expect(screen.queryByText(/virhe\.nimi_varattu/)).not.toBeInTheDocument();
  });

  it("409 ilman viestiä näyttää yleisen virheen", async () => {
    api.updateIntegrationRaw.mockRejectedValue(axiosError(409, {}));
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);

    expect(await screen.findByText("Virhe")).toBeInTheDocument();
    expect(screen.getByText(/Ongelma näytettäessä tietoja/)).toBeInTheDocument();
  });

  it("muu virhe (500) näyttää yleisen virheen, vaikka palvelin antaisi viestin", async () => {
    api.updateIntegrationRaw.mockRejectedValue(axiosError(500, { message: "Sisäinen virhe" }));
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);

    expect(await screen.findByText("Virhe")).toBeInTheDocument();
    expect(screen.getByText(/Ongelma näytettäessä tietoja/)).toBeInTheDocument();
    expect(screen.queryByText(/Sisäinen virhe/)).not.toBeInTheDocument();
    expect(screen.queryByText("Muutosten tallenus epäonnistui")).not.toBeInTheDocument();
  });

  it("muu kuin axios-virhe (esim. luonnissa) näyttää yleisen virheen", async () => {
    api.createIntegrationRaw.mockRejectedValue(new Error("verkko"));
    const user = await renderLoaded(oidc({ id: 0 }), { path: "/muokkaa/sp/oidc/0" });
    await saveAndConfirm(user);
    expect(await screen.findByText(/Ongelma näytettäessä tietoja/)).toBeInTheDocument();
  });

  it("ilman SUPPORT_URI:a 'ylläpitoon' on pelkkää tekstiä, sen kanssa linkki", async () => {
    api.updateIntegrationRaw.mockRejectedValue(axiosError(500, {}));
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);
    await screen.findByText(/Ongelma näytettäessä tietoja/);
    expect(screen.queryByRole("link", { name: "ylläpitoon" })).not.toBeInTheDocument();
  });

  it("SUPPORT_URI:n kanssa 'ylläpitoon' on linkki", async () => {
    ENV.SUPPORT_URI = "mailto:tuki@example.test";
    try {
      api.updateIntegrationRaw.mockRejectedValue(axiosError(500, {}));
      const user = await renderLoaded(oidc());
      await saveAndConfirm(user);
      expect(await screen.findByRole("link", { name: "ylläpitoon" })).toHaveAttribute(
        "href",
        "mailto:tuki@example.test"
      );
    } finally {
      delete ENV.SUPPORT_URI;
    }
  });

  it("virheen sulkeminen palauttaa tallennuspalkin; uusi yritys onnistuu", async () => {
    api.updateIntegrationRaw.mockRejectedValueOnce(axiosError(500, {}));
    const user = await renderLoaded(oidc());
    await saveAndConfirm(user);
    await screen.findByText(/Ongelma näytettäessä tietoja/);

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByText(/Ongelma näytettäessä tietoja/)).not.toBeInTheDocument());
    expect(await screen.findByText("Tallenna muutokset")).toBeInTheDocument();
    expect(locationRef.current?.pathname).toBe("/muokkaa/sp/oidc/5");

    await saveAndConfirm(user);
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
    expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(2);
  });

  it("logon latausvirhe käsitellään kuten tallennusvirhe", async () => {
    api.uploadLogo.mockRejectedValue(new Error("logo"));
    const user = await renderLoaded(oidc());
    call("details", "setLogo", new Blob(["png"]));
    await saveAndConfirm(user);
    expect(await screen.findByText(/Ongelma näytettäessä tietoja/)).toBeInTheDocument();
    expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(1);
  });
});

describe("poisto", () => {
  it("uudelle integraatiolle (id 0) ei näytetä poistoa", async () => {
    await renderLoaded(oidc({ id: 0 }), { path: "/muokkaa/sp/oidc/0" });
    expect(screen.queryByRole("button", { name: "poista" })).not.toBeInTheDocument();
  });

  it("poista-painike vaihtaa Tallennan Poistaksi ja takaisin", async () => {
    const user = await renderLoaded(oidc(), { canSave: false });
    expect(screen.getByText("Poista jäsen")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "poista" }));
    // Enabled even though the form can't be saved.
    expect(screen.getByRole("button", { name: "Poista" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Tallenna" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "poista" }));
    expect(screen.queryByRole("button", { name: "Poista" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tallenna" })).toBeDisabled();
  });

  it("poisto inaktivoi integraation ja OK navigoi etusivulle id tilana", async () => {
    const user = await renderLoaded(oidc());
    await user.click(screen.getByRole("button", { name: "poista" }));
    await user.click(screen.getByRole("button", { name: "Poista" }));

    const confirmation = await dialogWith("Olet poistamassa integraation tietoja");
    expect(within(confirmation).getByText("Haluatko varmasti poistaa?")).toBeInTheDocument();
    await user.click(within(confirmation).getByRole("button", { name: "OK" }));

    const success = await successDialog();
    expect(api.inactivateIntegration).toHaveBeenCalledWith({ id: 5 });
    expect(api.updateIntegrationRaw).not.toHaveBeenCalled();
    expect(api.createIntegrationRaw).not.toHaveBeenCalled();

    await user.click(within(success).getByRole("button", { name: "OK" }));
    expect(await screen.findByText("Etusivu")).toBeInTheDocument();
    expect(locationRef.current?.pathname).toBe("/");
    // The URL's id (a string), used by Home to close the integration's tab.
    expect(locationRef.current?.state).toBe("5");
  });

  it("poiston PERUUTA ei poista ja Poista-tila säilyy", async () => {
    const user = await renderLoaded(oidc());
    await user.click(screen.getByRole("button", { name: "poista" }));
    await user.click(screen.getByRole("button", { name: "Poista" }));
    const confirmation = await dialogWith("Haluatko varmasti poistaa?");

    await user.click(within(confirmation).getByRole("button", { name: "PERUUTA" }));
    await waitFor(() => expect(screen.queryByText("Haluatko varmasti poistaa?")).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: "Poista" })).toBeInTheDocument();
    expect(api.inactivateIntegration).not.toHaveBeenCalled();
  });

  it("poisto vaatii kirjoitusoikeuden", async () => {
    me.current = { groups: [] };
    const user = await renderLoaded(oidc());
    await user.click(screen.getByRole("button", { name: "poista" }));
    await user.click(screen.getByRole("button", { name: "Poista" }));
    const confirmation = await dialogWith("Haluatko varmasti poistaa?");
    await user.click(within(confirmation).getByRole("button", { name: "OK" }));

    expect(api.inactivateIntegration).not.toHaveBeenCalled();
    expect(screen.getByText("Haluatko varmasti poistaa?")).toBeInTheDocument();
  });

  // Korjattu: inactivateIntegration-virhe käsitellään try/catchissa, joten
  // virhedialogi näytetään ja vahvistusdialogi suljetaan.
  it("epäonnistunut poisto näyttää virheilmoituksen", async () => {
    // The error is logged with console.error: keep the output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      api.inactivateIntegration.mockRejectedValue(axiosError(500, {}));
      const user = await renderLoaded(oidc());
      await user.click(screen.getByRole("button", { name: "poista" }));
      await user.click(screen.getByRole("button", { name: "Poista" }));
      const confirmation = await dialogWith("Haluatko varmasti poistaa?");
      await user.click(within(confirmation).getByRole("button", { name: "OK" }));

      expect(await screen.findByText(/Ongelma näytettäessä tietoja/)).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("Haluatko varmasti poistaa?")).not.toBeInTheDocument());
      expect(api.inactivateIntegration).toHaveBeenCalledWith({ id: 5 });
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("Entra ID (azure)", () => {
  beforeEach(() => {
    me.current = { groups: [TALLENTAJA] };
  });

  it("attribuuttitestin painike näytetään azurelle ja avaa AttributeTestin", async () => {
    const user = await renderLoaded(azure(), { path: "/muokkaa/idp/azure/5", canSave: false });
    expect(prop("attributeTest", "open")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Testaa attribuuttien oikeellisuus" }));

    expect(prop("attributeTest", "open")).toBe(true);
    expect(prop("attributeTest", "id")).toBe("5");
    expect(prop("attributeTest", "tenantId")).toBe("vuokralainen");
    expect(prop("attributeTest", "attributes")).toEqual([
      { type: "user", name: "firstName", content: "givenName" },
    ]);
    expect(prop("attributeTest", "oid")).toBe(ORG_OID);
    expect(prop("attributeTest", "environment")).toBe(2);
  });

  it("uudelle azurelle (id 0) testipainike näkyy vasta, kun canSave=true", async () => {
    await renderLoaded(azure({ id: 0 }), { path: "/muokkaa/idp/azure/0", canSave: false });
    expect(screen.queryByRole("button", { name: "Testaa attribuuttien oikeellisuus" })).not.toBeInTheDocument();

    call("details", "setCanSave", true);
    expect(screen.getByRole("button", { name: "Testaa attribuuttien oikeellisuus" })).toBeInTheDocument();
  });

  it("muille tyypeille testipainiketta ei näytetä (reitin type ratkaisee)", async () => {
    await renderLoaded(azure(), { path: "/muokkaa/idp/wilma/5" });
    expect(screen.queryByRole("button", { name: "Testaa attribuuttien oikeellisuus" })).not.toBeInTheDocument();
  });

  it("Tallenna testaa tunnukset kerran (tenantId mukana muokattaessa)", async () => {
    const user = await renderLoaded(azure(), { path: "/muokkaa/idp/azure/5" });
    await clickSave(user);
    await dialogWith("Haluatko varmasti tallentaa?");

    expect(api.testAttributesAuthorization).toHaveBeenCalledTimes(1);
    expect(api.testAttributesAuthorization).toHaveBeenCalledWith(
      {},
      { id: 5, tenantId: "vuokralainen", clientId: "asiakas-id", clientSecret: "salainen" }
    );
  });

  it("uudelle azurelle (id 0) testissä ei lähetetä tenantId:tä", async () => {
    const user = await renderLoaded(azure({ id: 0 }), { path: "/muokkaa/idp/azure/0" });
    await clickSave(user);
    await dialogWith("Haluatko varmasti tallentaa?");

    expect(api.testAttributesAuthorization).toHaveBeenCalledWith(
      {},
      { id: 0, clientId: "asiakas-id", clientSecret: "salainen" }
    );
  });

  it("maskattua clientKeytä (***) ei testata", async () => {
    const user = await renderLoaded(azure({ clientKey: "*****" }), { path: "/muokkaa/idp/azure/5" });
    await clickSave(user);
    await dialogWith("Haluatko varmasti tallentaa?");
    expect(api.testAttributesAuthorization).not.toHaveBeenCalled();
  });

  it("testin epäonnistuminen ei estä tallennusta", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    api.testAttributesAuthorization.mockRejectedValue(new Error("401"));
    const user = await renderLoaded(azure(), { path: "/muokkaa/idp/azure/5" });
    await saveAndConfirm(user);
    expect(await screen.findByText("Muutokset tallennettu onnistuneesti")).toBeInTheDocument();
    expect(api.updateIntegrationRaw).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
