import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  saveIntegration,
} from "./helpers";

// Read-only-näkymän sisällön tarkistus -
// IntegrationDetails/index.tsx (the "Integraatiotiedot" tab) and
// IntegrationTab/index.tsx:102-118 (404 branch).
//
// Confirmed against a real run: doing a hard `page.goto()` reload to
// /integraatio/:id right after creating the integration in the SAME test
// does NOT "prove the fetch path independently" as originally assumed - it
// wiped the mock's in-memory `allIntegrations` (until 2026-10-14, see
// helpers.ts goHomeWithoutReload(); a fresh page load re-inits
// the whole module, same as every other "hard reload loses mock state"
// caveat throughout this suite), so the just-created integration is gone by
// the time the reloaded page fetches it. `saveIntegration()` already lands
// on /integraatio/:id via a normal SPA navigation, which exercises the same
// real `useIntegrationSafe({id})` fetch (IntegrationTab/index.tsx does not
// read from router state at all, unlike /muokkaa/...) without needing a
// reload - so the assertions just run directly from there.
//
// The 404 test needed a small mock fix: requestLogicHandlers.ts's
// getIntegration() previously always answered 200 (with an empty body) even
// for an unknown id, so IntegrationTab/index.tsx's `error?.response?.
// status===404` branch could never fire - the page just spun on its loading
// indicator forever. It now returns {status:404} when the id isn't found
// (mirrors how a real backend would behave).

test("luodun integraation kentät näkyvät oikein integraatio-sivulla", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "nakymatesti.inschool.fi";
  const displayName = "Näkymätestin koulu";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, displayName);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/(\d+)/);

  const integrationId = new URL(page.url()).pathname.split("/").pop();

  // .first() - "Mansikkalan testi kunta" legitimately appears twice: once as
  // the organization name and once as discoveryInformation.title (which
  // defaults to the organization name too, IntegrationDetails.tsx) - not a
  // bug, just two separate fields sharing a coincidental value here.
  await expect(page.getByText("Mansikkalan testi kunta").first()).toBeVisible();
  // Scoped to the "Integraatiotiedot" tabpanel - the id also appears as a
  // recently-visited-integrations tab ("avointen integraatiosivujen
  // navigaatio"), so an unscoped exact match is ambiguous.
  const detailsPanel = page.getByLabel("Integraatiotiedot");
  await expect(
    detailsPanel.getByText(String(integrationId), { exact: true })
  ).toBeVisible();
  // .first() - the hostname legitimately appears twice: once as
  // "Yksilöllinen tunniste" ("nakymatesti.inschool.fi (hostname)") and once
  // as the raw "hostname" data attribute row.
  await expect(page.getByText(hostname).first()).toBeVisible();
  await expect(page.getByText(displayName)).toBeVisible();
  // idp integrations always default to Tuotanto (deploymentPhase=1) at
  // creation - see environment-switch.spec.ts's file comment.
  await expect(page.getByText("Tuotanto", { exact: true })).toBeVisible();
});

test("olematon integraatio näyttää 404-viestin", async ({ page }) => {
  await page.goto("/integraatio/999999");

  await expect(
    page.getByText("Integraatiota 999999 ei löydy")
  ).toBeVisible();

  await page.getByRole("link", { name: "etusivulle" }).click();
  await expect(page).toHaveURL("/");
});
