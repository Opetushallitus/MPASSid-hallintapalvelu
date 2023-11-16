import { useAttributeNames } from "@/api";
import { useMe } from "@/api/käyttöoikeus";
import NotFound from "@/components/NotFound";
import { category, tallentajaOphGroup } from "@/config";
import Basic from "@/layouts/Basic";
import Localisations from "@/utils/components/Localisations";
import Suspense from "@/utils/components/Suspense";
import ThemeShowcase from "@/utils/mui-theme/Showcase";
import { useMemo } from "react";
import type { MessageDescriptor } from "react-intl";
import { Navigate, Route, Routes as ReactRouterRoutes } from "react-router-dom";
import defaultMessages from "../../lang/fi-FI.json";
import Home from "./home";
import Integraatio from "./integraatio";

export default function Routes() {
  const defaultMessages = useDefaultMessagesWithAvailableAttributeKeys();

  return (
    <ReactRouterRoutes>
      <Route element={<Basic />}>
        <Route index element={<Home />} />
        <Route path="integraatio/:integrationId" element={<Integraatio />} />
        {useMe().groups?.includes(tallentajaOphGroup) && (
          <>
            <Route
              path="lokalisointi"
              element={
                <Suspense>
                  <Localisations
                    category={category}
                    defaultMessages={defaultMessages}
                  />
                </Suspense>
              }
            />
            <Route
              path="_lokalisointi"
              element={<Navigate to="/lokalisointi" />}
            />
          </>
        )}
        {!ENV.PROD && (
          <Route path="theme-showcase/*" element={<ThemeShowcase />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </ReactRouterRoutes>
  );
}

function useDefaultMessagesWithAvailableAttributeKeys() {
  const attributes = useAttributeNames();

  return useMemo(() => {
    const defaultMessagesMemo: { [key: string]: MessageDescriptor } = {
      ...defaultMessages,
    };

    if(attributes) {
      attributes.forEach((attribute) => {
        [
          { description: "attribuutti", prefix: "attribuutti" },
          { description: "attribuutin työkaluvihje", prefix: "työkaluvihje" },
        ].forEach(({ description, prefix }) => {
          const key = [prefix, attribute].join(".");
  
          if (!(key in defaultMessagesMemo)) {
            defaultMessagesMemo[key] = { description, defaultMessage: "" };
          }
        });
      });
    }
    

    return defaultMessagesMemo;
  }, [attributes]);
}
