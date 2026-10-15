import type { Components } from "@/api";
import { act, configure, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AttributeTest from "./AttributeTest";
import { dataConfiguration, type UiConfiguration } from "../../config";

// ---------------------------------------------------------------------------
// Mocks: the two backend test endpoints.
// ---------------------------------------------------------------------------

const testAttributesAuthorization = vi.hoisted(() => vi.fn());
const testAttributes = vi.hoisted(() => vi.fn());
vi.mock("@/api", () => ({
  testAttributesAuthorization: (...args: unknown[]) => testAttributesAuthorization(...args),
  testAttributes: (...args: unknown[]) => testAttributes(...args),
}));

configure({ asyncUtilTimeout: 4000 });
vi.setConfig({ testTimeout: 20000 });

beforeEach(() => {
  testAttributesAuthorization.mockReset();
  // The backend answers true when authorized.
  testAttributesAuthorization.mockResolvedValue(true);
  testAttributes.mockReset();
  testAttributes.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_OID = "1.2.246.562.10.00000000001";
const SPECIAL_OID = "1.2.246.562.10.21199106507";

const user = (name: string, content: string): Components.Schemas.Attribute => ({ type: "user", name, content });

/** Azure user attributes as index.tsx passes them (type 'user' only). */
const ATTRIBUTES = [
  user("roles", "extension_roles"),
  user("surname", "surname"),
  user("firstName", "givenName"),
  user("groups", "memberOf.displayName"),
  user("schoolIds", "extension_school.ids"),
  user("learnerId", "extension_school.learner.id"),
  user("nickname", "nickname"),
];

/** A testAttributes response for ATTRIBUTES. */
const RESPONSE = {
  givenName: "Matti",
  surname: "Meikäläinen",
  memberOf: { displayName: ["7A", "7B"] },
  extension_school: { ids: { koulu: "00001" }, learner: { id: "1.2.246.562.24.1" } },
  extension_roles: "Oppilas",
};

// ---------------------------------------------------------------------------
// Harness: owns the dialog's open state like index.tsx does.
// ---------------------------------------------------------------------------

interface Latest {
  open: boolean;
  setOpenCalls: boolean[];
  setOpen: (open: boolean) => void;
}

interface Options {
  id?: string;
  attributes?: Components.Schemas.Attribute[];
  oid?: string;
  environment?: number;
  configuration?: UiConfiguration[];
}

const renderAttributeTest = ({
  id = "5",
  attributes = ATTRIBUTES,
  oid = ORG_OID,
  environment = 1,
  configuration = dataConfiguration,
}: Options = {}) => {
  const latest: Latest = { open: true, setOpenCalls: [], setOpen: () => {} };

  function Harness() {
    const [open, setOpenState] = useState(true);
    const [setOpen] = useState(() => (value: boolean) => {
      latest.setOpenCalls.push(value);
      setOpenState(value);
    });
    latest.open = open;
    latest.setOpen = setOpenState;
    return (
      <AttributeTest
        id={id}
        attributes={attributes}
        open={open}
        setOpen={setOpen}
        oid={oid}
        environment={environment}
        dataConfiguration={configuration}
      />
    );
  }

  const utils = render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <Harness />
    </IntlProvider>
  );
  return { ...utils, latest };
};

const clientId = () => screen.getByPlaceholderText("Client ID");
const clientKey = () => screen.getByPlaceholderText("Client Key");
const principal = () => screen.getByPlaceholderText("Tarkistettava käyttäjä");
const testButton = () => screen.getByRole("button", { name: "TESTAA" });

/** The result table's body rows as [name, value]. */
const resultRows = () =>
  within(screen.getByRole("table", { name: "attribute table" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => [within(row).getByRole("rowheader").textContent, within(row).getByRole("cell").textContent]);

const fillCredentials = async (
  actor: ReturnType<typeof userEvent.setup>,
  { id = "client-1", key = "salainen", who = "matti@koulu.example.fi" } = {}
) => {
  await actor.type(clientId(), id);
  await actor.type(clientKey(), key);
  await actor.type(principal(), who);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lomake ennen testiä", () => {
  it("suljettuna mitään ei näytetä", async () => {
    const { latest } = renderAttributeTest();
    act(() => latest.setOpen(false));
    // After the exit transition.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("näyttää otsikon, tunnistekentät ja tarkistettavan käyttäjän; TESTAA on estetty", () => {
    renderAttributeTest();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Tarkista attribuuttien oikeellisuus")).toBeInTheDocument();
    expect(clientId()).toHaveValue("");
    expect(clientKey()).toHaveAttribute("type", "password");
    expect(principal()).toBeInTheDocument();
    expect(testButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "PERUUTA" })).toBeEnabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("TESTAA sallitaan vasta, kun kaikki kolme kenttää on täytetty", async () => {
    const actor = userEvent.setup();
    renderAttributeTest();

    await actor.type(clientId(), "client-1");
    expect(testButton()).toBeDisabled();
    await actor.type(clientKey(), "salainen");
    expect(testButton()).toBeDisabled();
    await actor.type(principal(), "matti");
    expect(testButton()).toBeEnabled();
  });

  it("tyhjennetty kenttä näyttää 'Pakollinen kenttä' -virheen ja estää testin", async () => {
    const actor = userEvent.setup();
    renderAttributeTest();
    await fillCredentials(actor);

    await actor.clear(clientKey());

    expect(screen.getByText("Pakollinen kenttä")).toBeInTheDocument();
    expect(clientKey()).toHaveAttribute("aria-invalid", "true");
    expect(testButton()).toBeDisabled();

    await actor.clear(principal());
    expect(screen.getAllByText("Pakollinen kenttä")).toHaveLength(2);
    expect(principal()).toHaveAttribute("aria-invalid", "true");

    await actor.clear(clientId());
    expect(screen.getAllByText("Pakollinen kenttä")).toHaveLength(3);
    expect(clientId()).toHaveAttribute("aria-invalid", "true");
  });

  it("näytä-painike vaihtaa salaisuuden näkyväksi ja takaisin", async () => {
    const actor = userEvent.setup();
    renderAttributeTest();

    await actor.click(screen.getByRole("button", { name: "näytä" }));
    expect(clientKey()).toHaveAttribute("type", "text");
    await actor.click(screen.getByRole("button", { name: "näytä" }));
    expect(clientKey()).toHaveAttribute("type", "password");
  });

  it("PERUUTA sulkee dialogin (setOpen(false)) kutsumatta rajapintoja", async () => {
    const actor = userEvent.setup();
    const { latest } = renderAttributeTest();

    await actor.click(screen.getByRole("button", { name: "PERUUTA" }));

    expect(latest.setOpenCalls).toEqual([false]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(testAttributesAuthorization).not.toHaveBeenCalled();
    expect(testAttributes).not.toHaveBeenCalled();
  });
});

describe("testin suoritus", () => {
  it("valtuuttaa istunnon ja hakee attribuutit: id numerona, ei tenantId:tä olemassa olevalle integraatiolle", async () => {
    const actor = userEvent.setup();
    testAttributes.mockResolvedValue(RESPONSE);
    renderAttributeTest({ id: "5" });
    await fillCredentials(actor);

    await actor.click(testButton());

    await waitFor(() => expect(testAttributes).toHaveBeenCalled());
    expect(testAttributesAuthorization).toHaveBeenCalledTimes(1);
    expect(testAttributesAuthorization).toHaveBeenCalledWith(
      {},
      { id: 5, clientId: "client-1", clientSecret: "salainen" }
    );
    // select: the first path segment of each attribute's content, unique, in order.
    expect(testAttributes).toHaveBeenCalledWith({
      principal: "matti@koulu.example.fi",
      select: ["extension_roles", "surname", "givenName", "memberOf", "extension_school", "nickname"],
    });
  });

  it("uudelle integraatiolle (id '0') ei lähetetä tenantId:tä (backend lukee sen tallennetusta integraatiosta)", async () => {
    const actor = userEvent.setup();
    renderAttributeTest({ id: "0" });
    await fillCredentials(actor);

    await actor.click(testButton());

    await waitFor(() => expect(testAttributesAuthorization).toHaveBeenCalled());
    expect(testAttributesAuthorization).toHaveBeenCalledWith(
      {},
      { id: 0, clientId: "client-1", clientSecret: "salainen" }
    );
  });

  it("tulostaulukko: etunimi ja sukunimi ensin, sitten aakkosjärjestys; arvot polun mukaan, taulukot pilkuin ja objektit JSONina", async () => {
    const actor = userEvent.setup();
    testAttributes.mockResolvedValue(RESPONSE);
    renderAttributeTest();
    await fillCredentials(actor);

    await actor.click(testButton());

    expect(await screen.findByRole("table", { name: "attribute table" })).toBeInTheDocument();
    expect(screen.getByText("Attribute name")).toBeInTheDocument();
    expect(screen.getByText("Attribute value")).toBeInTheDocument();
    expect(resultRows()).toEqual([
      ["firstName", "Matti"],
      ["surname", "Meikäläinen"],
      ["groups", "7A, 7B"],
      ["learnerId", "1.2.246.562.24.1"],
      // A path missing from the response: empty value.
      ["nickname", ""],
      ["roles", "Oppilas"],
      ["schoolIds", JSON.stringify({ koulu: "00001" })],
    ]);
    // The form is replaced by the result and an OK button.
    expect(screen.queryByPlaceholderText("Tarkistettava käyttäjä")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "TESTAA" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  it("taulukossa näytetään vain määritetyt, azurelle näkyvät attribuutit, joilla on arvo attributes-listassa", async () => {
    const actor = userEvent.setup();
    testAttributes.mockResolvedValue({ givenName: "Matti", mpass: "x", custom: "y" });
    renderAttributeTest({
      attributes: [
        user("firstName", "givenName"),
        // username is not visible for azure; custom is not configured at all.
        user("username", "mpass"),
        user("custom", "custom"),
      ],
    });
    await fillCredentials(actor);

    await actor.click(testButton());

    await screen.findByRole("table", { name: "attribute table" });
    expect(resultRows()).toEqual([["firstName", "Matti"]]);
    expect(testAttributes).toHaveBeenCalledWith(expect.objectContaining({ select: ["givenName", "mpass", "custom"] }));
  });

  it("erityisorganisaation (oid) omat attribuutit näytetään sen integraatiolle", async () => {
    const actor = userEvent.setup();
    testAttributes.mockResolvedValue({ givenName: "Matti", sg: "ryhmä-1" });
    const attributes = [user("firstName", "givenName"), user("studentGroupGuid", "sg")];

    renderAttributeTest({ attributes, oid: SPECIAL_OID });
    await fillCredentials(actor);
    await actor.click(testButton());
    await screen.findByRole("table", { name: "attribute table" });
    expect(resultRows()).toEqual([
      ["firstName", "Matti"],
      ["studentGroupGuid", "ryhmä-1"],
    ]);
  });

  it("muun organisaation integraatiolle erityisorganisaation attribuuttia ei näytetä", async () => {
    const actor = userEvent.setup();
    testAttributes.mockResolvedValue({ givenName: "Matti", sg: "ryhmä-1" });
    const attributes = [user("firstName", "givenName"), user("studentGroupGuid", "sg")];

    renderAttributeTest({ attributes, oid: ORG_OID });
    await fillCredentials(actor);
    await actor.click(testButton());
    await screen.findByRole("table", { name: "attribute table" });
    expect(resultRows()).toEqual([["firstName", "Matti"]]);
  });

  it("odotuksen aikana painike on estetty ja näyttää latausindikaattorin", async () => {
    const actor = userEvent.setup();
    let resolve: (value: unknown) => void = () => {};
    testAttributes.mockReturnValue(new Promise((r) => (resolve = r)));
    renderAttributeTest();
    await fillCredentials(actor);

    await actor.click(testButton());

    await waitFor(() => expect(testAttributes).toHaveBeenCalled());
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("TESTAA")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar").closest("button")).toBeDisabled();

    await act(async () => resolve(RESPONSE));
    expect(await screen.findByRole("table", { name: "attribute table" })).toBeInTheDocument();
  });

  it("valtuutus palauttaa false (esim. tallentamaton integraatio): virhe näytetään eikä attribuutteja haeta", async () => {
    const actor = userEvent.setup();
    testAttributesAuthorization.mockResolvedValue(false);
    renderAttributeTest({ id: "0" });
    await fillCredentials(actor);

    await actor.click(testButton());

    expect(await screen.findByText("Tilin authentikointi epäonnistui!")).toBeInTheDocument();
    expect(testAttributes).not.toHaveBeenCalled();
    expect(screen.queryByText("Tuntematon tilaaja")).not.toBeInTheDocument();
    expect(testButton()).toBeEnabled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("valtuutuksen epäonnistuminen näyttää virheen, attribuutteja ei haeta ja tunnisteet voi syöttää uudelleen", async () => {
    const actor = userEvent.setup();
    testAttributesAuthorization.mockRejectedValue(new Error("401"));
    renderAttributeTest();
    await fillCredentials(actor);

    await actor.click(testButton());

    expect(await screen.findByText("Tilin authentikointi epäonnistui!")).toBeInTheDocument();
    expect(testAttributes).not.toHaveBeenCalled();
    expect(clientId()).toHaveValue("client-1");
    expect(testButton()).toBeEnabled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("tuntematon käyttäjä (haku epäonnistuu): virhe käyttäjäkentässä, tunnistekentät piilotetaan (istunto valtuutettu)", async () => {
    const actor = userEvent.setup();
    testAttributes.mockRejectedValue(new Error("404"));
    renderAttributeTest();
    await fillCredentials(actor);

    await actor.click(testButton());

    expect(await screen.findByText("Tuntematon tilaaja")).toBeInTheDocument();
    expect(principal()).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByPlaceholderText("Client ID")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(testButton()).toBeEnabled();
  });

  it("valtuutettu istunto: seuraava testi tarvitsee vain käyttäjän eikä valtuuta uudelleen", async () => {
    const actor = userEvent.setup();
    testAttributes.mockRejectedValueOnce(new Error("404")).mockResolvedValue(RESPONSE);
    renderAttributeTest();
    await fillCredentials(actor);
    await actor.click(testButton());
    await screen.findByText("Tuntematon tilaaja");

    await actor.clear(principal());
    expect(testButton()).toBeDisabled();
    await actor.type(principal(), "maija");
    expect(screen.queryByText("Tuntematon tilaaja")).not.toBeInTheDocument();
    await actor.click(testButton());

    await screen.findByRole("table", { name: "attribute table" });
    expect(testAttributesAuthorization).toHaveBeenCalledTimes(1);
    expect(testAttributes).toHaveBeenCalledTimes(2);
    expect(testAttributes).toHaveBeenLastCalledWith(expect.objectContaining({ principal: "maija" }));
  });

  it("OK sulkee dialogin; uudelleen avattaessa tulos on tyhjennetty, käyttäjä säilyy ja istunto on yhä valtuutettu", async () => {
    const actor = userEvent.setup();
    testAttributes.mockResolvedValue(RESPONSE);
    const { latest } = renderAttributeTest();
    await fillCredentials(actor);
    await actor.click(testButton());
    await screen.findByRole("table", { name: "attribute table" });

    await actor.click(screen.getByRole("button", { name: "OK" }));
    expect(latest.setOpenCalls).toEqual([false]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    act(() => latest.setOpen(true));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Client ID")).not.toBeInTheDocument();
    expect(principal()).toHaveValue("matti@koulu.example.fi");
    expect(testButton()).toBeEnabled();
  });
});
