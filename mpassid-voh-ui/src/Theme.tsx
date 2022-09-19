import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import useMUILocale from "@visma/react-app-locale-utils/lib/useMUILocale";
import { useMemo } from "react";

interface Props {
  children?: React.ReactNode;
}

export default function Theme({ children }: Props) {
  const locale = useMUILocale();

  const theme = useMemo(
    () =>
      createTheme(
        {
          palette: {
            primary: {
              main: "#0a789b",
            },
            secondary: {
              main: "#00526c",
            },
            error: {
              main: "#db2828",
            },
            success: {
              main: "#118616",
            },
            background: {
              default: "#f0f3f7",
            },
          },
          shape: {
            borderRadius: 3,
          },
          typography: {
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
          components: {
            MuiAlert: {
              styleOverrides: {
                message: {
                  width: "100%",
                },
              },
            },
            MuiButton: {
              defaultProps: {
                // TODO: focus outline
                // disableRipple: true,
                variant: "contained",
              },
            },
            MuiDivider: {
              styleOverrides: {
                root: {
                  borderBottomWidth: 2,
                  borderColor: "#f2f2f2",
                },
              },
            },
            MuiPaper: {
              defaultProps: {
                elevation: 4,
              },
            },
            MuiTableCell: {
              styleOverrides: {
                head: {
                  paddingBottom: 6,
                },
                body: {
                  borderBottom: "none",
                },
              },
            },
            MuiTableRow: {
              styleOverrides: {
                root: {
                  "&:nth-of-type(even)": {
                    backgroundColor: "#fafafa",
                  },
                },
              },
            },
          },
        },
        locale
      ),
    [locale]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
