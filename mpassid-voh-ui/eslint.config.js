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
    // Generated clients, build output, vendored packages, test reports and
    // the MSW worker are not linted (ESLint does not read .gitignore).
    ignores: [
      "dist/**",
      "build/**",
      "target/**",
      "playwright-report/**",
      "test-results/**",
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

      // Only check real DOM elements: `role` is also a prop of our own
      // components (e.g. UniqueId), and autoFocus is used on MUI dialog
      // buttons to focus the dialog's primary action.
      "jsx-a11y/aria-role": ["error", { ignoreNonDOM: true }],
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],

      // `_`-prefixed parameters/variables and unused `catch (e)` bindings are
      // intentional.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },

  {
    // Playwright e2e tests run their steps one after another (`await` in a
    // loop), so loops are allowed there.
    files: ["e2e/**/*.ts"],
    rules: {
      "no-loops/no-loops": "off",
    },
  },

  {
    // Node scripts (message export/import tooling).
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Must be last: turns off rules that conflict with Prettier.
  eslintConfigPrettier,
);
