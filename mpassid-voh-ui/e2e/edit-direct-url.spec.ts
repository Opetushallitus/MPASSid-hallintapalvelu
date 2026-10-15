import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  saveIntegration,
} from "./helpers";

// The edit page without the navigation's location.state - the edit URL
// opened directly, from a bookmark or in a new tab. IntegrationDetails.tsx
// then loads the integration by id (it used to crash with a TypeError and
// showed the generic error instead of the not-found message).

test("muokkaus-URL tuntemattomalle integraatiolle näyttää 'ei löydy' -ilmoituksen", async ({
  page,
}) => {
  await page.goto("/muokkaa/idp/wilma/999999");

  await expect(page.getByText("Integraatiota 999999 ei löydy")).toBeVisible();
  await page.getByRole("link", { name: "etusivulle" }).click();
  await expect(page).toHaveURL("/");
});

test("muokkaus-URL ilman navigoinnin tilaa lataa integraation id:llä", async ({ page }) => {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "suora-url.inschool.fi");
  await fillCommonIdpSteps(page, "Suoran URL:n koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  const id = new URL(page.url()).pathname.split("/").pop();

  // An SPA navigation with no state (pushState + popstate), as when the URL
  // is opened without the edit button.
  await page.evaluate((path) => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  }, `/muokkaa/idp/wilma/${id}`);

  await expect(page).toHaveURL(new RegExp(`/muokkaa/idp/wilma/${id}$`));
  const hostnameInput = page.getByPlaceholder("Lisää hostname");
  await expect(hostnameInput).toHaveValue("suora-url.inschool.fi");
  await expect(page.getByPlaceholder("Lisää OKJ:n näyttönimi")).toHaveValue("Suoran URL:n koulu");

  await hostnameInput.fill("suora-url-v2.inschool.fi");
  await saveIntegration(page);
  await expect(page).toHaveURL(new RegExp(`/integraatio/${id}$`));
  await expect(page.getByText("suora-url-v2.inschool.fi").first()).toBeVisible();
});

test("muokkaus-URL kirjoitettuna osoiteriville (sivun uudelleenlataus) lataa integraation", async ({
  page,
}) => {
  // A full page load: the mock keeps its integrations in sessionStorage
  // (requestLogicHandlers.ts), so the saved integration is still there.
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "osoiterivi.inschool.fi");
  await fillCommonIdpSteps(page, "Osoiterivin koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  const id = new URL(page.url()).pathname.split("/").pop();

  await page.goto(`/integraatio/${id}`);
  await expect(page.getByText("osoiterivi.inschool.fi").first()).toBeVisible();

  await page.goto(`/muokkaa/idp/wilma/${id}`);
  await expect(page.getByPlaceholder("Lisää hostname")).toHaveValue("osoiterivi.inschool.fi");
});
