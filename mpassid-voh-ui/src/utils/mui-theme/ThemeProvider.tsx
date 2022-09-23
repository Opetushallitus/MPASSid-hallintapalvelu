import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { CssBaseline } from "@mui/material";
import { enUS, fiFI, svSE } from "@mui/material/locale";
import {
  createTheme,
  ThemeProvider as MUIThemeProvider,
} from "@mui/material/styles";
import { useMemo } from "react";
import theme from "./theme";

interface Props {
  children?: React.ReactNode;
  lang?: "en" | "fi" | "sv";
}

export default function ThemeProvider({ children, lang = "fi" }: Props) {
  const locale = {
    fi: fiFI,
    sv: svSE,
    en: enUS,
  }[lang];

  const themeMemoized = useMemo(() => createTheme(theme, locale), [locale]);

  return (
    <MUIThemeProvider theme={themeMemoized}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}
