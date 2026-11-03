import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogoField from "./LogoField";

const resizeImage = vi.fn();
vi.mock("@/utils/resizeImage", () => ({
  resizeImage: (...args: unknown[]) => resizeImage(...args),
}));

const file = new File(["x"], "logo.png", { type: "image/png" });
const resized = new Blob(["resized"], { type: "image/png" });

let urlCount = 0;
beforeEach(() => {
  urlCount = 0;
  resizeImage.mockReset();
  resizeImage.mockResolvedValue(resized);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => `blob:preview-${++urlCount}`),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Owns newLogo like IntegrationDetails does. */
const renderLogoField = (logoUrl?: string) => {
  const onLogo = vi.fn();
  function Harness() {
    const [newLogo, setNewLogo] = useState(false);
    return (
      <LogoField
        logoUrl={logoUrl}
        newLogo={newLogo}
        onLogo={(logo) => {
          onLogo(logo);
          setNewLogo(true);
        }}
      />
    );
  }
  const utils = render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <Harness />
    </IntlProvider>
  );
  return { ...utils, onLogo };
};

describe("LogoField", () => {
  it("ilman logoa: valinta on pakollinen eikä esikatselua ole", () => {
    renderLogoField();
    expect(screen.getByLabelText(/Valitse, logo on pakollinen/)).toHaveAttribute("type", "file");
    expect(screen.getByLabelText(/Valitse, logo on pakollinen/)).not.toHaveAttribute("multiple");
    expect(screen.queryByAltText("logo")).not.toBeInTheDocument();
    expect(screen.queryByAltText("organisaation logo")).not.toBeInTheDocument();
  });

  it("valittu kuva skaalataan, esikatsellaan ja annetaan eteenpäin", async () => {
    const user = userEvent.setup();
    const { onLogo } = renderLogoField();

    await user.upload(screen.getByLabelText(/Valitse, logo on pakollinen/), file);

    expect(resizeImage).toHaveBeenCalledWith(file, 125, 36);
    await waitFor(() => expect(onLogo).toHaveBeenCalledWith(resized));
    expect(screen.getByAltText("logo")).toHaveAttribute("src", "blob:preview-1");
    expect(screen.getByText("Valitse")).toBeInTheDocument();
    expect(screen.queryByText("Valitse, logo on pakollinen")).not.toBeInTheDocument();
  });

  it("tallennettu logo näytetään, kunnes uusi valitaan", async () => {
    const user = userEvent.setup();
    renderLogoField("https://example.test/logo.png");
    expect(screen.getByAltText("organisaation logo")).toHaveAttribute(
      "src",
      "https://example.test/logo.png"
    );

    await user.upload(screen.getByLabelText(/Valitse/), file);

    await waitFor(() => expect(screen.getByAltText("logo")).toBeInTheDocument());
    expect(screen.queryByAltText("organisaation logo")).not.toBeInTheDocument();
  });

  it("uusi valinta vapauttaa edellisen esikatselun osoitteen, samoin poisto näkymästä", async () => {
    const user = userEvent.setup();
    const { unmount } = renderLogoField();

    await user.upload(screen.getByLabelText(/Valitse, logo on pakollinen/), file);
    await waitFor(() => expect(screen.getByAltText("logo")).toHaveAttribute("src", "blob:preview-1"));
    await user.upload(
      screen.getByLabelText(/Valitse/),
      new File(["y"], "toinen.png", { type: "image/png" })
    );
    await waitFor(() => expect(screen.getByAltText("logo")).toHaveAttribute("src", "blob:preview-2"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-2");
  });

  it("saman tiedoston voi valita uudelleen", async () => {
    const user = userEvent.setup();
    const { onLogo } = renderLogoField();

    await user.upload(screen.getByLabelText(/Valitse, logo on pakollinen/), file);
    await waitFor(() => expect(onLogo).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(/Valitse/)).toHaveValue("");
    await user.upload(screen.getByLabelText(/Valitse/), file);

    await waitFor(() => expect(onLogo).toHaveBeenCalledTimes(2));
  });

  it("käsittelyvirhe näytetään eikä logoa anneta eteenpäin (ennen lupaus jäi roikkumaan)", async () => {
    resizeImage.mockRejectedValue(new Error("toBlob failed"));
    const user = userEvent.setup();
    const { onLogo } = renderLogoField();

    await user.upload(screen.getByLabelText(/Valitse, logo on pakollinen/), file);

    expect(
      await screen.findByText("Kuvan käsittely epäonnistui. Valitse toinen kuva.")
    ).toBeInTheDocument();
    expect(onLogo).not.toHaveBeenCalled();
    expect(screen.queryByAltText("logo")).not.toBeInTheDocument();
  });
});
