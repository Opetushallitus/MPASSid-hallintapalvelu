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
// IntegrationTab/index.tsx:102-118 (404 branch) and the ErrorBoundary
// fallback (components/ErrorFallback.tsx).
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

test("tietojen haun virhe näyttää yleisen virheilmoituksen (ErrorFallback)", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "virhenakyma.inschool.fi");
  await fillCommonIdpSteps(page, "Virhenäkymän koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  // The view page's IdentityProvider reads the institution types with the
  // throwing (suspense) koodisto hook, so a failed request reaches the
  // layout's ErrorBoundary. page.route() cannot fail it: after the reload the
  // MSW service worker answers it, so the mock's localStorage hook does
  // (src/mocks/requestLogicHandlers.ts E2E_KOODISTO_FAIL). The reload drops
  // the cached response; the mock keeps the integration in sessionStorage.
  await page.evaluate(() => window.localStorage.setItem("e2e-koodisto-fail", "1"));
  await page.reload();

  // Full load: see edit-direct-url.spec.ts for the longer timeout.
  await expect(page.getByText("Virhe", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Ongelma näytettäessä tietoja/)).toBeVisible();
});

// DataRow "set-list" (SetProvider.tsx): a set integration's
// "Palvelun integraatiot". Nothing in the UI creates a set integration, so it
// is seeded into the mock database (sessionStorage, see
// integration-selection.spec.ts) before the app loads.
test("set-integraation näkymä listaa sen integraatiot nimellä ja tunnistetyypillä", async ({
  page,
}) => {
  const member = (id: number, sp: Record<string, string>) => ({
    id,
    deploymentPhase: 1,
    active: true,
    configurationEntity: { sp },
  });
  const set = (id: number, name: string, integrationSets: unknown[]) => ({
    id,
    deploymentPhase: 1,
    active: true,
    organization: { oid: "1.2.246.562.10.00000000099", name: "Palveluorganisaatio" },
    configurationEntity: { set: { type: "set", name } },
    permissions: [],
    integrationSets,
  });
  const integrations = [
    set(8000001, "E2E-palvelukokonaisuus", [
      member(8000011, { type: "oidc", clientId: "e2e-oidc-client" }),
      member(8000012, { type: "saml", entityId: "https://sp.esimerkki.fi/e2e" }),
      member(8000013, { type: "saml", name: "E2E-nimellä" }),
    ]),
    set(8000002, "E2E-tyhjä kokonaisuus", []),
  ];
  await page.addInitScript(
    ({ key, value }) => {
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, value);
      }
    },
    { key: "mpassid-mock-integrations", value: JSON.stringify(integrations) }
  );

  await page.goto("/integraatio/8000001");
  await expect(page.getByText("Palvelun integraatiot")).toBeVisible({ timeout: 15_000 });
  // The identifier shown depends on the service provider's type.
  await expect(page.getByText("(Client-ID)")).toBeVisible();
  await expect(page.getByRole("link", { name: "e2e-oidc-client" })).toHaveAttribute(
    "href",
    "/integraatio/8000011"
  );
  await expect(page.getByText("(Entity-ID)")).toBeVisible();
  await expect(page.getByRole("link", { name: "https://sp.esimerkki.fi/e2e" })).toHaveAttribute(
    "href",
    "/integraatio/8000012"
  );
  await expect(page.getByText("(Name)")).toBeVisible();
  await expect(page.getByRole("link", { name: "E2E-nimellä" })).toHaveAttribute(
    "href",
    "/integraatio/8000013"
  );

  await page.goto("/integraatio/8000002");
  await expect(page.getByText("Palvelun integraatiot")).toBeVisible({ timeout: 15_000 });
  await expect(
    page
      .getByText("Integraatio lista", { exact: true })
      .locator(
        'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-root ")][1]/following-sibling::*[1]'
      )
  ).toHaveText("–");
});
