import APIRedirectResponseHandler from "@/components/APIRedirectResponseHandler";
import ErrorBoundary from "@/components/ErrorBoundary";
import IntlProvider from "@/components/IntlProvider";
import Routes from "@/routes";
import MUIThemeProvider from "@/utils/mui-theme/ThemeProvider";
import createTheme from "@/utils/CreateThema";
import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import "./App.css";

const theme = createTheme();

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <MUIThemeProvider>
        <Suspense>
          <APIRedirectResponseHandler />
          <IntlProvider>
            <ErrorBoundary>
              <BrowserRouter basename={(ENV.PROD && ENV.BASENAME) || undefined}>
                <Routes />
              </BrowserRouter>
            </ErrorBoundary>
          </IntlProvider>
        </Suspense>
      </MUIThemeProvider>
    </ThemeProvider>
  );
}
