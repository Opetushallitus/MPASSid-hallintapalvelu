import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { IntlProvider } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import SwitchForm from "./SwitchForm";

type Props = ComponentProps<typeof SwitchForm>;

const defaultProps = (overrides: Partial<Props> = {}): Props => ({
  object: { name: "allowtestlearnerid", type: "data", content: "false" },
  type: "allowtestlearnerid",
  label: "allowtestlearnerid",
  attributeType: "data",
  isEditable: true,
  mandatory: false,
  path: "content",
  values: ["true", "false"],
  helperText: () => <></>,
  setCanSave: vi.fn(),
  onUpdate: vi.fn(),
  onValidate: vi.fn(() => true),
  ...overrides,
});

const wrap = (props: Props) => (
  <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
    <SwitchForm {...props} />
  </IntlProvider>
);

const renderSwitch = (overrides: Partial<Props> = {}) => {
  const props = defaultProps(overrides);
  const utils = render(wrap(props));
  return { ...utils, props };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SwitchForm", () => {
  describe("alkuarvo", () => {
    it.each([
      ["merkkijono 'true'", "true", true],
      ["merkkijono 'false'", "false", false],
      ["totuusarvo true", true, true],
      ["totuusarvo false", false, false],
      ["puuttuva arvo", undefined, false],
      ["tyhjä merkkijono", "", false],
    ])("%s", (_name, content, checked) => {
      renderSwitch({ object: { name: "x", content } });
      if (checked) {
        expect(screen.getByRole("switch")).toBeChecked();
      } else {
        expect(screen.getByRole("switch")).not.toBeChecked();
      }
    });

    it("isEditable on oletuksena false: kytkin näytetään himmennettynä", () => {
      const props = defaultProps();
      const { isEditable: _omit, ...rest } = props;
      render(
        <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
          <SwitchForm {...(rest as Props)} />
        </IntlProvider>
      );
      expect(screen.getByRole("switch").closest(".MuiSwitch-root")).toHaveStyle({ opacity: "0.4" });
    });
  });

  describe("muokattava", () => {
    it("klikkaus kutsuu setCanSave(true) ja onUpdate(type, arvo, attributeType)", async () => {
      const user = userEvent.setup();
      const { props } = renderSwitch();

      await user.click(screen.getByRole("switch"));

      expect(props.setCanSave).toHaveBeenCalledWith(true);
      expect(props.onUpdate).toHaveBeenCalledTimes(1);
      expect(props.onUpdate).toHaveBeenCalledWith("allowtestlearnerid", true, "data");
      expect(screen.getByRole("switch")).toBeChecked();

      await user.click(screen.getByRole("switch"));
      expect(props.onUpdate).toHaveBeenLastCalledWith("allowtestlearnerid", false, "data");
      expect(screen.getByRole("switch")).not.toBeChecked();
    });

    it("ei kutsu mitään callbackia pelkästä renderöinnistä", () => {
      const { props } = renderSwitch();
      expect(props.setCanSave).not.toHaveBeenCalled();
      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.onValidate).not.toHaveBeenCalled();
    });

    it("ei himmennetä", () => {
      renderSwitch();
      expect(screen.getByRole("switch").closest(".MuiSwitch-root")).not.toHaveStyle({
        opacity: "0.4",
      });
    });
  });

  describe("lukutila", () => {
    it("kytkin näytetään himmennettynä eikä klikkaus muuta arvoa tai kutsu callbackeja", async () => {
      const user = userEvent.setup();
      const { props } = renderSwitch({ isEditable: false, object: { name: "x", content: "true" } });

      const toggle = screen.getByRole("switch");
      expect(toggle.closest(".MuiSwitch-root")).toHaveStyle({ opacity: "0.4" });
      expect(toggle).toBeChecked();

      await user.click(toggle);

      expect(screen.getByRole("switch")).toBeChecked();
      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.setCanSave).not.toHaveBeenCalled();
    });
  });

  describe("resetValue", () => {
    it("ilman resetValue-lippua uusi object-prop ei muuta näytettyä arvoa", () => {
      const props = defaultProps({ object: { name: "x", content: "false" } });
      const { rerender } = render(wrap(props));

      rerender(wrap({ ...props, object: { name: "x", content: "true" } }));

      expect(screen.getByRole("switch")).not.toBeChecked();
    });

    it("resetValue=true: arvo synkronoidaan uudesta object-propista", () => {
      const props = defaultProps({ object: { name: "x", content: "false" }, resetValue: true });
      const { rerender } = render(wrap(props));
      expect(screen.getByRole("switch")).not.toBeChecked();

      rerender(wrap({ ...props, object: { name: "x", content: "true" } }));
      expect(screen.getByRole("switch")).toBeChecked();

      rerender(wrap({ ...props, object: { name: "x", content: false } }));
      expect(screen.getByRole("switch")).not.toBeChecked();
    });

    it("resetValue=true ja puuttuva arvo: kytkin pois päältä", () => {
      const props = defaultProps({ object: { name: "x", content: "true" }, resetValue: true });
      const { rerender } = render(wrap(props));
      expect(screen.getByRole("switch")).toBeChecked();

      rerender(wrap({ ...props, object: { name: "x" } }));
      expect(screen.getByRole("switch")).not.toBeChecked();
    });

    it("resetValue=true: käyttäjän valinta korvautuu, kun object-prop vaihtuu", async () => {
      const user = userEvent.setup();
      const props = defaultProps({ object: { name: "x", content: "false" }, resetValue: true });
      const { rerender } = render(wrap(props));

      await user.click(screen.getByRole("switch"));
      expect(screen.getByRole("switch")).toBeChecked();

      // A new (equal-content) object reference re-runs the reset effect.
      rerender(wrap({ ...props, object: { name: "x", content: "false" } }));
      expect(screen.getByRole("switch")).not.toBeChecked();
    });

    // Korjattu: resetValue-haarassa tyhjä merkkijono tulkitaan falseksi kuten alkuarvossa.
    it("resetValue=true ja tyhjä merkkijono: kytkin pois päältä (ei kaadu)", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      renderSwitch({ object: { name: "x", content: "" }, resetValue: true });
      expect(screen.getByRole("switch")).not.toBeChecked();
    });
  });
});
