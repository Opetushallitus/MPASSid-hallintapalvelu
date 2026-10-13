import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  dropTextFile,
  fillCommonIdpSteps,
  mockInstitutionTypes,
} from "./helpers";

// See create-wilma-integration.spec.ts and helpers.ts for general caveats.
// GSuite, like ADFS, has only one type-specific field: `metadataUrl`
// (config.ts:1113-1137, mandatory). Unlike ADFS, Role/IdentityProvider.tsx:
// 201-214 renders ONLY the drag-and-drop file zone for gsuite - no text
// field alternative - so this test must exercise the synthetic-drop
// workaround documented on helpers.ts's dropTextFile (the zone is a bare
// <div onDrop=...> with no <input type=file>, DragAndDropForm.tsx:70-97).
// The dropped file's *content* is never validated by the app (it's just
// stored as a File and later uploaded as configurationEntity.idp.
// metadataFile - IdentityProvider.tsx only checks metadataFile.length===1),
// so a placeholder XML body is fine.

test("luo uusi Google: Gsuite -integraatio", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Google: Gsuite");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/gsuite\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  const dropZone = page.getByText("Drag & Drop metadata file");
  await expect(dropZone).toBeVisible({ timeout: 15_000 });
  await dropTextFile(
    page,
    dropZone,
    "metadata.xml",
    "text/xml",
    "<EntityDescriptor entityID=\"https://accounts.google.com/o/saml2\"></EntityDescriptor>"
  );

  await fillCommonIdpSteps(page, "Mansikkalan Gsuite-koulu");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
