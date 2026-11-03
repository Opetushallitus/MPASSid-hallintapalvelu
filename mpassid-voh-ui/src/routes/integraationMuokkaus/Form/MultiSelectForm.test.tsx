import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import type { oneEnum } from "./MultiSelectForm";
import MultiSelectForm from "./MultiSelectForm";

type Props = ComponentProps<typeof MultiSelectForm>;

const ENUMS: oneEnum[] = [
  { label: "Peruskoulut (11)", value: "11" },
  { label: "Lukiot (15)", value: "15" },
  { label: "Ammattikoulut (21)", value: "21" },
];

const defaultProps = (overrides: Partial<Props> = {}): Props => ({
  label: "institutionTypes",
  attributeType: "data",
  isEditable: true,
  mandatory: false,
  enums: ENUMS,
  values: [],
  helperText: vi.fn((value: string) => <span>ohje:{value}</span>),
  setCanSave: vi.fn(),
  onUpdate: vi.fn(),
  onValidate: vi.fn(() => true),
  ...overrides,
});

const wrap = (props: Props) => (
  <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
    <MultiSelectForm {...props} />
  </IntlProvider>
);

const renderSelect = (overrides: Partial<Props> = {}) => {
  const props = defaultProps(overrides);
  const utils = render(wrap(props));
  return { ...utils, props };
};

type User = ReturnType<typeof userEvent.setup>;

/** Opens the select, clicks the given option labels and closes it. */
const pick = async (user: User, labels: string[]) => {
  await user.click(screen.getByRole("combobox"));
  const listbox = await screen.findByRole("listbox");
  await labels.reduce(
    (previous, label) =>
      previous.then(() => user.click(within(listbox).getByRole("option", { name: label }))),
    Promise.resolve()
  );
  if (screen.queryByRole("listbox")) {
    await user.keyboard("{Escape}");
  }
};

/** Opens the select and returns the options (text, selected, disabled). */
const openOptions = async (user: User) => {
  await user.click(screen.getByRole("combobox"));
  const listbox = await screen.findByRole("listbox");
  const options = within(listbox)
    .queryAllByRole("option")
    .map((o) => ({
      text: o.textContent ?? "",
      checked: o.querySelector("input[type=checkbox]")
        ? (o.querySelector("input[type=checkbox]") as HTMLInputElement).checked
        : undefined,
      disabled: o.getAttribute("aria-disabled") === "true",
    }));
  await user.keyboard("{Escape}");
  return options;
};

/** Labels shown as chips in the closed select. */
const chips = () =>
  Array.from(document.querySelectorAll(".MuiChip-label")).map((c) => c.textContent);

describe("MultiSelectForm", () => {
  describe("lukutila", () => {
    it("näyttää values-arvot sellaisenaan (ei labeleita, ei erotinta)", () => {
      renderSelect({ isEditable: false, values: ["11", "15"] });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.getByText("1115")).toBeInTheDocument();
    });

    it("isEditable on oletuksena false", () => {
      const { isEditable: _omit, ...rest } = defaultProps({ values: ["11"] });
      render(
        <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
          <MultiSelectForm {...(rest as Props)} />
        </IntlProvider>
      );
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.getByText("11")).toBeInTheDocument();
    });

    it("createEmpty=false ja tyhjä valinta: näytetään lukutila (tyhjä)", () => {
      const { container } = renderSelect({ createEmpty: false, values: [] });
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(container).toHaveTextContent(/^$/);
    });

    it("createEmpty=false ja valinta olemassa: valinta on muokattava", () => {
      renderSelect({ createEmpty: false, values: ["15"], multiple: false });
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(chips()).toEqual(["Lukiot (15)"]);
    });
  });

  describe("muokattava", () => {
    it("valitut arvot näytetään chippeinä enums-järjestyksessä labelilla", () => {
      renderSelect({ values: ["21", "11"] });
      expect(chips()).toEqual(["Peruskoulut (11)", "Ammattikoulut (21)"]);
    });

    it("values-arvot, joita ei ole enumeissa, eivät näy chippeinä", () => {
      renderSelect({ values: ["99", "15"] });
      expect(chips()).toEqual(["Lukiot (15)"]);
    });

    it("vaihtoehdot ovat enums-labelit, valituilla rasti", async () => {
      const user = userEvent.setup();
      renderSelect({ values: ["15"] });
      expect(await openOptions(user)).toEqual([
        { text: "Peruskoulut (11)", checked: false, disabled: false },
        { text: "Lukiot (15)", checked: true, disabled: false },
        { text: "Ammattikoulut (21)", checked: false, disabled: false },
      ]);
    });

    it("tyhjät enumit + createEmpty: näytetään ei-valittava 'Ei valintoja'", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ enums: [] });
      expect(await openOptions(user)).toEqual([
        { text: "Ei valintoja", checked: undefined, disabled: true },
      ]);
      expect(props.onUpdate).not.toHaveBeenCalled();
    });

    it("pelkkiä tyhjiä arvoja sisältävät enumit: ei vaihtoehtoja", async () => {
      const user = userEvent.setup();
      renderSelect({ enums: [{ label: "tyhjä", value: "" }] });
      await user.click(screen.getByRole("combobox"));
      const listbox = await screen.findByRole("listbox");
      expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
    });

    it("monivalinta: valinnat kertyvät ja onUpdate saa koko valinnan", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect();

      await pick(user, ["Lukiot (15)", "Peruskoulut (11)"]);

      expect(props.onUpdate).toHaveBeenNthCalledWith(1, ["15"]);
      expect(props.onUpdate).toHaveBeenNthCalledWith(2, ["15", "11"]);
      expect(chips()).toEqual(["Peruskoulut (11)", "Lukiot (15)"]);
    });

    it("monivalinta: valitun klikkaus poistaa sen valinnasta", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ values: ["11", "15"] });

      await pick(user, ["Peruskoulut (11)"]);

      expect(props.onUpdate).toHaveBeenLastCalledWith(["15"]);
      expect(chips()).toEqual(["Lukiot (15)"]);
    });

    it("multiple on oletuksena true", async () => {
      const user = userEvent.setup();
      renderSelect();
      await user.click(screen.getByRole("combobox"));
      expect(await screen.findByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
      await user.keyboard("{Escape}");
    });

    it("yksittäisvalinta: onUpdate saa yhden alkion taulukon ja lista sulkeutuu", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ multiple: false, values: ["11"] });

      await user.click(screen.getByRole("combobox"));
      const listbox = await screen.findByRole("listbox");
      await user.click(within(listbox).getByRole("option", { name: "Lukiot (15)" }));

      expect(props.onUpdate).toHaveBeenCalledWith(["15"]);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(chips()).toEqual(["Lukiot (15)"]);
    });

    it("arvo 'null': onUpdate saa ['null']", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({
        multiple: false,
        enums: [
          { label: "Ei arvoa", value: "null" },
          { label: "a", value: "a" },
        ],
        values: ["a"],
      });

      await user.click(screen.getByRole("combobox"));
      await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "Ei arvoa" }));

      expect(props.onUpdate).toHaveBeenCalledWith(["null"]);
      expect(chips()).toEqual(["Ei arvoa"]);
    });

    // Korjattu: yksittäisvalinnan merkkijonoarvoa ei pilkota pilkuista.
    it("yksittäisvalinta: pilkun sisältävä arvo välitetään sellaisenaan", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({
        multiple: false,
        enums: [
          { label: "a", value: "a" },
          { label: "b,c", value: "b,c" },
        ],
        values: ["a"],
      });

      await user.click(screen.getByRole("combobox"));
      await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: "b,c" }));

      expect(props.onUpdate).toHaveBeenCalledWith(["b,c"]);
    });
  });

  describe("helperText", () => {
    it("kutsutaan valinnalla pilkulla eroteltuna ja tulos näytetään", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ values: ["11"] });
      expect(screen.getByText("ohje:11")).toBeInTheDocument();

      await pick(user, ["Lukiot (15)"]);

      expect(props.helperText).toHaveBeenLastCalledWith("11,15");
      expect(screen.getByText("ohje:11,15")).toBeInTheDocument();
    });

    it("tyhjä valinta: helperText saa tyhjän merkkijonon", () => {
      const { props } = renderSelect();
      expect(props.helperText).toHaveBeenLastCalledWith("");
    });
  });

  describe("mandatory", () => {
    it("mandatory: setCanSave(false) mountissa ja virhetyyli", () => {
      const { props } = renderSelect({ mandatory: true });
      expect(props.setCanSave).toHaveBeenCalledWith(false);
      expect(screen.getByText("ohje:").closest(".MuiFormHelperText-root")).toHaveClass("Mui-error");
    });

    it("ei mandatory: setCanSave-kutsuja ei tule eikä virhetyyliä", async () => {
      const user = userEvent.setup();
      const { props } = renderSelect({ values: ["11"] });
      await pick(user, ["Lukiot (15)"]);
      expect(props.setCanSave).not.toHaveBeenCalled();
      expect(props.onValidate).not.toHaveBeenCalled();
      expect(screen.getByText("ohje:11,15").closest(".MuiFormHelperText-root")).not.toHaveClass(
        "Mui-error"
      );
    });

    // Korjattu: pakollisuus tarkistetaan values-propista (ei kytkemättömästä inputRef:stä).
    it("mandatory ja arvo valittu: setCanSave(false) ei kutsuta", () => {
      const { props } = renderSelect({ mandatory: true, values: ["11"] });
      expect(props.setCanSave).not.toHaveBeenCalledWith(false);
    });
  });

  describe("values-propin synkronointi", () => {
    it("uudet values korvaavat valinnan", () => {
      const props = defaultProps({ values: ["11"] });
      const { rerender } = render(wrap(props));
      expect(chips()).toEqual(["Peruskoulut (11)"]);

      rerender(wrap({ ...props, values: ["15", "21"] }));
      expect(chips()).toEqual(["Lukiot (15)", "Ammattikoulut (21)"]);
    });

    it("values-propin muutos ei kutsu onUpdate", () => {
      const props = defaultProps({ values: ["11"] });
      const { rerender } = render(wrap(props));
      rerender(wrap({ ...props, values: ["15"] }));
      expect(props.onUpdate).not.toHaveBeenCalled();
    });

    // Korjattu: myös tyhjä values synkronoidaan, joten tyhjennys vanhemmassa
    // tyhjentää näytetyn valinnan.
    it("tyhjä values tyhjentää valinnan", () => {
      const props = defaultProps({ values: ["11"] });
      const { rerender } = render(wrap(props));

      rerender(wrap({ ...props, values: [] }));

      expect(chips()).toEqual([]);
    });
  });
});
