import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// Covers EHDOTETUT_TESTIT.md's "4. 'Peruuta' muokkauksessa" -
// integraationMuokkaus/index.tsx:297-298. "Peruuta" is a plain
// react-router `<Link>` styled as a Button (not a save-adjacent action), so
// it renders with role="link", not "button" - it navigates away without
// ever calling createIntegrationRaw/updateIntegrationRaw.

test("Peruuta luonnissa ei luo integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "peruutettu-luonti.inschool.fi";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, "Peruutettu koulu");

  // id==='0' branch: index.tsx:298 -> <Button component={Link} to="/">
  await page.getByRole("link", { name: "Peruuta", exact: true }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText(hostname, { exact: true })).not.toBeVisible();
});

test("Peruuta muokkauksessa hylkää tallentamattomat muutokset", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  const originalHostname = "alkuperainen.inschool.fi";
  await fillWilmaFields(page, originalHostname);
  await fillCommonIdpSteps(page, "Muuttumaton koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await page
    .getByPlaceholder("Lisää hostname")
    .fill("muutettu-mutta-hylatty.inschool.fi");

  // id!=='0' branch: index.tsx:297 -> <Button component={Link}
  // to={`/integraatio/${id}`}>
  await page.getByRole("link", { name: "Peruuta", exact: true }).click();
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await expect(page.getByPlaceholder("Lisää hostname")).toHaveValue(
    originalHostname
  );
});
