import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { createRef } from "react";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import ListForm from "./ListForm";
import type { ListFormHandle } from "./types";

type Props = ComponentProps<typeof ListForm>;

const TYPE = "redirectUris";
const isHttps = (value: string) => value === "" || value.startsWith("https://");

const defaultProps = (overrides: Partial<Props> = {}): Props => ({
  object: { name: TYPE, type: "metadata", content: [] },
  label: TYPE,
  type: TYPE,
  isEditable: true,
  mandatory: false,
  attributeType: "metadata",
  helperText: vi.fn((value: string) => <span>ohje:{value}</span>),
  onUpdate: vi.fn(),
  onValidate: vi.fn(isHttps),
  setCanSave: vi.fn(),
  ...overrides,
});

const wrap = (props: Props) => (
  <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
    <ListForm {...props} />
  </IntlProvider>
);

const renderList = (overrides: Partial<Props> = {}) => {
  const props = defaultProps(overrides);
  const utils = render(wrap(props));
  return { ...utils, props };
};

const input = () => screen.getByPlaceholderText(`Lisää uusi ${TYPE}`);
const deleteButton = () => within(screen.getByRole("listitem")).getByRole("button");
const items = () =>
  screen.queryAllByRole("listitem").map((li) => li.textContent);

describe("ListForm", () => {
  describe("lukutila", () => {
    it("näyttää arvot listana ilman syöttökenttää ja poistopainikkeita", () => {
      renderList({
        isEditable: false,
        object: { name: TYPE, content: ["https://a.fi", "https://b.fi"] },
      });
      expect(items()).toEqual(["https://a.fi", "https://b.fi"]);
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("tyhjä lista ei näytä mitään (ei 'ei arvoja' -tekstiä)", () => {
      renderList({ isEditable: false, mandatory: true });
      expect(screen.queryByText(/ei arvoja/)).not.toBeInTheDocument();
      expect(items()).toEqual([]);
    });

    it("isEditable on oletuksena false", () => {
      const { isEditable: _omit, ...rest } = defaultProps();
      render(
        <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
          <ListForm {...(rest as Props)} />
        </IntlProvider>
      );
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("muokattava: näkymä", () => {
    it("tyhjä lista: 'ei arvoja'", () => {
      renderList();
      expect(screen.getByText("ei arvoja")).toBeInTheDocument();
      expect(screen.queryByText("ei arvoja, pakollinen")).not.toBeInTheDocument();
    });

    it("tyhjä pakollinen lista: 'ei arvoja, pakollinen'", () => {
      renderList({ mandatory: true });
      expect(screen.getByText("ei arvoja, pakollinen")).toBeInTheDocument();
    });

    it("arvot listataan, jokaisella poistopainike, ja syöttökentän placeholder", () => {
      renderList({ object: { name: TYPE, content: ["https://a.fi", "https://b.fi"] } });
      expect(items()).toEqual(["https://a.fi", "https://b.fi"]);
      expect(
        screen.getAllByRole("listitem").map((li) => within(li).getAllByRole("button").length)
      ).toEqual([1, 1]);
      expect(input()).toHaveAttribute("name", TYPE);
      expect(input()).toHaveAttribute("autocomplete", "off");
      expect(screen.queryByText(/ei arvoja/)).not.toBeInTheDocument();
    });

    it("mountissa validoidaan tyhjä syöte ja näytetään helperText('')", () => {
      const { props } = renderList();
      expect(props.onValidate).toHaveBeenCalledWith("");
      expect(props.helperText).toHaveBeenCalledWith("");
      expect(screen.getByText("ohje:")).toBeInTheDocument();
      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.setCanSave).not.toHaveBeenCalled();
    });

    it("mountissa epävalidi tyhjä syöte näkyy virheenä", () => {
      renderList({ onValidate: vi.fn(() => false) });
      expect(input()).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("lisäys Enterillä", () => {
    it("validi uusi arvo: setCanSave(true), onUpdate(type, arvo) ja kenttä tyhjennetään", async () => {
      const user = userEvent.setup();
      const { props } = renderList({ object: { name: TYPE, content: ["https://a.fi"] } });

      await user.type(input(), "https://b.fi{Enter}");

      expect(props.onUpdate).toHaveBeenCalledTimes(1);
      expect(props.onUpdate).toHaveBeenCalledWith(TYPE, "https://b.fi");
      expect(props.setCanSave).toHaveBeenLastCalledWith(true);
      expect(input()).toHaveValue("");
      expect(input()).toHaveAttribute("aria-invalid", "false");
      expect(screen.getByText("ohje:https://b.fi")).toBeInTheDocument();
    });

    it("Enter ei lähetä lomaketta (onUpdate vain kerran)", async () => {
      const user = userEvent.setup();
      const { props } = renderList();
      const onSubmit = vi.fn();
      input().closest("form")!.addEventListener("submit", onSubmit);

      await user.type(input(), "https://b.fi{Enter}");

      expect(onSubmit).not.toHaveBeenCalled();
      expect(props.onUpdate).toHaveBeenCalledTimes(1);
    });

    it("olemassa oleva arvo: ei onUpdate-kutsua, varoitus ja virhetila", async () => {
      const user = userEvent.setup();
      const { props } = renderList({ object: { name: TYPE, content: ["https://a.fi"] } });

      await user.type(input(), "https://a.fi{Enter}");

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(screen.getByText(`Tämä ${TYPE} on jo olemassa`)).toBeInTheDocument();
      expect(input()).toHaveAttribute("aria-invalid", "true");
      expect(input()).toHaveValue("https://a.fi");
    });

    it("epävalidi arvo: setCanSave(false), helperText(arvo), virhetila, ei onUpdate-kutsua", async () => {
      const user = userEvent.setup();
      const { props } = renderList();

      await user.type(input(), "http://a.fi{Enter}");

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.setCanSave).toHaveBeenLastCalledWith(false);
      expect(screen.getByText("ohje:http://a.fi")).toBeInTheDocument();
      expect(input()).toHaveAttribute("aria-invalid", "true");
      expect(input()).toHaveValue("http://a.fi");
    });

    it("tyhjä kenttä: setCanSave(true) mutta ei onUpdate-kutsua", async () => {
      const user = userEvent.setup();
      const { props } = renderList();

      await user.type(input(), "{Enter}");

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.setCanSave).toHaveBeenCalledWith(true);
    });

    it("noErrors: virhetilaa ei näytetä, mutta helperText näytetään", async () => {
      const user = userEvent.setup();
      renderList({ noErrors: true });

      await user.type(input(), "http://a.fi{Enter}");

      expect(input()).toHaveAttribute("aria-invalid", "false");
      expect(screen.getByText("ohje:http://a.fi")).toBeInTheDocument();
    });
  });

  describe("kirjoitus", () => {
    it("jokainen näppäily validoi ja päivittää helperTextin, ei onUpdate-kutsua", async () => {
      const user = userEvent.setup();
      const { props } = renderList();

      await user.type(input(), "http");

      expect(props.onValidate).toHaveBeenLastCalledWith("http");
      expect(screen.getByText("ohje:http")).toBeInTheDocument();
      expect(input()).toHaveAttribute("aria-invalid", "true");
      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.setCanSave).not.toHaveBeenCalled();

      await user.clear(input());
      await user.type(input(), "https://x.fi");
      expect(input()).toHaveAttribute("aria-invalid", "false");
      expect(screen.getByText("ohje:https://x.fi")).toBeInTheDocument();
    });
  });

  describe("poisto", () => {
    it("poistopainike: setCanSave(true) ja onUpdate(type, arvo) (vanhempi poistaa togglella)", async () => {
      const user = userEvent.setup();
      const { props } = renderList({
        object: { name: TYPE, content: ["https://a.fi", "https://b.fi"] },
      });

      const second = screen.getAllByRole("listitem")[1];
      await user.click(within(second).getByRole("button"));

      expect(props.setCanSave).toHaveBeenCalledWith(true);
      expect(props.onUpdate).toHaveBeenCalledTimes(1);
      expect(props.onUpdate).toHaveBeenCalledWith(TYPE, "https://b.fi");
    });

    it("poisto tyhjentää helperTextin", async () => {
      const user = userEvent.setup();
      renderList({ object: { name: TYPE, content: ["https://a.fi"] } });
      await user.type(input(), "http");
      expect(screen.getByText("ohje:http")).toBeInTheDocument();

      await user.click(deleteButton());

      expect(screen.queryByText(/^ohje:/)).not.toBeInTheDocument();
    });

    // Korjattu: poistopainikkeen saavutettava nimi on "poista" (kuten ObjectFormissa).
    it("poistopainikkeen saavutettava nimi on 'poista'", () => {
      renderList({ object: { name: TYPE, content: ["https://a.fi"] } });
      expect(deleteButton()).toHaveAccessibleName("poista");
    });

    it("tyhjän arvon poisto välittää tyhjän merkkijonon", async () => {
      const user = userEvent.setup();
      const { props } = renderList({ object: { name: TYPE, content: [""] } });

      await user.click(deleteButton());

      expect(props.onUpdate).toHaveBeenCalledWith(TYPE, "");
    });
  });

  describe("pressButton-kahva (Lisää-painike)", () => {
    it("pressEnter lisää validin arvon kuten Enter", async () => {
      const user = userEvent.setup();
      const ref = createRef<ListFormHandle>();
      const { props } = renderList({ pressButton: ref });

      await user.type(input(), "https://b.fi");
      act(() => ref.current!.pressEnter());

      expect(props.onUpdate).toHaveBeenCalledWith(TYPE, "https://b.fi");
      expect(props.setCanSave).toHaveBeenLastCalledWith(true);
      expect(input()).toHaveValue("");
    });

    it("pressEnter epävalidilla arvolla: setCanSave(false) ja virhetila", async () => {
      const user = userEvent.setup();
      const ref = createRef<ListFormHandle>();
      const { props } = renderList({ pressButton: ref });

      await user.type(input(), "ftp://b.fi");
      act(() => ref.current!.pressEnter());

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.setCanSave).toHaveBeenLastCalledWith(false);
      expect(input()).toHaveAttribute("aria-invalid", "true");
    });

    it("pressEnter olemassa olevalla arvolla: varoitus, ei onUpdate-kutsua", async () => {
      const user = userEvent.setup();
      const ref = createRef<ListFormHandle>();
      const { props } = renderList({
        pressButton: ref,
        object: { name: TYPE, content: ["https://a.fi"] },
      });

      await user.type(input(), "https://a.fi");
      act(() => ref.current!.pressEnter());

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(screen.getByText(`Tämä ${TYPE} on jo olemassa`)).toBeInTheDocument();
    });
  });

  describe("lomakkeen submit (ohjelmallinen)", () => {
    it("validi uusi arvo lisätään ja kenttä tyhjennetään", async () => {
      const user = userEvent.setup();
      const { props } = renderList();
      await user.type(input(), "https://b.fi");

      fireEvent.submit(input().closest("form")!);

      expect(props.onUpdate).toHaveBeenCalledWith(TYPE, "https://b.fi");
      expect(input()).toHaveValue("");
    });

    it("olemassa oleva arvo: varoitus", async () => {
      const user = userEvent.setup();
      const { props } = renderList({ object: { name: TYPE, content: ["https://a.fi"] } });
      await user.type(input(), "https://a.fi");

      fireEvent.submit(input().closest("form")!);

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(screen.getByText(`Tämä ${TYPE} on jo olemassa`)).toBeInTheDocument();
    });

    it("epävalidi arvo: helperText('') ja virhetila", async () => {
      const user = userEvent.setup();
      const { props } = renderList();
      await user.type(input(), "ftp://b.fi");
      vi.mocked(props.helperText).mockClear();

      fireEvent.submit(input().closest("form")!);

      expect(props.onUpdate).not.toHaveBeenCalled();
      expect(props.helperText).toHaveBeenCalledWith("");
      expect(input()).toHaveAttribute("aria-invalid", "true");
    });
  });
});
