import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fitWithin, resizeImage } from "./resizeImage";

describe("fitWithin", () => {
  it.each<[string, number, number, { width: number; height: number } | null]>([
    ["mahtuu jo: ei muutosta", 100, 30, null],
    ["täsmälleen rajoissa: ei muutosta", 125, 36, null],
    ["pieni mutta liian korkea: korkeus rajoittaa", 100, 50, { width: 72, height: 36 }],
    ["leveä: korkeus rajoittaa", 500, 200, { width: 90, height: 36 }],
    ["hyvin leveä: leveys rajoittaa", 1000, 100, { width: 125, height: 13 }],
    ["korkea", 100, 400, { width: 9, height: 36 }],
    ["neliö", 300, 300, { width: 36, height: 36 }],
    ["äärimmäisen leveä: vähintään 1 px", 100000, 10, { width: 125, height: 1 }],
  ])("%s (%i x %i)", (_name, width, height, expected) => {
    expect(fitWithin(width, height, 125, 36)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// resizeImage: jsdom has no image decoding or canvas, so both are faked.
// ---------------------------------------------------------------------------

let imageSize = { width: 0, height: 0 };
let imageFails = false;

class FakeImage {
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    setTimeout(() => {
      if (imageFails) {
        this.onerror?.();
      } else {
        this.width = imageSize.width;
        this.height = imageSize.height;
        this.onload?.();
      }
    });
  }
}

let context: { drawImage: ReturnType<typeof vi.fn> } | null;
let blob: Blob | null;
const canvas = {
  width: 0,
  height: 0,
  getContext: () => context,
  toBlob: (callback: (value: Blob | null) => void) => callback(blob),
};

const file = new File(["x"], "logo.png", { type: "image/png" });

beforeEach(() => {
  imageSize = { width: 0, height: 0 };
  imageFails = false;
  context = { drawImage: vi.fn() };
  blob = new Blob(["scaled"], { type: "image/png" });
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:fake"), revokeObjectURL: vi.fn() });
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
    tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : createElement(tag)
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resizeImage", () => {
  it("palauttaa tiedoston sellaisenaan, kun kuva mahtuu", async () => {
    imageSize = { width: 100, height: 30 };
    await expect(resizeImage(file, 125, 36)).resolves.toBe(file);
    expect(context!.drawImage).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("skaalaa leveän kuvan molempien rajojen sisään", async () => {
    imageSize = { width: 500, height: 200 };
    await expect(resizeImage(file, 125, 36)).resolves.toBe(blob);
    expect(canvas.width).toBe(90);
    expect(canvas.height).toBe(36);
    expect(context!.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 90, 36);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("hylkää, kun 2d-kontekstia ei ole (ennen lupaus jäi roikkumaan)", async () => {
    imageSize = { width: 500, height: 200 };
    context = null;
    await expect(resizeImage(file, 125, 36)).rejects.toThrow(/2d context/);
  });

  it("hylkää, kun toBlob epäonnistuu (ennen lupaus jäi roikkumaan)", async () => {
    imageSize = { width: 500, height: 200 };
    blob = null;
    await expect(resizeImage(file, 125, 36)).rejects.toThrow(/toBlob/);
  });

  it("hylkää, kun kuvaa ei voi ladata, ja vapauttaa osoitteen", async () => {
    imageFails = true;
    await expect(resizeImage(file, 125, 36)).rejects.toThrow(/could not be loaded/);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
