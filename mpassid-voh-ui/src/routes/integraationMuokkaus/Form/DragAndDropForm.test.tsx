import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import FileUploader from "./DragAndDropForm";

// fileExist/mandatoryColor/emptyFiles have defaults but are typed as required.
type Props = Partial<ComponentProps<typeof FileUploader>> &
  Pick<ComponentProps<typeof FileUploader>, "onDelete">;

const metadataFile = new File(["<EntityDescriptor/>"], "metadata.xml", { type: "text/xml" });
const otherFile = new File(["<EntityDescriptor/>"], "toinen.xml", { type: "text/xml" });

const wrap = (props: Props) => (
  <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
    <FileUploader {...(props as ComponentProps<typeof FileUploader>)} />
  </IntlProvider>
);

const renderUploader = (overrides: Partial<Props> = {}) => {
  const props: Props = { onDelete: vi.fn(), onFilesDrop: vi.fn(), ...overrides };
  const utils = render(wrap(props));
  return { ...utils, props };
};

/** The drop zone (the element carrying the drag handlers and the state class). */
const dropZone = (container: HTMLElement) =>
  container.querySelector(".input-container > div") as HTMLElement;

const drop = async (zone: HTMLElement, files: File[]) => {
  let notCancelled = true;
  await act(async () => {
    notCancelled = fireEvent.drop(zone, { dataTransfer: { files } });
  });
  return notCancelled;
};

describe("FileUploader (DragAndDropForm)", () => {
  describe("alkutila", () => {
    it("näyttää pudotusohjeen eikä poistopainiketta", () => {
      renderUploader();
      expect(screen.getByText("Drag & Drop metadata file")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it.each([
      ["oletukset (fileExist=true)", {}, "input-zone"],
      ["fileExist=true ja mandatoryColor", { fileExist: true, mandatoryColor: true }, "input-zone"],
      ["tiedosto puuttuu, ei pakollinen", { fileExist: false }, "input-zone-grey"],
      ["tiedosto puuttuu, pakollinen", { fileExist: false, mandatoryColor: true }, "input-zone-missing"],
    ] as const)("tyyliluokka: %s", (_name, overrides, className) => {
      const { container } = renderUploader(overrides);
      expect(dropZone(container).className).toBe(className);
    });
  });

  describe("raahaus", () => {
    it.each([
      ["ei pakollinen", false, "input-zone-grey"],
      ["pakollinen", true, "input-zone-missing"],
    ])("raahaus alueen päälle korostaa (%s) ja poistuminen palauttaa", (_name, mandatoryColor, base) => {
      const { container } = renderUploader({ fileExist: false, mandatoryColor });
      const zone = dropZone(container);

      fireEvent.dragEnter(zone);
      expect(zone.className).toBe(`${base} drag-over`);

      fireEvent.dragLeave(zone);
      expect(zone.className).toBe(base);

      fireEvent.dragOver(zone);
      expect(zone.className).toBe(`${base} drag-over`);
    });

    it("fileExist=true: raahaus ei muuta tyyliluokkaa", () => {
      const { container } = renderUploader({ fileExist: true });
      const zone = dropZone(container);
      fireEvent.dragEnter(zone);
      expect(zone.className).toBe("input-zone");
    });

    it("dragEnter/dragOver estävät selaimen oletustoiminnon (pudotus sallitaan)", () => {
      const { container } = renderUploader({ fileExist: false });
      const zone = dropZone(container);
      expect(fireEvent.dragEnter(zone)).toBe(false);
      expect(fireEvent.dragOver(zone)).toBe(false);
    });
  });

  describe("pudotus", () => {
    it("yksi tiedosto: onFilesDrop saa tiedostot, nimi ja poistopainike näytetään", async () => {
      const { container, props } = renderUploader({ fileExist: false });

      await drop(dropZone(container), [metadataFile]);

      expect(props.onFilesDrop).toHaveBeenCalledTimes(1);
      expect(vi.mocked(props.onFilesDrop!).mock.calls[0][0]).toEqual([metadataFile]);
      expect(vi.mocked(props.onFilesDrop!).mock.calls[0][1]).toHaveProperty("type", "drop");
      expect(screen.getByText("metadata.xml")).toBeInTheDocument();
      expect(screen.queryByText("Drag & Drop metadata file")).not.toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("useampi tiedosto: kaikki annetaan onFilesDrop:lle, mutta näytetään varoitus", async () => {
      const { container, props } = renderUploader({ fileExist: false });

      await drop(dropZone(container), [metadataFile, otherFile]);

      expect(vi.mocked(props.onFilesDrop!).mock.calls[0][0]).toEqual([metadataFile, otherFile]);
      expect(screen.getByText("Drag & Drop only one metadata file")).toBeInTheDocument();
      expect(screen.queryByText("metadata.xml")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("toimii ilman onFilesDrop-callbackia", async () => {
      const { container } = renderUploader({ onFilesDrop: undefined });
      await drop(dropZone(container), [metadataFile]);
      expect(screen.getByText("metadata.xml")).toBeInTheDocument();
    });

    it("ilman onFilesDrop-callbackia pudotuksen oletustoiminto estetään", async () => {
      const { container } = renderUploader({ onFilesDrop: undefined });
      expect(await drop(dropZone(container), [metadataFile])).toBe(false);
    });

    // Korjattu: preventDefault kutsutaan ennen onFilesDrop:n await:ia.
    it("onFilesDrop-callbackin kanssa pudotuksen oletustoiminto estetään", async () => {
      const { container } = renderUploader();
      expect(await drop(dropZone(container), [metadataFile])).toBe(false);
    });

    // Korjattu: pudotus nollaa raahaustilan, joten korostus (drag-over) poistuu.
    it("pudotuksen jälkeen raahauskorostus poistuu", async () => {
      const { container } = renderUploader({ fileExist: false });
      const zone = dropZone(container);
      fireEvent.dragEnter(zone);
      await drop(zone, [metadataFile, otherFile]);
      expect(zone.className).toBe("input-zone-grey");
    });
  });

  describe("poisto", () => {
    it("poistopainike kutsuu onDelete ja palauttaa pudotusohjeen", async () => {
      const user = userEvent.setup();
      const { container, props } = renderUploader({ fileExist: false });
      await drop(dropZone(container), [metadataFile]);

      await user.click(screen.getByRole("button"));

      expect(props.onDelete).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Drag & Drop metadata file")).toBeInTheDocument();
      expect(screen.queryByText("metadata.xml")).not.toBeInTheDocument();
    });

    it("poisto nollaa myös raahauskorostuksen", async () => {
      const user = userEvent.setup();
      const { container } = renderUploader({ fileExist: false });
      const zone = dropZone(container);
      fireEvent.dragEnter(zone);
      await drop(zone, [metadataFile]);

      await user.click(screen.getByRole("button"));

      expect(zone.className).toBe("input-zone-grey");
    });
  });

  describe("emptyFiles", () => {
    it("emptyFiles muuttuu true -> false: näytetty tiedosto tyhjennetään (vanhempi poisti tiedoston)", async () => {
      const props: Props = { onDelete: vi.fn(), onFilesDrop: vi.fn(), fileExist: false };
      const { container, rerender } = render(wrap(props));
      await drop(dropZone(container), [metadataFile]);

      // Parent stores the file (IdentityProvider: emptyFiles = metadataFile.length === 1).
      rerender(wrap({ ...props, fileExist: true, emptyFiles: true }));
      expect(screen.getByText("metadata.xml")).toBeInTheDocument();

      rerender(wrap({ ...props, fileExist: false, emptyFiles: false }));
      expect(screen.queryByText("metadata.xml")).not.toBeInTheDocument();
      expect(screen.getByText("Drag & Drop metadata file")).toBeInTheDocument();
      expect(props.onDelete).not.toHaveBeenCalled();
    });

    it("emptyFiles=false ei tyhjennä pudotettua tiedostoa ilman muutosta propissa", async () => {
      const props: Props = { onDelete: vi.fn(), onFilesDrop: vi.fn(), fileExist: false };
      const { container, rerender } = render(wrap(props));
      await drop(dropZone(container), [metadataFile]);

      rerender(wrap({ ...props }));

      expect(screen.getByText("metadata.xml")).toBeInTheDocument();
    });
  });
});
