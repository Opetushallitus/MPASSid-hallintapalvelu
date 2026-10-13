import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import formatjs from "eslint-plugin-formatjs";
import noLoops from "eslint-plugin-no-loops";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    // Generated clients, build output, vendored packages and the MSW worker
    // are not linted.
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "vendor/**",
      "src/api/**",
      "public/mockServiceWorker.js",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  jsxA11y.flatConfigs.recommended,

  {
    plugins: {
      "react-hooks": reactHooks,
      import: importPlugin,
      formatjs,
      "no-loops": noLoops,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // formatjs message hygiene (previously from super-template).
      "formatjs/enforce-default-message": "error",
      "formatjs/enforce-placeholders": "error",
      "formatjs/no-id": "error",
      "formatjs/no-multiple-whitespaces": "error",

      // Stylistic / advisory rules carried over from super-template.
      "no-console": "warn",
      "no-loops/no-loops": "warn",
      "prefer-const": "warn",
      "react/style-prop-object": [
        "warn",
        {
          allow: ["FormattedNumber", "FormattedRelativeTime"],
        },
      ],

      // tsc already resolves modules; the import resolver would only add noise.
      "import/no-unresolved": "off",
    },
  },

  // Must be last: turns off rules that conflict with Prettier.
  eslintConfigPrettier,
);
