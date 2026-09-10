import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  logBrowserConsole,
  mockInstitutionTypes,
  saveIntegration,
} from "./helpers";

test("luodun integraation kentät näkyvät oikein integraatio-sivulla", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

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
  logBrowserConsole(page);

  await page.goto("/integraatio/999999");

  await expect(
    page.getByText("Integraatiota 999999 ei löydy")
  ).toBeVisible();

  await page.getByRole("link", { name: "etusivulle" }).click();
  await expect(page).toHaveURL("/");
});
