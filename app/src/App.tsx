import createTheme from "@opetushallitus/virkailija-ui-components/createTheme";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ThemeProvider } from "styled-components";
import { Home } from "./Home";
import IntlProvider from "./IntlProvider";

const theme = createTheme();

export default function App() {
  return (
    <>
      <ThemeProvider theme={theme}>
        <Suspense>
          <IntlProvider>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Home />
            </ErrorBoundary>
          </IntlProvider>
        </Suspense>
      </ThemeProvider>
    </>
  );
}

const ErrorFallback = () => null;
