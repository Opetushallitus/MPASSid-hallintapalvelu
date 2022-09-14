import NotFound from "@/components/NotFound";
import Basic from "@/layouts/Basic";
import { Route, Routes as ReactRouterRoutes } from "react-router-dom";
import Home from "./home";

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
