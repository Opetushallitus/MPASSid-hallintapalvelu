import type { Theme, ThemeOptions } from "@mui/material";

const theme = (theme: Theme): ThemeOptions => {
  const paletteTextPrimary = {
    color: theme.palette.text.primary,
  };

  return {
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
        styleOverrides: {
          // TODO: flip normal & hover colors
          // outlined: (args) => ({
          //   border: `2px solid ${
          //     args.theme.palette[args.ownerState.color!].main
          //   }`,
          //   "&:hover": {
          //     border: `2px solid ${alpha(
          //       args.theme.palette[args.ownerState.color!].main,
          //       0.5
          //     )}`,
          //   },
          // }),
          outlined: {
            borderWidth: "2px",
            "&:hover": {
              borderWidth: "2px",
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderBottomWidth: 2,
            borderColor: theme.palette.grey["200"],
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: ({ ownerState }) => ({
            height: { small: "1.8em", medium: "2.4em" }[ownerState.size!],
          }),
        },
      },
      MuiPagination: {
        defaultProps: {
          color: "primary",
          size: "small",
          shape: "rounded",
        },
      },
      MuiPaginationItem: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 4,
        },
        styleOverrides: {
          root: {
            color: theme.palette.grey["700"],
          },
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
              backgroundColor: theme.palette.grey["50"],
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          h1: paletteTextPrimary,
          h2: paletteTextPrimary,
          h3: paletteTextPrimary,
          h4: paletteTextPrimary,
          h5: paletteTextPrimary,
          h6: paletteTextPrimary,
        },
      },
    },
  };
};

export default theme;
