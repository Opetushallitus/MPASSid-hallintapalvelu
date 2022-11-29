import NotFound from "@/components/NotFound";
import { category } from "@/config";
import Basic from "@/layouts/Basic";
import Localisations from "@/utils/components/Localisations";
import ThemeShowcase from "@/utils/mui-theme/Showcase";
import { Route, Routes as ReactRouterRoutes } from "react-router-dom";
import defaultMessages from "../../lang/fi-FI.json";
import Home from "./home";
import Integraatio from "./integraatio";

export default function Routes() {
  return (
    <ReactRouterRoutes>
      <Route element={<Basic />}>
        <Route index element={<Home />} />
        <Route path="integraatio/:integrationId" element={<Integraatio />} />
        <Route
          path={"__lokalisointi"}
          element={
            <Localisations
              category={category}
              defaultMessages={defaultMessages}
            />
          }
        />
        {!ENV.PROD && (
          <Route path="theme-showcase/*" element={<ThemeShowcase />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </ReactRouterRoutes>
  );
}
