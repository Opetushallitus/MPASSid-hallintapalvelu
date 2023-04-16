import { createTheme } from "@mui/material/styles";
import components from "./components";
import palette from "./palette";

let theme = createTheme({
  palette,
  shape: {
    borderRadius: 3,
  },
  typography: {
    button: {
      textTransform: "none",
    },
    fontSize: 16,
    h1: {
      fontSize: 28,
      fontWeight: 500,
    },
    h2: {
      fontSize: 20,
      fontWeight: 500,
    },
    h3: {
      fontSize: 16,
      fontWeight: 700,
    },
  },
});

theme = createTheme(theme, components(theme));

export default theme;
