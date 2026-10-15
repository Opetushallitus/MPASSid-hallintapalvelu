import { MenuItem, Table, TableHead, TableRow } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntlProvider } from "react-intl";
import { BrowserRouter, MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import TableCellWithSortAndRouterIntegration from "./TableCellWithSortAndRouterIntegration";

// ---------------------------------------------------------------------------
// The click handler reads the live sort from window.location (not from the
// router), so the tests use BrowserRouter on jsdom's history, like the app
// (App.tsx). One test shows the MemoryRouter difference.
// ---------------------------------------------------------------------------

/** Renders the current query string so the tests can read it. */
function LocationProbe() {
  return <div data-testid="location">{useLocation().search}</div>;
}

const currentSearch = () => screen.getByTestId("location").textContent ?? "";

const header = (
  sort: string | string[],
  otherProps: Partial<React.ComponentProps<typeof TableCellWithSortAndRouterIntegration>> = {}
) => (
  <Table>
    <TableHead>
      <TableRow>
        <TableCellWithSortAndRouterIntegration sort={sort} {...otherProps}>
          Tunniste
        </TableCellWithSortAndRouterIntegration>
      </TableRow>
    </TableHead>
  </Table>
);

const renderHeader = (
  sort: string | string[],
  search = "",
  otherProps: Partial<React.ComponentProps<typeof TableCellWithSortAndRouterIntegration>> = {}
) => {
  window.history.replaceState(null, "", `/${search}`);
  return render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <BrowserRouter>
        {header(sort, otherProps)}
        <LocationProbe />
      </BrowserRouter>
    </IntlProvider>
  );
};

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

const sortParams = () => new URLSearchParams(currentSearch()).getAll("sort");
const cell = () => screen.getByRole("columnheader");
const sortButton = () => screen.getByRole("button", { name: /^Tunniste/ });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lajittelusuunnan näyttäminen", () => {
  it("ei lajittelua: ei aktiivinen, ei aria-sortia eikä piilotekstiä", () => {
    renderHeader("id");
    expect(sortButton()).not.toHaveClass("Mui-active");
    expect(sortButton()).toHaveAccessibleName("Tunniste");
    expect(cell()).not.toHaveAttribute("aria-sort");
  });

  it("nouseva: aktiivinen, aria-sort ja piiloteksti", () => {
    renderHeader("id", "?sort=id,asc");
    expect(sortButton()).toHaveClass("Mui-active");
    expect(cell()).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByText("järjestetty nousevasti")).toBeInTheDocument();
    expect(sortButton()).toHaveAccessibleName("Tunnistejärjestetty nousevasti");
    expect(sortButton()).toHaveClass("MuiTableSortLabel-directionAsc");
  });

  it("laskeva: aktiivinen, aria-sort ja piiloteksti", () => {
    renderHeader("id", "?sort=id,desc");
    expect(sortButton()).toHaveClass("Mui-active");
    expect(cell()).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByText("järjestetty laskevasti")).toBeInTheDocument();
    expect(sortButton()).toHaveClass("MuiTableSortLabel-directionDesc");
  });

  it("toisen sarakkeen lajittelu ei aktivoi", () => {
    renderHeader("id", "?sort=name,asc");
    expect(sortButton()).not.toHaveClass("Mui-active");
    expect(cell()).not.toHaveAttribute("aria-sort");
  });

  it("polkulista: mikä tahansa listan polku aktivoi", () => {
    renderHeader(["a", "b"], "?sort=b,desc");
    expect(sortButton()).toHaveClass("Mui-active");
    expect(cell()).toHaveAttribute("aria-sort", "descending");
  });

  it("useasta osumasta ensimmäinen URL:ssa ratkaisee", () => {
    renderHeader(["a", "b"], "?sort=b,desc&sort=a,asc");
    expect(cell()).toHaveAttribute("aria-sort", "descending");
  });
});

describe("klikkaus", () => {
  it("vaihtaa järjestyksen: ei -> nouseva -> laskeva -> nouseva", async () => {
    const user = userEvent.setup();
    renderHeader("id");

    await user.click(sortButton());
    expect(sortParams()).toEqual(["id,asc"]);
    expect(window.location.search).toBe("?sort=id%2Casc");
    expect(cell()).toHaveAttribute("aria-sort", "ascending");

    await user.click(sortButton());
    expect(sortParams()).toEqual(["id,desc"]);
    expect(cell()).toHaveAttribute("aria-sort", "descending");

    await user.click(sortButton());
    expect(sortParams()).toEqual(["id,asc"]);
  });

  it("korvaa muiden sarakkeiden lajittelun ja säilyttää muut parametrit (myös sivun)", async () => {
    const user = userEvent.setup();
    renderHeader("id", "?sort=name,desc&hae=koulu&sivu=3");

    await user.click(sortButton());

    const params = new URLSearchParams(currentSearch());
    expect(params.getAll("sort")).toEqual(["id,asc"]);
    expect(params.get("hae")).toBe("koulu");
    expect(params.get("sivu")).toBe("3");
  });

  it("polkulista: asettaa lajittelun jokaiselle polulle", async () => {
    const user = userEvent.setup();
    renderHeader(["a", "b"], "?sort=b,asc");

    await user.click(sortButton());
    expect(sortParams()).toEqual(["a,desc", "b,desc"]);
  });

  it("nopeat peräkkäiset klikkaukset vaihtavat suuntaa joka kerta", async () => {
    const user = userEvent.setup();
    renderHeader("id");
    const button = sortButton();
    await user.tripleClick(button);
    expect(sortParams()).toEqual(["id,asc"]);
  });

  it("tuntematon suunta URL:ssa: aktiivinen, klikkaus tuottaa tyhjän suunnan", async () => {
    const user = userEvent.setup();
    renderHeader("id", "?sort=id,foo");
    expect(sortButton()).toHaveClass("Mui-active");

    await user.click(sortButton());
    expect(sortParams()).toEqual(["id,"]);
    expect(sortButton()).not.toHaveClass("Mui-active");
  });

  it("MemoryRouter: suunta luetaan selaimen URL:sta, joten lajittelu jää nousevaksi", async () => {
    // Router state says asc, but window.location has no sort.
    const user = userEvent.setup();
    render(
      <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
        <MemoryRouter initialEntries={["/?sort=id,asc"]}>
          {header("id")}
          <LocationProbe />
        </MemoryRouter>
      </IntlProvider>
    );
    expect(cell()).toHaveAttribute("aria-sort", "ascending");

    await user.click(sortButton());
    expect(sortParams()).toEqual(["id,asc"]);
  });
});

describe("muut propsit", () => {
  it("välittää propsit solulle", () => {
    renderHeader("id", "", { component: "div", align: "center" } as never);
    const div = sortButton().closest(".MuiTableCell-root")!;
    expect(div.tagName).toBe("DIV");
    expect(div).toHaveClass("MuiTableCell-alignCenter");
  });

  it("menuProps lisää sarakevalikon, jonka nimi on otsikkoteksti", async () => {
    const user = userEvent.setup();
    renderHeader("id", "", {
      menuProps: { children: <MenuItem>Suodata</MenuItem> },
    });
    // Faded out (visibility: hidden) until hover, so query by label.
    const menuButton = screen.getByLabelText("valikko sarakkeelle: Tunniste");
    await user.click(menuButton);
    expect(await screen.findByRole("menuitem", { name: "Suodata" })).toBeInTheDocument();
    // The sort label still works.
    expect(sortParams()).toEqual([]);
  });
});
