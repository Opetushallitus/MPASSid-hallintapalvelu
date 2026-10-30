import type { Components } from "@/api";
import { act, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import IdentityProvider from "./IdentityProvider";
import { dataConfiguration } from "../../../config";

configure({ asyncUtilTimeout: 4000 });
vi.setConfig({ testTimeout: 20000 });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const METADATA_URL = "https://login.microsoftonline.com/tenant/FederationMetadata/2007-06/FederationMetadata.xml";
const TEST_LINK =
  "https://firmitas.csc.fi/mpass/Shibboleth.sso/Login?entityID=https://mpass-proxy.csc.fi/idp/shibboleth&authnContextClassRef=urn:mpass.id:authnsource:";

const integration = (
  type: string,
  { deploymentPhase = 1, flowName = "KouluFlow" as string | undefined, metadataUrl = undefined as string | undefined } = {}
): Components.Schemas.Integration => ({
  id: 5,
  deploymentPhase,
  organization: { oid: "1.2.246.562.99.00000000001", name: "Mansikkalan kunta" },
  configurationEntity: {
    attributes: [],
    idp: { type, flowName, idpId: `${type}_x`, institutionTypes: [11], metadataUrl } as Components.Schemas.IdentityProvider,
  },
});

// ---------------------------------------------------------------------------
// Harness: owns the state IntegrationDetails owns (environment,
// metadataUrl, metadataFile) with stable, recording setters. IdentityProvider
// reads the role from the route (/muokkaa/:role/:type/:id).
// ---------------------------------------------------------------------------

interface Latest {
  environmentCalls: number[];
  metadataUrl: string;
  metadataUrlCalls: string[];
  metadataFile: File[];
  metadataFileCalls: File[][];
  canSaveCalls: boolean[];
}

interface Options {
  role?: string;
  environment?: number;
  metadataUrl?: string;
  metadataFile?: File[];
}

const renderIdentityProvider = (
  value: Components.Schemas.Integration,
  { role = "idp", environment = value.deploymentPhase ?? -5, metadataUrl = "", metadataFile = [] }: Options = {}
) => {
  const latest: Latest = {
    environmentCalls: [],
    metadataUrl,
    metadataUrlCalls: [],
    metadataFile,
    metadataFileCalls: [],
    canSaveCalls: [],
  };

  function Harness() {
    const [currentEnvironment, setEnvironmentState] = useState(environment);
    const [url, setUrl] = useState(metadataUrl);
    const [files, setFiles] = useState<File[]>(metadataFile);
    const [setters] = useState(() => ({
      setEnvironment: (next: number) => {
        latest.environmentCalls.push(next);
        setEnvironmentState(next);
      },
      setMetadataUrl: (next: string) => {
        latest.metadataUrlCalls.push(next);
        setUrl(next);
      },
      setMetadataFile: (next: File[]) => {
        latest.metadataFileCalls.push(next);
        setFiles(next);
      },
      setCanSave: (next: boolean) => {
        latest.canSaveCalls.push(next);
      },
      setName: () => {},
    }));
    latest.metadataUrl = url;
    latest.metadataFile = files;

    // Props as Role/index.tsx passes them.
    return (
      <IdentityProvider
        dataConfiguration={dataConfiguration}
        integration={value}
        environment={currentEnvironment}
        setEnvironment={setters.setEnvironment}
        setName={setters.setName}
        setCanSave={setters.setCanSave}
        name=""
        tenantId=""
        setMetadataUrl={setters.setMetadataUrl}
        metadataUrl={url}
        setMetadataFile={setters.setMetadataFile}
        metadataFile={files}
      />
    );
  }

  const type = value.configurationEntity?.idp?.type ?? "unknown";
  const utils = render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[`/muokkaa/${role}/${type}/${value.id}`]}>
        <Routes>
          <Route path="/muokkaa/:role/:type/:id" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>
  );
  return { ...utils, latest };
};

const metadataUrlInput = () => screen.getByPlaceholderText("Lisää metadataUrlField");
/** FileUploader's drop zone (its first child div). */
const dropZone = () => document.querySelector(".input-container > div") as HTMLElement;
const metadataFileOf = (name = "metadata.xml") => new File(["<EntityDescriptor/>"], name, { type: "text/xml" });
const drop = (files: File[]) => act(() => fireEvent.drop(dropZone(), { dataTransfer: { files } }));

/** The environment selector (Palveluympäristö). */
const environmentSelect = () => {
  const label = screen.getByText("Palveluympäristö");
  const value = label.closest(".MuiGrid-root")!.nextElementSibling as HTMLElement;
  return within(value).getByRole("combobox");
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("yhteiset tiedot", () => {
  it("muulla kuin idp-roolilla (reitin :role) ei näytetä mitään", () => {
    const { container } = renderIdentityProvider(integration("azure"), { role: "sp" });
    expect(container).toBeEmptyDOMElement();
  });

  it("näyttää otsikon, palveluympäristön, tyypin ja testauslinkin", () => {
    renderIdentityProvider(integration("wilma", { flowName: "WilmaKoulu" }));

    expect(screen.getByText("OKJ-integraatiotyyppikohtaiset tiedot")).toBeInTheDocument();
    expect(environmentSelect()).toHaveTextContent("Tuotanto");
    // DataRow: the attribute name as label (no translations), the type as value.
    expect(screen.getByText("type")).toBeInTheDocument();
    expect(screen.getByText("wilma")).toBeInTheDocument();
    expect(screen.getByText("Testauslinkki")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${TEST_LINK}WilmaKoulu` })).toHaveAttribute(
      "href",
      `${TEST_LINK}WilmaKoulu`
    );
  });

  it("ilman flowNamea testauslinkkiä ei näytetä", () => {
    renderIdentityProvider(integration("wilma", { flowName: "" }));
    expect(screen.queryByText("Testauslinkki")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("ympäristövalintaa ei näytetä, kun ympäristö ei ole vielä tiedossa (environment < 0)", () => {
    renderIdentityProvider(integration("wilma"), { environment: -5 });
    expect(screen.queryByText("Palveluympäristö")).not.toBeInTheDocument();
  });

  it("wilmalla ei ole metadata-osoitetta eikä tiedostoa", () => {
    renderIdentityProvider(integration("wilma"));
    expect(screen.queryByPlaceholderText("Lisää metadataUrlField")).not.toBeInTheDocument();
    expect(screen.queryByText("Drag & Drop metadata file")).not.toBeInTheDocument();
  });

  it("IdentityProvider ei kutsu setCanSavea (Role välittää sen, mutta sitä ei käytetä)", async () => {
    const actor = userEvent.setup();
    const { latest } = renderIdentityProvider(integration("azure"));
    await actor.type(metadataUrlInput(), "x");
    await actor.clear(metadataUrlInput());
    expect(latest.canSaveCalls).toEqual([]);
  });
});

describe("palveluympäristö", () => {
  const options = async (actor: ReturnType<typeof userEvent.setup>) => {
    await actor.click(environmentSelect());
    const listbox = await screen.findByRole("listbox");
    const names = within(listbox)
      .getAllByRole("option")
      .map((option) => option.textContent);
    await actor.keyboard("{Escape}");
    return names;
  };

  it("tuotannossa olevalle integraatiolle ei tarjota Testi-ympäristöä", async () => {
    const actor = userEvent.setup();
    renderIdentityProvider(integration("wilma", { deploymentPhase: 1 }));
    expect(await options(actor)).toEqual(["Tuotanto", "Tuotanto-Testi"]);
  });

  it("testissä olevalle integraatiolle (deploymentPhase 0) tarjotaan kaikki ympäristöt", async () => {
    const actor = userEvent.setup();
    renderIdentityProvider(integration("wilma", { deploymentPhase: 0 }), { environment: 0 });
    expect(environmentSelect()).toHaveTextContent("Testi");
    expect(await options(actor)).toEqual(["Testi", "Tuotanto", "Tuotanto-Testi"]);
  });

  it("ympäristön valinta kutsuu setEnvironmentia numerolla ja näyttää uuden ympäristön", async () => {
    const actor = userEvent.setup();
    const { latest } = renderIdentityProvider(integration("wilma", { deploymentPhase: 1 }));

    await actor.click(environmentSelect());
    await actor.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Tuotanto-Testi" }));

    expect(latest.environmentCalls).toEqual([2]);
    await waitFor(() => expect(environmentSelect()).toHaveTextContent("Tuotanto-Testi"));
  });
});

describe("azure: metadata-osoite", () => {
  it("näyttää metadata-osoitekentän nykyisellä arvolla; tiedoston pudotusaluetta ei ole", () => {
    renderIdentityProvider(integration("azure"), { metadataUrl: METADATA_URL });
    expect(screen.getByText("metadataUrl")).toBeInTheDocument();
    expect(metadataUrlInput()).toHaveValue(METADATA_URL);
    expect(screen.queryByText("Drag & Drop metadata file")).not.toBeInTheDocument();
    expect(screen.queryByText("tai")).not.toBeInTheDocument();
  });

  it("tyhjä osoite ilman tiedostoa on pakollinen: virheteksti näytetään", () => {
    renderIdentityProvider(integration("azure"));
    expect(screen.getByText("metadataUrlField on pakollinen kenttä")).toBeInTheDocument();
    expect(metadataUrlInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("osoitteen kirjoitus kutsuu setMetadataUrlia jokaisella merkillä ja tyhjentää tiedostot", async () => {
    const actor = userEvent.setup();
    const { latest } = renderIdentityProvider(integration("azure"));

    await actor.type(metadataUrlInput(), "https://x");

    expect(latest.metadataUrlCalls.at(-1)).toBe("https://x");
    expect(latest.metadataUrlCalls).toHaveLength("https://x".length);
    expect(latest.metadataUrl).toBe("https://x");
    expect(latest.metadataFileCalls.at(-1)).toEqual([]);
    expect(screen.queryByText("metadataUrlField on pakollinen kenttä")).not.toBeInTheDocument();
  });

  it("osoitteen tyhjennys kutsuu setMetadataUrl('') muttei tyhjennä tiedostoja ja näyttää pakollisuusvirheen", async () => {
    const actor = userEvent.setup();
    const { latest } = renderIdentityProvider(integration("azure"), { metadataUrl: METADATA_URL });

    await actor.clear(metadataUrlInput());

    expect(latest.metadataUrlCalls).toEqual([""]);
    expect(latest.metadataFileCalls).toEqual([]);
    expect(screen.getByText("metadataUrlField on pakollinen kenttä")).toBeInTheDocument();
  });
});

describe("adfs: metadata-osoite tai -tiedosto", () => {
  it("näyttää osoitekentän, 'tai'-tekstin ja pudotusalueen", () => {
    renderIdentityProvider(integration("adfs"));
    expect(metadataUrlInput()).toBeInTheDocument();
    expect(screen.getByText("tai")).toBeInTheDocument();
    expect(screen.getByText("Drag & Drop metadata file")).toBeInTheDocument();
    // No url and no file: the drop zone is shown as missing (mandatory).
    expect(dropZone()).toHaveClass("input-zone-missing");
  });

  it("tiedoston pudotus asettaa tiedoston ja tyhjentää osoitteen", async () => {
    const { latest } = renderIdentityProvider(integration("adfs"), { metadataUrl: METADATA_URL });
    const file = metadataFileOf();
    expect(metadataUrlInput()).toHaveValue(METADATA_URL);

    await drop([file]);

    expect(latest.metadataFileCalls).toEqual([[file]]);
    expect(latest.metadataUrlCalls).toEqual([""]);
    expect(screen.getByText("metadata.xml")).toBeInTheDocument();
    await waitFor(() => expect(metadataUrlInput()).toHaveValue(""));
  });

  it("kun tiedosto on valittu, tyhjä osoite ei ole pakollinen", () => {
    renderIdentityProvider(integration("adfs"), { metadataFile: [metadataFileOf()] });
    expect(screen.queryByText("metadataUrlField on pakollinen kenttä")).not.toBeInTheDocument();
    expect(metadataUrlInput()).not.toHaveAttribute("aria-invalid", "true");
  });

  it("pudotetun tiedoston poisto kutsuu setMetadataFile([])", async () => {
    const actor = userEvent.setup();
    const { latest } = renderIdentityProvider(integration("adfs"));
    await drop([metadataFileOf()]);

    await actor.click(within(dropZone()).getByRole("button"));

    expect(latest.metadataFileCalls.at(-1)).toEqual([]);
    expect(screen.getByText("Drag & Drop metadata file")).toBeInTheDocument();
  });

  it("osoitteen kirjoitus valitun tiedoston jälkeen tyhjentää tiedoston", async () => {
    const actor = userEvent.setup();
    const { latest } = renderIdentityProvider(integration("adfs"), { metadataFile: [metadataFileOf()] });

    await actor.type(metadataUrlInput(), "h");

    expect(latest.metadataUrlCalls).toEqual(["h"]);
    expect(latest.metadataFileCalls).toEqual([[]]);
    expect(latest.metadataFile).toEqual([]);
  });
});

describe("gsuite: vain metadata-tiedosto", () => {
  it("ei osoitekenttää eikä 'tai'-tekstiä; pudotusalue metadataUrl-otsikolla", () => {
    renderIdentityProvider(integration("gsuite"));
    expect(screen.queryByPlaceholderText("Lisää metadataUrlField")).not.toBeInTheDocument();
    expect(screen.queryByText("tai")).not.toBeInTheDocument();
    expect(screen.getByText("metadataUrl")).toBeInTheDocument();
    expect(screen.getByText("Drag & Drop metadata file")).toBeInTheDocument();
  });

  it("tiedoston pudotus asettaa tiedoston koskematta osoitteeseen", async () => {
    const { latest } = renderIdentityProvider(integration("gsuite"));
    const file = metadataFileOf("google.xml");

    await drop([file]);

    expect(latest.metadataFileCalls).toEqual([[file]]);
    expect(latest.metadataUrlCalls).toEqual([]);
    expect(screen.getByText("google.xml")).toBeInTheDocument();
  });
});
