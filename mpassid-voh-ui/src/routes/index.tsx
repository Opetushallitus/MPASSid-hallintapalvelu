import NotFound from "@/components/NotFound";
import Basic from "@/layouts/Basic";
import { Route, Routes as ReactRouterRoutes } from "react-router-dom";
import Home from "./home";
import ThemeDevelopmentHelpers from "../utils/theme-development-helpers";

export default function Routes() {
  return (
    <ReactRouterRoutes>
      <Route element={<Basic />}>
        <Route index element={<Home />} />
        {!ENV.PROD && (
          <Route
            path="theme-development-helpers"
            element={<ThemeDevelopmentHelpers />}
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </ReactRouterRoutes>
  );
}
