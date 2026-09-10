import { expect, test } from "@playwright/test";
import {
  createNewSpIntegration,
  fillServiceName,
  logBrowserConsole,
} from "./helpers";

const E2E_TRIGGER_409 = "__e2e_trigger_409__";
const E2E_TRIGGER_GENERIC_ERROR = "__e2e_trigger_500__";

test("409-konflikti näyttää palvelimen antaman viestin", async ({ page }) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, E2E_TRIGGER_409);

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();
  await page.getByRole("button", { name: "OK" }).click();

  await expect(page.getByText("Muutosten tallenus epäonnistui")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("E2E-testin simuloima 409-konflikti")
  ).toBeVisible();
  // The generic fallback message must NOT show for this (message-bearing)
  // 409 - only one of the two branches in index.tsx:378-401 renders.
  await expect(
    page.getByText("Ongelma näytettäessä tietoja")
  ).not.toBeVisible();
});

test("yleinen virhe näyttää geneerisen virheilmoituksen", async ({ page }) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, E2E_TRIGGER_GENERIC_ERROR);

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();
  await page.getByRole("button", { name: "OK" }).click();

  await expect(page.getByText("Virhe", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("Ongelma näytettäessä tietoja")
  ).toBeVisible();
  await expect(
    page.getByText("Muutosten tallenus epäonnistui")
  ).not.toBeVisible();
});
