import superTemplate from "@visma/vite-plugin-super-template";
import dynamicBase from "@visma/vite-plugin-super-template/lib/dynamicBase.js";
import { defineConfig } from "vite";

export default defineConfig({
  base:
    (process.env.NODE_ENV === "production" && process.env.VITE_BASENAME) ||
    undefined,
  resolve: {
    // https://github.com/vitejs/vite/issues/3040
    alias:
      process.env.NODE_ENV !== "production"
        ? {
            "./useLocale.js": "./useLocale.ts",
          }
        : undefined,
  },
  plugins: [
    superTemplate({
      reactIntlBundledMessages: { noParser: false },
    })
      // Each plugin except dynamicBase
      .filter((plugin) => plugin !== dynamicBase),
  ],
});
