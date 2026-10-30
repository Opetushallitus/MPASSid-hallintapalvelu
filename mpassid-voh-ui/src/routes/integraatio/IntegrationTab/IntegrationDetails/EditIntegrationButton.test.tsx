import type { Components } from "@/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditIntegrationButton, { hasEditData } from "./EditIntegrationButton";

const api = vi.hoisted(() => ({ refetchIntegration: vi.fn() }));
vi.mock("@/api", () => api);

const school = { name: "Mansikkalan testi lukio", oppilaitostyyppi: "oppilaitostyyppi_15#1", oppilaitosKoodi: "30077" };

const idp = (organization: Components.Schemas.Organization): Components.Schemas.Integration => ({
  id: 9000001,
  configurationEntity: { idp: { type: "wilma" } as Components.Schemas.IdentityProvider },
  organization,
});

describe("hasEditData", () => {
  it("idp: vaatii organisaation koulut oppilaitostyyppeineen", () => {
    expect(hasEditData(idp({ oid: "1", children: [school] }))).toBe(true);
    // The save response: no schools.
    expect(hasEditData(idp({ oid: "1" }))).toBe(false);
    expect(hasEditData(idp({ oid: "1", children: [] }))).toBe(false);
    expect(hasEditData(idp({ oid: "1", children: [{ name: "Päiväkoti" }] }))).toBe(false);
  });

  it("sp ja set eivät tarvitse kouluja", () => {
    expect(hasEditData({ id: 1, configurationEntity: { sp: { type: "saml" } as Components.Schemas.ServiceProvider } })).toBe(true);
    expect(hasEditData({ id: 2, configurationEntity: { set: { type: "set" } as Components.Schemas.IntegrationSet } })).toBe(true);
  });
});

/** The edit route: shows whether the navigation carried an integration. */
function EditPage() {
  const { state } = useLocation();
  return <div>{state ? `tila: ${(state as Components.Schemas.Integration).id}` : "ei tilaa"}</div>;
}

const renderButton = (integration: Components.Schemas.Integration) =>
  render(
    <IntlProvider locale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={["/integraatio/9000001"]}>
        <Routes>
          <Route path="/integraatio/:id" element={<EditIntegrationButton integration={integration} />} />
          <Route path="/muokkaa/idp/wilma/:id" element={<EditPage />} />
        </Routes>
      </MemoryRouter>
    </IntlProvider>
  );

describe("EditIntegrationButton", () => {
  beforeEach(() => {
    api.refetchIntegration.mockReset();
  });

  it("täydellinen integraatio välitetään muokkaukseen navigoinnin mukana", async () => {
    renderButton(idp({ oid: "1", children: [school] }));

    await userEvent.click(screen.getByRole("link", { name: "lisää" }));

    expect(await screen.findByText("tila: 9000001")).toBeInTheDocument();
    expect(api.refetchIntegration).not.toHaveBeenCalled();
  });

  it("ilman kouluja: integraatio haetaan uudelleen ja muokkaus avataan ilman tilaa", async () => {
    let resolve!: () => void;
    api.refetchIntegration.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    renderButton(idp({ oid: "1" }));

    await userEvent.click(screen.getByRole("link", { name: "lisää" }));

    expect(api.refetchIntegration).toHaveBeenCalledWith({ id: 9000001 });
    // Not before the refetch has finished.
    expect(screen.queryByText("ei tilaa")).not.toBeInTheDocument();
    resolve();
    expect(await screen.findByText("ei tilaa")).toBeInTheDocument();
  });

  it("epäonnistunut uudelleenhaku ei estä muokkauksen avaamista", async () => {
    api.refetchIntegration.mockRejectedValue(new Error("verkko"));
    renderButton(idp({ oid: "1" }));

    await userEvent.click(screen.getByRole("link", { name: "lisää" }));

    await waitFor(() => expect(screen.getByText("ei tilaa")).toBeInTheDocument());
  });
});
