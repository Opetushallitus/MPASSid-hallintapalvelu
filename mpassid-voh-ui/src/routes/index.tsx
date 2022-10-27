import NotFound from "@/components/NotFound";
import Basic from "@/layouts/Basic";
import ThemeShowcase from "@/utils/mui-theme/Showcase";
import { Route, Routes as ReactRouterRoutes } from "react-router-dom";
import Home from "./home";
import Integraatio from "./integraatio";

export default function Routes() {
  return (
    <ReactRouterRoutes>
      <Route element={<Basic />}>
        <Route index element={<Home />} />
        <Route path="integraatio/:integrationId" element={<Integraatio />} />
        {!ENV.PROD && (
          <Route path="theme-showcase" element={<ThemeShowcase />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </ReactRouterRoutes>
  );
}
