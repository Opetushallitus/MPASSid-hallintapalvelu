import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import {
  createNewSpIntegrationHere,
  fillServiceName,
  goHomeWithoutReload,
  saveIntegration,
} from "./helpers";

// Avointen integraatioiden välilehdet yläpalkissa (layouts/Basic/AppBar):
// integraatiosivu (routes/integraatio) avaa oman välilehtensä, ja välilehden
// ruksi (InterfaceTab.tsx, näkyy hiiren ollessa välilehden päällä) sulkee
// sen. Välilehdet ovat sessionStoragessa, joten ne säilyvät uudelleen-
// latauksessa.
//
// Integraatiot luodaan OIDC-palveluina (nopein luotava tyyppi); välilehtien
// käsittely ei riipu integraation tyypistä.

const openTabs = (page: Page) =>
  page.getByRole("tablist", {
    name: "avointen integraatiosivujen navigaatio, mpassid-hallintapalvelu",
  });

const tab = (page: Page, id: string) =>
  openTabs(page).getByRole("tab", { name: id, exact: true });

/** Creates an OIDC service from the home page and returns its id (lands on its page). */
async function createService(page: Page, name: string): Promise<string> {
  await createNewSpIntegrationHere(page, "OpenID Connect", "Testi");
  await fillServiceName(page, name);
  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://palvelu.mansikkala.fi/oidc/callback");
  await redirectUriInput.press("Enter");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+$/);
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** Creates `count` services; returns their ids in creation order (the last one is open). */
async function createServices(page: Page, count: number): Promise<string[]> {
  await page.goto("/");
  const ids: string[] = [];
  for (let index = 0; index < count; index++) {
    if (index > 0) {
      await goHomeWithoutReload(page);
    }
    ids.push(await createService(page, `Välilehtitestin palvelu ${index + 1}`));
  }
  return ids;
}

async function closeTab(page: Page, id: string) {
  await tab(page, id).hover();
  await tab(page, id).getByTestId("CloseIcon").click();
}

/** The integration page of `id` is shown (and its content has loaded). */
async function expectOnIntegrationPage(page: Page, id: string) {
  await expect(page).toHaveURL(new RegExp(`/integraatio/${id}$`));
  await expect(page.getByText(`Jäsen ${id}`, { exact: true })).toBeVisible();
}

test("avatut integraatiot näkyvät välilehtinä, uusin ensin, ja avoin on valittuna", async ({
  page,
}) => {
  const [a, b, c] = await createServices(page, 3);

  await expect(openTabs(page).getByRole("tab")).toHaveText([c, b, a]);
  await expect(tab(page, c)).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, a)).toHaveAttribute("aria-selected", "false");

  // Välilehteä klikkaamalla avautuu sen integraatio.
  await tab(page, a).click();
  await expectOnIntegrationPage(page, a);
  await expect(tab(page, a)).toHaveAttribute("aria-selected", "true");
  await expect(openTabs(page).getByRole("tab")).toHaveText([c, b, a]);
});

test("avoimen integraation välilehden sulkeminen siirtyy viereiseen, eikä suljettu välilehti palaa", async ({
  page,
}) => {
  const [a, b, c] = await createServices(page, 3);

  // Ennen korjausta suljettu välilehti palasi heti listan alkuun: sivu
  // lisäsi sen takaisin ennen kuin navigointi ehti vaihtaa sivun.
  await closeTab(page, c);
  await expectOnIntegrationPage(page, b);
  await expect(openTabs(page).getByRole("tab")).toHaveText([b, a]);
  await expect(tab(page, b)).toHaveAttribute("aria-selected", "true");

  // Viimeisenä olevan välilehden sulkeminen siirtyy edelliseen.
  await tab(page, a).click();
  await expectOnIntegrationPage(page, a);
  await closeTab(page, a);
  await expectOnIntegrationPage(page, b);
  await expect(openTabs(page).getByRole("tab")).toHaveText([b]);

  // Suljetut pysyvät suljettuina myös uudelleenlatauksen jälkeen.
  await page.reload();
  await expectOnIntegrationPage(page, b);
  await expect(openTabs(page).getByRole("tab")).toHaveText([b]);
});

test("toisen välilehden sulkeminen pysyy avoimen integraation sivulla", async ({
  page,
}) => {
  const [a, b, c] = await createServices(page, 3);
  const historyLength = () => page.evaluate(() => window.history.length);
  const historyBefore = await historyLength();

  await closeTab(page, a);
  await expect(openTabs(page).getByRole("tab")).toHaveText([c, b]);
  await expectOnIntegrationPage(page, c);

  await closeTab(page, b);
  await expect(openTabs(page).getByRole("tab")).toHaveText([c]);
  await expectOnIntegrationPage(page, c);

  // Ennen korjausta jokainen sulkeminen navigoi samalle sivulle uudelleen
  // ja lisäsi selaushistoriaan rivin (Takaisin-painike ei vaihtanut sivua).
  expect(await historyLength()).toBe(historyBefore);
});

test("ainoan välilehden sulkeminen vie etusivulle, eikä välilehti palaa", async ({
  page,
}) => {
  const [a] = await createServices(page, 1);
  await expect(openTabs(page).getByRole("tab")).toHaveText([a]);

  await closeTab(page, a);
  await expect(page).toHaveURL("/");
  await expect(openTabs(page).getByRole("tab")).toHaveCount(0);

  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(openTabs(page).getByRole("tab")).toHaveCount(0);
});

test("välilehden sulkeminen etusivulla ei vaihda sivua, ja suljetun voi avata uudelleen", async ({
  page,
}) => {
  const [a, b] = await createServices(page, 2);
  await goHomeWithoutReload(page);

  await closeTab(page, b);
  await expect(page).toHaveURL("/");
  await expect(openTabs(page).getByRole("tab")).toHaveText([a]);

  // Suljetun integraation avaaminen (tässä osoitteella) avaa välilehden uudelleen.
  await page.goto(`/integraatio/${b}`);
  await expectOnIntegrationPage(page, b);
  await expect(openTabs(page).getByRole("tab")).toHaveText([b, a]);
});
