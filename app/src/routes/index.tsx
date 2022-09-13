import NotFound from "@/components/NotFound";
import { Route, Routes as ReactRouterRoutes } from "react-router-dom";
import Home from "./home";
import Basic from "./layouts/Basic";

export default function Routes() {
  return (
    <ReactRouterRoutes>
      <Route element={<Basic />}>
        <Route index element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </ReactRouterRoutes>
  );
}
