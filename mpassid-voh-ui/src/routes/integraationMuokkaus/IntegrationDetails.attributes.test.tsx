import type { Components } from "@/api";
import { render, waitFor } from "@testing-library/react";
import { cloneDeep } from "lodash";
import { useRef, useState } from "react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import IntegrationDetails from "./IntegrationDetails";
import { dataConfiguration } from "../../config";

// ---------------------------------------------------------------------------
// IntegrationDetails together with the real Attributes (IntegrationDetails.
// test.tsx stubs it): what an opened integration's draft looks like before
// the user changes anything.
//
// A value kept only in an idp field (e.g. an old Wilma's idp.hostname with no
// hostname attribute) is copied into the attributes when the form opens. The
// draft then differs from the original, so the integration opens as changed
// and can be saved right away - the save writes the idp value as an
// attribute as well. This is intended (decided 2026-10-14): before, such an
// integration could not be saved at all, as the mandatory attribute was
// missing.
// ---------------------------------------------------------------------------

vi.mock("@/api", () => ({ useIntegrationSafe: () => [new Error("ei haeta"), undefined] }));
vi.mock("./SchoolSelection", () => ({ default: () => null }));
vi.mock("./Role", () => ({ default: () => null }));
vi.mock("./Metadata", () => ({ default: () => null }));
vi.mock("./IntegrationBasicDetails", () => ({ default: () => null }));
vi.mock("../integraatio/IntegrationTab/DataRow", () => ({ DataRow: () => null }));

const ORG = { oid: "1.2.246.562.10.00000000001", name: "Mansikkalan testi kunta" };

const integrationWith = (
  idp: Record<string, unknown>,
  attributes: Components.Schemas.Attribute[]
): Components.Schemas.Integration => ({
  id: 5,
  deploymentPhase: 1,
  organization: ORG as Components.Schemas.Integration["organization"],
  configurationEntity: {
    attributes,
    idp: {
      institutionTypes: [11],
      logoUrl: "https://example.test/logo.png",
      flowName: "x",
      idpId: "x",
      ...idp,
    } as Components.Schemas.IdentityProvider,
  },
  discoveryInformation: { showSchools: true, schools: [], excludedSchools: [], title: "Otsikko" },
});

const data = (name: string, content: string): Components.Schemas.Attribute => ({ type: "data", name, content });

interface Latest {
  canSave: boolean;
  newIntegration?: Components.Schemas.Integration;
}

const renderDetails = (integration: Components.Schemas.Integration) => {
  const latest: Latest = { canSave: false };

  function Harness() {
    // Stable setters, as in index.tsx (they are effect dependencies).
    const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration>();
    const [canSave, setCanSave] = useState(false);
    const [metadataFile, setMetadataFile] = useState<File[]>([]);
    const [, setSaveDialogState] = useState(true);
    const [, setLogo] = useState<Blob>();
    const deploymentPhase = useRef(-5);
    latest.canSave = canSave;
    latest.newIntegration = newIntegration;
    return (
      <IntegrationDetails
        id={integration.id!}
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

  render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[{ pathname: "/muokkaa", state: cloneDeep(integration) }]}>
        <Harness />
      </MemoryRouter>
    </IntlProvider>
  );
  return latest;
};

const attributesOf = (latest: Latest) => latest.newIntegration?.configurationEntity?.attributes;

/** Lets the initialization settle (several effect rounds). */
const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

describe("avattu integraatio: idp-kentän arvo ja attribuutit", () => {
  it("wilma: hostname idp-kentässä ja attribuuttina -> luonnos ei muutu, ei tallennettavaa", async () => {
    const integration = integrationWith({ type: "wilma", hostname: "a.inschool.fi" }, [
      data("datasource", "wilma"),
      data("hostname", "a.inschool.fi"),
    ]);
    const latest = renderDetails(integration);
    await waitFor(() => expect(latest.newIntegration).toBeDefined());
    await settle();

    expect(latest.newIntegration).toEqual(integration);
    expect(latest.canSave).toBe(false);
  });

  it("wilma: hostname vain idp-kentässä -> kopioidaan attribuutiksi, ja integraation voi tallentaa heti", async () => {
    const integration = integrationWith({ type: "wilma", hostname: "a.inschool.fi" }, [data("datasource", "wilma")]);
    const latest = renderDetails(integration);

    await waitFor(() => expect(attributesOf(latest)).toContainEqual(data("hostname", "a.inschool.fi")));
    expect(attributesOf(latest)).toContainEqual(data("datasource", "wilma"));
    expect(latest.newIntegration?.configurationEntity?.idp).toEqual(integration.configurationEntity?.idp);
    await waitFor(() => expect(latest.canSave).toBe(true));
  });

  it("opinsys: tenantId vain idp-kentässä -> kopioidaan attribuutiksi", async () => {
    const attributes = [data("clientId", "c"), data("clientKey", "k"), data("datasource", "opinsys")];
    const latest = renderDetails(integrationWith({ type: "opinsys", tenantId: "t1" }, attributes));

    await waitFor(() => expect(attributesOf(latest)).toContainEqual(data("tenantId", "t1")));
  });

  it("opinsys: tenantId idp-kentässä ja attribuuttina -> luonnos ei muutu", async () => {
    const integration = integrationWith({ type: "opinsys", tenantId: "t1" }, [
      data("clientId", "c"),
      data("clientKey", "k"),
      data("datasource", "opinsys"),
      data("tenantId", "t1"),
    ]);
    const latest = renderDetails(integration);
    await waitFor(() => expect(latest.newIntegration).toBeDefined());
    await settle();

    expect(latest.newIntegration).toEqual(integration);
  });
});
