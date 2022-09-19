import IntlProvider from "@/components/IntlProvider";
import Routes from "@/routes";
import createTheme from "@opetushallitus/virkailija-ui-components/createTheme";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import "./App.css";
import Theme from "./Theme";

const theme = createTheme();

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Theme>
        <Suspense>
          <IntlProvider>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <BrowserRouter basename={(ENV.PROD && ENV.BASENAME) || undefined}>
                <Routes />
              </BrowserRouter>
            </ErrorBoundary>
          </IntlProvider>
        </Suspense>
      </Theme>
    </ThemeProvider>
  );
}

const ErrorFallback = () => null;
