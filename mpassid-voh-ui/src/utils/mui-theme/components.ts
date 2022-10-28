import type { Theme, ThemeOptions } from "@mui/material";
import { buttonBaseClasses } from "@mui/material/ButtonBase";
import { switchClasses } from "@mui/material/Switch";

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
      MuiAppBar: {
        defaultProps: {
          position: "static",
        },
        styleOverrides: {
          root: {
            backgroundColor: theme.palette.common.white,
            color: theme.palette.grey["800"],
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
      MuiCircularProgress: {
        defaultProps: {
          size: 26,
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
      MuiSwitch: {
        styleOverrides: {
          root: {
            padding: 8,
            [`.${buttonBaseClasses.root}.${switchClasses.checked}+.${switchClasses.track}`]:
              {
                opacity: "initial !important",
              },
          },
          track: {
            borderRadius: 22 / 2,
            "&:before, &:after": {
              content: '""',
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
            },
            "&:before": {
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
                theme.palette.getContrastText(theme.palette.primary.main)
              )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
              left: 12,
            },
          },
          thumb: {
            boxShadow: "none",
            width: 18,
            height: 18,
            margin: 1,
            backgroundColor: theme.palette.common.white,
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
            "--background-color": theme.palette.background.paper,
            "&:nth-of-type(even)": {
              backgroundColor: theme.palette.grey["50"],
              "--background-color": theme.palette.grey["50"],
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          scrollButtons: {
            [`&.${switchClasses.disabled}`]: {
              opacity: 0.3,
            },
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          placement: "right",
          arrow: true,
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
