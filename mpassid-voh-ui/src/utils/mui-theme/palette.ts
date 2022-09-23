import styleGuide from "./styleGuide";

const palette = {
  ...styleGuide.colors,
  common: {
    black: styleGuide.colors.neutral.black,
  },
  error: {
    main: styleGuide.colors.red.main,
  },
  success: {
    main: styleGuide.colors.green.main,
  },
  background: {
    default: styleGuide.colors.gray["lighten-6"],
  },
  warning: {
    main: styleGuide.colors.yellow.main,
  },
  grey: {
    "50": "#fafafa",
    "100": styleGuide.colors.gray["lighten-5"],
    "200": "#f2f2f2",
    "300": styleGuide.colors.gray["lighten-3"],
    "400": styleGuide.colors.gray["lighten-2"],
    "500": styleGuide.colors.gray["lighten-1"],
    "700": styleGuide.colors.gray.main,
  },
};

export default palette;
