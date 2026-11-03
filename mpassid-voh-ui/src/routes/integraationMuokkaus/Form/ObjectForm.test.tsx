import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { createRef } from "react";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IntegrationType, UiConfiguration } from "@/config";
import ObjectForm from "./ObjectForm";
import type { MetadataEntry, ObjectFormHandle } from "./types";

type Props = ComponentProps<typeof ObjectForm>;

const NAME = "assertionConsumerServiceUrls";

/** A sub-field configuration of the object attribute (type === object name). */
const field = (
  name: string,
  saml: Partial<IntegrationType>,
  overrides: Partial<UiConfiguration> = {}
): UiConfiguration => ({
  name,
  type: NAME,
  mandatory: true,
  array: false,
  switch: false,
  validation: [],
  integrationType: [{ name: "saml", editable: true, visible: true, ...saml }],
  ...overrides,
});

// Same sub-fields (and order) as assertionConsumerServiceUrls in config.ts.
const bindings = field("bindings", { editable: false, visible: false, defaultValue: "HTTP-POST" });
const index = field("index", { editable: false, index: "auto" }, { validation: ["number"] });
const isDefault = field("isDefault", { defaultValue: "false" }, { switch: true, enum: ["true", "false"] });
const location = field("location", {}, { validation: ["uri", "https"] });
const ACS_CONFIGURATION = [bindings, index, isDefault, location];

// An unrelated attribute: must be ignored (type !== object name).
const unrelated: UiConfiguration = { ...location, name: "unrelated", type: "metadata" };

const entry = (i: number, url: string, def = false): MetadataEntry => ({
  bindings: "HTTP-POST",
  index: i,
  isDefault: def,
  location: url,
});

const defaultProps = (overrides: Partial<Props> = {}): Props => ({
  object: { name: NAME, type: "metadata", content: [] },
  type: NAME,
  label: NAME,
  attributeType: "metadata",
  integrationType: "saml",
  isEditable: true,
  mandatory: false,
  path: "content",
  currentObjectRef: { current: {} },
  dataConfiguration: [...ACS_CONFIGURATION, unrelated],
  helperText: vi.fn(() => <></>),
  setCanSave: vi.fn(),
  onUpdate: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onValidate: vi.fn(() => true),
  ...overrides,
});

const wrap = (props: Props, messages: Record<string, string> = {}) => (
  <IntlProvider locale="fi" defaultLocale="fi" messages={messages} onError={() => {}}>
    <ObjectForm {...props} />
  </IntlProvider>
);

const renderObjectForm = (overrides: Partial<Props> = {}, messages: Record<string, string> = {}) => {
  const objectData = createRef<ObjectFormHandle>();
  const props = defaultProps({ objectData, ...overrides });
  const utils = render(wrap(props, messages));
  return { ...utils, props, objectData };
};

/** The value cell next to a sub-field label. */
const fieldCell = (label: string) => {
  const labelCell = screen.getByText(label).closest(".MuiGrid-root")!;
  return labelCell.nextElementSibling as HTMLElement;
};

const locationInput = (label = "location") => screen.getByPlaceholderText(`Lisää ${label}`);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ObjectForm", () => {
  describe("lukutila", () => {
    it("näyttää oliot JSON-muodossa ilman aaltosulkeita, ei painikkeita eikä kenttiä", () => {
      const { container, props } = renderObjectForm({
        isEditable: false,
        object: { name: NAME, type: "metadata", content: [entry(0, "https://a.fi"), entry(1, "https://b.fi")] },
      });

      const rows = container.querySelectorAll("span");
      expect(Array.from(rows).map((r) => r.textContent)).toEqual([
        '\n  "bindings": "HTTP-POST",\n  "index": 0,\n  "isDefault": false,\n  "location": "https://a.fi"\n\n',
        '\n  "bindings": "HTTP-POST",\n  "index": 1,\n  "isDefault": false,\n  "location": "https://b.fi"\n\n',
      ]);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      // Read-only mode does not initialise the current object.
      expect(props.currentObjectRef.current).toEqual({});
    });

    it("tyhjä lista ei näytä mitään, ei edes pakollisena", () => {
      const { container } = renderObjectForm({ isEditable: false, mandatory: true });
      expect(container).toHaveTextContent(/^$/);
    });

    it("isEditable on oletuksena false", () => {
      const { isEditable: _omit, ...rest } = defaultProps();
      render(
        <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
          <ObjectForm {...(rest as Props)} />
        </IntlProvider>
      );
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByText("ei arvoja")).not.toBeInTheDocument();
    });
  });

  describe("muokattava: tallennetut oliot", () => {
    it("tyhjä lista: 'ei arvoja'", () => {
      renderObjectForm();
      expect(screen.getByText("ei arvoja")).toBeInTheDocument();
    });

    it("tyhjä pakollinen lista: 'ei arvoja, pakollinen'", () => {
      renderObjectForm({ mandatory: true });
      expect(screen.getByText("ei arvoja, pakollinen")).toBeInTheDocument();
      expect(screen.queryByText("ei arvoja")).not.toBeInTheDocument();
    });

    it("oliot listataan muokkaa- ja poista-painikkeiden kanssa", () => {
      renderObjectForm({
        object: { name: NAME, type: "metadata", content: [entry(0, "https://a.fi"), entry(1, "https://b.fi")] },
      });
      expect(screen.getAllByRole("button", { name: "muokkaa" })).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: "poista" })).toHaveLength(2);
      expect(screen.getByText(/"location": "https:\/\/b.fi"/)).toBeInTheDocument();
      expect(screen.queryByText(/ei arvoja/)).not.toBeInTheDocument();
    });

    it("muokkaa kutsuu onEdit(object.type, olio, indeksi)", async () => {
      const user = userEvent.setup();
      const content = [entry(0, "https://a.fi"), entry(1, "https://b.fi")];
      const { props } = renderObjectForm({ object: { name: NAME, type: "metadata", content } });

      await user.click(screen.getAllByRole("button", { name: "muokkaa" })[1]);

      expect(props.onEdit).toHaveBeenCalledTimes(1);
      expect(props.onEdit).toHaveBeenCalledWith("metadata", content[1], 1);
      expect(props.onDelete).not.toHaveBeenCalled();
    });

    it("poista kutsuu onDelete(object.type, indeksi)", async () => {
      const user = userEvent.setup();
      const content = [entry(0, "https://a.fi"), entry(1, "https://b.fi")];
      const { props } = renderObjectForm({ object: { name: NAME, type: "metadata", content } });

      await user.click(screen.getAllByRole("button", { name: "poista" })[0]);

      expect(props.onDelete).toHaveBeenCalledTimes(1);
      expect(props.onDelete).toHaveBeenCalledWith("metadata", 0);
      expect(props.onEdit).not.toHaveBeenCalled();
    });
  });

  describe("muokattava: uuden olion kentät", () => {
    it("näkyvät alikentät näytetään nimen mukaan järjestettynä, piilotetut ja muut attribuutit eivät", () => {
      renderObjectForm();

      const labels = ["index", "isDefault", "location"].map((l) => screen.getByText(l));
      expect(labels[0].compareDocumentPosition(labels[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(labels[1].compareDocumentPosition(labels[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.queryByText("bindings")).not.toBeInTheDocument();
      expect(screen.queryByText("unrelated")).not.toBeInTheDocument();
    });

    it("kenttätyypit: ei-muokattava index tekstinä, isDefault kytkimenä, location tekstikenttänä", () => {
      renderObjectForm();
      expect(within(fieldCell("index")).queryByRole("textbox")).not.toBeInTheDocument();
      expect(fieldCell("index")).toHaveTextContent(/^0$/);
      expect(within(fieldCell("isDefault")).getByRole("switch")).not.toBeChecked();
      expect(within(fieldCell("location")).getByRole("textbox")).toHaveValue("");
      expect(screen.getAllByRole("textbox")).toHaveLength(1);
    });

    it("alikentän käännös vaikuttaa järjestykseen", () => {
      renderObjectForm({}, { [`attribuutti.${NAME}.location`]: "A-osoite" });

      const labels = ["A-osoite", "index", "isDefault"].map((l) => screen.getByText(l));
      expect(labels[0].compareDocumentPosition(labels[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(labels[1].compareDocumentPosition(labels[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("olion oma käännös näytetään jokaisen alikentän labelina", () => {
      renderObjectForm({}, { [`attribuutti.${NAME}`]: "Paluuosoitteet" });

      expect(screen.getAllByText("Paluuosoitteet")).toHaveLength(3);
      expect(screen.queryByText("location")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Lisää Paluuosoitteet")).toBeInTheDocument();
    });

    // Korjattu: alikentän oma käännös näytetään labelina (olion käännös vain varalla).
    it("alikentän käännetty label näytetään", () => {
      renderObjectForm({}, { [`attribuutti.${NAME}.location`]: "A-osoite" });
      expect(screen.getByText("A-osoite")).toBeInTheDocument();
      expect(locationInput("A-osoite")).toBeInTheDocument();
    });

    it("tooltip näyttää työkaluvihjeen ja kentän teknisen nimen", async () => {
      const user = userEvent.setup();
      renderObjectForm({}, { [`työkaluvihje.${NAME}.location`]: "Paluuosoite" });

      await user.hover(screen.getByText("location"));

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent("Paluuosoite");
      expect(within(tooltip).getByText("location").tagName).toBe("CODE");
    });

    it("currentObject alustetaan oletusarvoilla, myös piilotetuille kentille", () => {
      const { props } = renderObjectForm();
      expect(props.currentObjectRef.current).toEqual({
        bindings: "HTTP-POST",
        index: 0,
        isDefault: false,
        location: "",
      });
    });

    it("tuntematon integraatiotyyppi: ei kenttiä, currentObject silti alustetaan", () => {
      const { props } = renderObjectForm({ integrationType: "oidc" });
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.queryByText("location")).not.toBeInTheDocument();
      // No defaultValue -> '' and a switch without default gets enum[0] ('true').
      expect(props.currentObjectRef.current).toEqual({
        bindings: "",
        index: "",
        isDefault: true,
        location: "",
      });
    });

    it("olemassa olevaa currentObject-arvoa ei korvata oletuksella", () => {
      const { props } = renderObjectForm({
        currentObjectRef: { current: { location: "https://kesken.fi", isDefault: true } },
      });
      expect(locationInput()).toHaveValue("https://kesken.fi");
      expect(within(fieldCell("isDefault")).getByRole("switch")).toBeChecked();
      expect(props.currentObjectRef.current).toMatchObject({
        location: "https://kesken.fi",
        isDefault: true,
        bindings: "HTTP-POST",
      });
    });
  });

  describe("automaattinen indeksi", () => {
    it.each([
      ["tyhjä lista", [], 0],
      ["peräkkäiset", [0, 1], 2],
      ["aukko", [0, 2], 1],
      ["käänteinen järjestys", [1, 0], 2],
      ["aukko alussa", [2, 0], 1],
      ["ei nollaa", [1, 2], 0],
    ])("%s: seuraava vapaa indeksi", (_name, indexes, expected) => {
      const { props } = renderObjectForm({
        object: {
          name: NAME,
          type: "metadata",
          content: (indexes as number[]).map((i) => entry(i, `https://${i}.fi`)),
        },
      });
      expect(fieldCell("index")).toHaveTextContent(new RegExp(`^${expected}$`));
      expect(props.currentObjectRef.current.index).toBe(expected);
    });
  });

  describe("syötekenttä", () => {
    it("kirjoitus päivittää currentObjectin ja kutsuu onUpdate(nimi, arvo)", async () => {
      const user = userEvent.setup();
      const { props } = renderObjectForm();

      await user.type(locationInput(), "https://c.fi");

      expect(props.onUpdate).toHaveBeenLastCalledWith("location", "https://c.fi");
      expect(props.onUpdate).toHaveBeenCalledTimes("https://c.fi".length);
      expect(props.currentObjectRef.current.location).toBe("https://c.fi");
      expect(props.setCanSave).toHaveBeenLastCalledWith(true);
    });

    it("epävalidi arvo: validoinnin ohjeteksti näkyy, ei virhetyyliä, arvo silti välitetään", async () => {
      const user = userEvent.setup();
      const { props } = renderObjectForm();

      await user.type(locationInput(), "ftp://c.fi");

      expect(screen.getByText("uri ei ole validi!")).toBeInTheDocument();
      expect(locationInput()).toHaveAttribute("aria-invalid", "false");
      expect(props.onUpdate).toHaveBeenLastCalledWith("location", "ftp://c.fi");
      expect(props.currentObjectRef.current.location).toBe("ftp://c.fi");
      expect(props.setCanSave).toHaveBeenLastCalledWith(false);

      await user.clear(locationInput());
      await user.type(locationInput(), "http://c.fi");
      expect(screen.getByText("Kentän pitää olla https muodossa!")).toBeInTheDocument();
    });

    it("alikenttien validointi ei käytä onValidate-propia", async () => {
      const user = userEvent.setup();
      const { props } = renderObjectForm();
      await user.type(locationInput(), "https://c.fi");
      expect(props.onValidate).not.toHaveBeenCalled();
      expect(props.helperText).not.toHaveBeenCalled();
    });

    it("trim: 'cert' poistaa sertifikaatin otsikot ja välilyönnit ennen tallennusta", async () => {
      const user = userEvent.setup();
      const certificate = field("certificate", {}, { trim: "cert", mandatory: false });
      const { props } = renderObjectForm({ dataConfiguration: [certificate] });

      await user.click(screen.getByPlaceholderText("Lisää certificate"));
      await user.paste("-----BEGIN CERTIFICATE----- MIIB AbC= -----END CERTIFICATE-----");

      expect(props.onUpdate).toHaveBeenLastCalledWith("certificate", "MIIBAbC=");
      expect(props.currentObjectRef.current.certificate).toBe("MIIBAbC=");
    });
  });

  describe("kytkin", () => {
    it("klikkaus tallentaa totuusarvon currentObjectiin ja kutsuu onUpdate(nimi, 'true')", async () => {
      const user = userEvent.setup();
      const { props } = renderObjectForm();

      await user.click(within(fieldCell("isDefault")).getByRole("switch"));

      expect(props.onUpdate).toHaveBeenCalledWith("isDefault", "true");
      expect(props.currentObjectRef.current.isDefault).toBe(true);
      expect(props.setCanSave).toHaveBeenLastCalledWith(true);

      await user.click(within(fieldCell("isDefault")).getByRole("switch"));
      expect(props.onUpdate).toHaveBeenLastCalledWith("isDefault", "false");
      expect(props.currentObjectRef.current.isDefault).toBe(false);
    });

    it("oletusarvo 'true': kytkin päällä ja currentObjectissa true", () => {
      const def = field("isDefault", { defaultValue: "true" }, { switch: true, enum: ["true", "false"] });
      const { props } = renderObjectForm({ dataConfiguration: [def] });
      expect(screen.getByRole("switch")).toBeChecked();
      expect(props.currentObjectRef.current).toEqual({ isDefault: true });
    });

    it("ilman oletusarvoa kytkin saa enumin ensimmäisen arvon", () => {
      const noDefault = field("isDefault", {}, { switch: true, enum: ["true", "false"] });
      const { props } = renderObjectForm({ dataConfiguration: [noDefault] });
      expect(screen.getByRole("switch")).toBeChecked();
      expect(props.currentObjectRef.current).toEqual({ isDefault: true });
    });

    it("ei-muokattava kytkin näytetään himmennettynä", () => {
      const readOnly = field("isDefault", { editable: false, defaultValue: "true" }, { switch: true, enum: ["true", "false"] });
      renderObjectForm({ dataConfiguration: [readOnly] });
      expect(screen.getByRole("switch").closest(".MuiSwitch-root")).toHaveStyle({ opacity: "0.4" });
    });
  });

  describe("taulukkokenttä", () => {
    const renderArrayField = () => {
      const onRecoverableError = vi.fn();
      const urls = field("urls", {}, { array: true, mandatory: false });
      const props = defaultProps({ dataConfiguration: [urls] });
      render(wrap(props), { onRecoverableError });
      return { props, onRecoverableError };
    };

    it("array-alikenttä näytetään ListFormina, jonka tyyppinä on olion nimi", () => {
      const { props } = renderArrayField();
      expect(screen.getByPlaceholderText(`Lisää uusi ${NAME}`)).toBeInTheDocument();
      // One "ei arvoja" for the object list, one for the empty sub-list.
      expect(screen.getAllByText("ei arvoja")).toHaveLength(2);
      expect(props.currentObjectRef.current).toEqual({ urls: [] });
    });

    // Korjattu: ListForm saa jo ensimmäisellä renderöinnillä sisällöksi []:n
    // (ei ''), joten content.map ei kaadu. (config.ts:ssä ei ole array-alikenttiä.)
    it("array-alikenttä renderöityy ilman virhettä", () => {
      const { onRecoverableError } = renderArrayField();
      expect(onRecoverableError).not.toHaveBeenCalled();
    });
  });

  describe("satunnainen sha1-indeksi", () => {
    it("index: 'randomsha1' asettaa currentObjectiin sha1-tiivisteen asynkronisesti", async () => {
      const id = field("id", { editable: false, index: "randomsha1" }, { mandatory: false });
      const { props } = renderObjectForm({ dataConfiguration: [id] });
      await waitFor(() => expect(props.currentObjectRef.current.id).toMatch(/^[0-9a-f]{40}$/));
    });
  });

  describe("mandatory", () => {
    it("mandatory: setCanSave(false) mountissa", () => {
      const { props } = renderObjectForm({ mandatory: true, dataConfiguration: [] });
      expect(props.setCanSave).toHaveBeenCalledWith(false);
    });

    it("ei mandatory eikä alikenttiä: setCanSave-kutsuja ei tule", () => {
      const { props } = renderObjectForm({ dataConfiguration: [] });
      expect(props.setCanSave).not.toHaveBeenCalled();
    });
  });

  describe("objectData-kahva", () => {
    it("validate: pakollinen tyhjä kenttä -> false, validi täyttö -> true", async () => {
      const user = userEvent.setup();
      const { objectData } = renderObjectForm();

      expect(objectData.current!.validate()).toBe(false);

      await user.type(locationInput(), "https://c.fi");
      expect(objectData.current!.validate()).toBe(true);

      await user.clear(locationInput());
      await user.type(locationInput(), "http://c.fi");
      expect(objectData.current!.validate()).toBe(false);
    });

    it("validate: ei-pakollinen tyhjä kenttä validoidaan validointisäännöillä", () => {
      const optional = field("location", {}, { mandatory: false, validation: ["uri"] });
      const { objectData } = renderObjectForm({ dataConfiguration: [optional] });
      expect(objectData.current!.validate()).toBe(false);
    });

    it("validate: ilman alikenttiä true", () => {
      const { objectData } = renderObjectForm({ dataConfiguration: [] });
      expect(objectData.current!.validate()).toBe(true);
    });

    // Korjattu: yksikin puuttuva tai epävalidi alikenttä hylkää olion.
    it("validate: puuttuva pakollinen kenttä -> false kenttien järjestyksestä riippumatta", () => {
      const { objectData } = renderObjectForm({ dataConfiguration: [location, isDefault] });
      expect(objectData.current!.validate()).toBe(false);
    });

    it("clean: tyhjentää syötteet, palauttaa oletukset ja kutsuu setCanSave(validointi)", async () => {
      const user = userEvent.setup();
      const { props, objectData } = renderObjectForm({
        object: { name: NAME, type: "metadata", content: [entry(0, "https://a.fi")] },
      });
      await user.type(locationInput(), "https://c.fi");
      await user.click(within(fieldCell("isDefault")).getByRole("switch"));
      vi.mocked(props.setCanSave).mockClear();

      act(() => objectData.current!.clean());

      // Validated against the emptied object, before the defaults are restored.
      expect(props.setCanSave).toHaveBeenNthCalledWith(1, false);
      expect(locationInput()).toHaveValue("");
      expect(within(fieldCell("isDefault")).getByRole("switch")).not.toBeChecked();
      expect(props.currentObjectRef.current).toEqual({
        bindings: "HTTP-POST",
        index: 1,
        isDefault: false,
        location: "",
      });
    });

    it("clean ilman pakollisia alikenttiä: setCanSave(true)", () => {
      const optional = field("location", {}, { mandatory: false, validation: [] });
      const { props, objectData } = renderObjectForm({ dataConfiguration: [optional] });
      vi.mocked(props.setCanSave).mockClear();

      act(() => objectData.current!.clean());

      expect(props.setCanSave).toHaveBeenNthCalledWith(1, true);
    });

    it("edit + uudelleenrenderöinti (kuten MetadataForm: onDelete ja edit): olion arvot kenttiin", () => {
      const first = entry(0, "https://a.fi");
      const edited = entry(5, "https://b.fi", true);
      const objectData = createRef<ObjectFormHandle>();
      const props = defaultProps({
        objectData,
        object: { name: NAME, type: "metadata", content: [first, edited] },
      });
      const { rerender } = render(wrap(props));

      act(() => objectData.current!.edit({ ...edited }));
      rerender(wrap({ ...props, object: { name: NAME, type: "metadata", content: [first] } }));

      expect(locationInput()).toHaveValue("https://b.fi");
      expect(fieldCell("index")).toHaveTextContent(/^5$/);
      expect(within(fieldCell("isDefault")).getByRole("switch")).toBeChecked();
      expect(props.currentObjectRef.current).toEqual(edited);
      expect(props.onUpdate).not.toHaveBeenCalled();
    });

    // Korjattu: edit() kopioi annetun olion, joten renderöinti ei poista kenttiä
    // kutsujan datasta.
    it("edit ei muuta kutsujan antamaa oliota", () => {
      const edited = entry(5, "https://b.fi", true);
      const objectData = createRef<ObjectFormHandle>();
      const props = defaultProps({ objectData });
      const { rerender } = render(wrap(props));

      act(() => objectData.current!.edit(edited));
      rerender(wrap({ ...props, object: { name: NAME, type: "metadata", content: [] } }));

      expect(edited).toEqual(entry(5, "https://b.fi", true));
    });

    it("edit-arvot käytetään vain kerran: seuraava renderöinti ei palauta niitä", async () => {
      const user = userEvent.setup();
      const edited = entry(5, "https://b.fi", true);
      const objectData = createRef<ObjectFormHandle>();
      const props = defaultProps({ objectData });
      const { rerender } = render(wrap(props));

      act(() => objectData.current!.edit(edited));
      rerender(wrap({ ...props, object: { name: NAME, type: "metadata", content: [] } }));
      expect(locationInput()).toHaveValue("https://b.fi");

      await user.clear(locationInput());
      await user.type(locationInput(), "https://c.fi");
      rerender(wrap({ ...props, object: { name: NAME, type: "metadata", content: [] } }));

      expect(locationInput()).toHaveValue("https://c.fi");
      expect(props.currentObjectRef.current.location).toBe("https://c.fi");
    });
  });
});
