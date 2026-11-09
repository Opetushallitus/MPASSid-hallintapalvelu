import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Custom, { Suspend } from "./Custom";

const renderCustom = (path = "/theme-showcase") =>
  render(
    <IntlProvider locale="fi" defaultLocale="fi" onError={() => {}}>
      <MemoryRouter initialEntries={[path]}>
        <Custom />
      </MemoryRouter>
    </IntlProvider>
  );

describe("Custom (teeman esittelysivu)", () => {
  it("renderöityy kaikkine osioineen", () => {
    renderCustom();

    expect(screen.getByRole("heading", { level: 2, name: "Custom" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)
    ).toEqual([
      "TablePaginationWithRouterIntegration",
      "TablePagination",
      "PageHeader",
      "HeaderIcon",
      "Suspense",
      "Suspense: inline=true",
      "SecondaryCodeWithTooltip",
      "AppBarNavLinkTabs",
      "RowsPerPage",
    ]);
    expect(screen.getByText(/Page header with icon and secondary text/)).toBeInTheDocument();
    expect(screen.getByText("( secondary text )")).toBeInTheDocument();
  });

  it("sivutukset ja rivimäärävalinta", () => {
    renderCustom();
    expect(screen.getAllByRole("navigation", { name: "pagination navigation" })).toHaveLength(2);
    expect(screen.getByRole("combobox", { name: /^Näytä sivulla/ })).toHaveTextContent("10");
  });

  it("navigaatiovälilehdet: nykyisen polun välilehti valittuna", () => {
    renderCustom("/theme-showcase/tab-2");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Tab 1",
      "Tab 2",
      "Tab 3",
    ]);
    expect(screen.getByRole("tab", { name: "Tab 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tab 3" })).toHaveAttribute(
      "href",
      "/theme-showcase/tab-3"
    );
  });

  it("Suspense-esimerkit: Ready-sisältö näkyy", () => {
    renderCustom();
    ["Load", "Ready", "Update"].forEach((title) =>
      expect(screen.getAllByText(title)).toHaveLength(2)
    );
    expect(screen.getAllByText(/Lorem ipsum dolor sit amet/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Number of results:/)).toHaveLength(3);
  });

  it("Suspend heittää aina lupauksen", () => {
    expect(() => Suspend()).toThrow();
    try {
      Suspend();
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(Promise);
    }
  });
});
