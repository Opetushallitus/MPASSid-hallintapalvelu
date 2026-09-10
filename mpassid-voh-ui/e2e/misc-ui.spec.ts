import { expect, test } from "@playwright/test";
import { dropTextFile, mockInstitutionTypes } from "./helpers";

test("'Luo' pysyy pois käytöstä kunnes palvelu on valittu (sp-integraatio)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("lisää").click();

  const dialog = page.getByRole("dialog", { name: "Luo uusi integraatio" });
  await expect(dialog).toBeVisible();

  await expect(
    page.getByRole("combobox", { name: "integraatio:" })
  ).toHaveText(/Koulutustoimija/i, { timeout: 15_000 });

  // "integraatio" defaults to 'sp' (NewIntegrationSelection.tsx:42) but
  // click it explicitly for clarity/robustness against that default ever
  // changing.
  await page.getByRole("combobox", { name: "integraatio:" }).click();
  await page.getByRole("option", { name: "Palveluintegraatio" }).click();

  await page.getByRole("combobox", { name: "tyyppi:" }).click();
  await page.getByRole("option", { name: "SAML", exact: true }).click();

  // Deliberately not touching "palvelu:" - `service` stays undefined
  // (NewIntegrationSelection.tsx:45,359-360).
  await expect(dialog.getByRole("button", { name: "Luo" })).toBeDisabled();

  await page.getByRole("combobox", { name: "palvelu:" }).click();
  await page.getByRole("option", { name: "Testi - uusi" }).click();

  await expect(dialog.getByRole("button", { name: "Luo" })).toBeEnabled();
});

test("metadataUrl ja tiedostolataus (ADFS) tyhjentävät toisensa", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await page.goto("/");
  await page.getByLabel("lisää").click();
  const dialog = page.getByRole("dialog", { name: "Luo uusi integraatio" });
  await page.getByRole("combobox", { name: "integraatio:" }).click();
  await page.getByRole("option", { name: "Koulutustoimija" }).click();
  await page.getByRole("combobox", { name: "tyyppi:" }).click();
  await page.getByRole("option", { name: "ADFS", exact: true }).click();
  await dialog.getByRole("button", { name: "Luo" }).click();

  await expect(page).toHaveURL(/\/muokkaa\/idp\/adfs\/0/);

  const metadataUrlInput = page.getByPlaceholder("Lisää metadata url", {
    exact: true,
  });
  await metadataUrlInput.fill(
    "https://adfs.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml"
  );
  await expect(metadataUrlInput).toHaveValue(/adfs\.esimerkki\.fi/);

  // Role/IdentityProvider.tsx's "tai" divider offers a file-drop as an
  // alternative to the URL - dropping a file clears metadataUrl
  // (updateMetadataUrl-adjacent onFilesDrop, IdentityProvider.tsx:196).
  const dropZone = page.getByText("Drag & Drop metadata file");
  await dropTextFile(
    page,
    dropZone,
    "adfs-metadata.xml",
    "text/xml",
    '<EntityDescriptor entityID="https://adfs.esimerkki.fi"></EntityDescriptor>'
  );

  await expect(metadataUrlInput).toHaveValue("");
  await expect(page.getByText("adfs-metadata.xml")).toBeVisible();

  // Filling metadataUrl again clears the dropped file the other way
  // (updateMetadataUrl, IdentityProvider.tsx:62-71).
  await metadataUrlInput.fill(
    "https://adfs2.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml"
  );
  await expect(page.getByText("adfs-metadata.xml")).not.toBeVisible();
  await expect(page.getByText("Drag & Drop metadata file")).toBeVisible();
});
