import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  saveIntegration,
} from "./helpers";

// Logon käsittely (schoolSelection/LogoField.tsx, utils/resizeImage.ts):
// logo pienennetään mahtumaan 125x36:een kuvasuhde säilyttäen, mahtuvaa ei
// suurenneta, ja kuva, jota selain ei saa avattua, näyttää virheen. Muut
// testit käyttävät 1x1-logoa (fillCommonIdpSteps), joka palautetaan
// sellaisenaan - itse pienennys ei silloin koskaan aja.

/** A solid-colour PNG of the given size, drawn by the browser's own canvas. */
async function png(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#c00";
      context.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    [width, height] as const
  );
  return Buffer.from(base64, "base64");
}

/** The new logo's preview (alt "logo", not the saved logo's "organisaation logo"). */
const preview = (page: Page) => page.getByAltText("logo", { exact: true });

/**
 * Waits until the preview has the given natural size. Polled: the previous
 * logo's preview (fillCommonIdpSteps' 1x1) stays until the new one is
 * resized and decoded.
 */
async function expectPreviewSize(page: Page, width: number, height: number) {
  await expect(preview(page)).toBeVisible();
  await expect
    .poll(() =>
      preview(page).evaluate((img: HTMLImageElement) => ({
        width: img.naturalWidth,
        height: img.naturalHeight,
      }))
    )
    .toEqual({ width, height });
}

/** The logo input once a logo is chosen (its label is then just "Valitse"). */
const logoInput = (page: Page) => page.getByLabel("Valitse", { exact: true });

async function newWilma(page: Page, name: string) {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, `${name}.inschool.fi`);
}

test("leveä logo pienennetään kuvasuhde säilyttäen ja tallentuu", async ({ page }) => {
  await newWilma(page, "logo-levea");
  await fillCommonIdpSteps(page, "Leveän logon koulu");

  // 500x200 -> min(125/500, 36/200) = 0.18 -> 90x36 (height is the limit).
  await logoInput(page).setInputFiles({
    name: "levea.png",
    mimeType: "image/png",
    buffer: await png(page, 500, 200),
  });
  await expectPreviewSize(page, 90, 36);

  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
});

test("korkea logo pienennetään korkeuden mukaan", async ({ page }) => {
  await newWilma(page, "logo-korkea");
  await fillCommonIdpSteps(page, "Korkean logon koulu");

  // 100x400 -> min(1.25, 0.09) = 0.09 -> 9x36.
  await logoInput(page).setInputFiles({
    name: "korkea.png",
    mimeType: "image/png",
    buffer: await png(page, 100, 400),
  });
  await expectPreviewSize(page, 9, 36);
});

test("rajoihin mahtuvaa logoa ei suurenneta", async ({ page }) => {
  await newWilma(page, "logo-mahtuva");
  await fillCommonIdpSteps(page, "Mahtuvan logon koulu");

  await logoInput(page).setInputFiles({
    name: "mahtuva.png",
    mimeType: "image/png",
    buffer: await png(page, 100, 30),
  });
  await expectPreviewSize(page, 100, 30);
});

test("kuva, jota ei voi avata, näyttää virheen ja logo pysyy pakollisena", async ({ page }) => {
  await newWilma(page, "logo-rikki");
  const failure = page.getByText("Kuvan käsittely epäonnistui. Valitse toinen kuva.");

  await page.getByLabel(/Valitse, logo on pakollinen/i).setInputFiles({
    name: "rikki.png",
    mimeType: "image/png",
    buffer: Buffer.from("tämä ei ole kuva"),
  });
  await expect(failure).toBeVisible();
  await expect(page.getByText("Valitse, logo on pakollinen")).toBeVisible();
  await expect(preview(page)).toHaveCount(0);

  // A valid logo afterwards clears the error (fillCommonIdpSteps uploads one).
  await fillCommonIdpSteps(page, "Rikkinäisen logon koulu");
  await expect(failure).not.toBeVisible();
  await expect(preview(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tallenna", exact: true })).toBeEnabled({
    timeout: 15_000,
  });
});
