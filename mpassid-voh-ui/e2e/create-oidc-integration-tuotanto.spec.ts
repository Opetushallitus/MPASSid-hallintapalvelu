import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
} from "./helpers";

// Tuotanto-versio create-oidc-integration.spec.ts:sta - identtinen muuten,
// paitsi että "palvelu:"-valikosta valitaan "Tuotanto - uusi"
// "Testi - uusi":n sijaan (PossibleServices.tsx:86-94). SP-integraatioilla
// ei ole Palveluympäristö-valitsinta luonnin jälkeen
// (ServiceProvider.tsx:66-79 vain näyttää sen), niin ympäristö on
// valittava tässä, luontivaiheessa - ks. createNewSpIntegration()'s
// helpers.ts:ssä oleva kommentti.

test("luo uusi OIDC-palveluintegraatio Tuotanto-ympäristöön", async ({
  page,
}) => {
  await createNewSpIntegration(page, "OpenID Connect", "Tuotanto");

  await expect(page).toHaveURL(/\/muokkaa\/sp\/oidc\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();
  await expect(page.getByText("Palveluiden yhteiset tiedot")).toBeVisible();

  await page
    .getByPlaceholder("Lisää palvelun nimi", { exact: true })
    .fill("Mansikkalan tuotanto OIDC-palvelu");

  await expect(page.getByText("Palvelun metadata tiedot")).toBeVisible();

  // redirect_uris: mandatory array (config.ts:606-638). The prod-environment
  // validation row additionally requires 'https' and disallows 'localhost' -
  // a plain https URL with no fragment satisfies it.
  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp-tuotanto.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
