import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fillServiceName,
} from "./helpers";

// Covers EHDOTETUT_TESTIT.md's "7. Tallennuksen virhetilanteet" -
// integraationMuokkaus/index.tsx:151-200,367-406. There is no existing
// magic value in the mock and no proven precedent in this repo for
// page.route()-intercepting an MSW-service-worker-handled endpoint (see
// EHDOTETUT_TESTIT.md's notes) - a synthetic Response manufactured inside
// the SW never touches the actual network layer, so route() has nothing to
// intercept. Instead, src/mocks/requestLogicHandlers.ts's createIntegration/
// updateIntegration now recognize two magic "Palvelun nimi" values
// (E2E_TRIGGER_409/E2E_TRIGGER_GENERIC_ERROR) and return an error response
// via the {status,mock} hook the underlying openapi-backend-integration
// library already supports (same mechanism as the existing id===999995
// special-case in getIntegration()) - this is mock-only test
// infrastructure, not a production code change.

const E2E_TRIGGER_409 = "__e2e_trigger_409__";
const E2E_TRIGGER_GENERIC_ERROR = "__e2e_trigger_500__";

test("409-konflikti näyttää palvelimen antaman viestin", async ({ page }) => {
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
