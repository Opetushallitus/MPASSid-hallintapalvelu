import { useParams } from "react-router-dom";
import { useIntegrationSafe } from "@/api/client";
import type { Components } from "@/api";
import { useKoodisByKoodisto } from "@/api/koodisto";
import { testLink } from "@/config";
import getKoodistoValue from "@/utils/getKoodistoValue";
import toLanguage from "@/utils/toLanguage";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { DataRow, TextList } from "../../integraatio/IntegrationTab/DataRow"
import LinkValue from "../LinkValue";
import Type from "./Type";
import { Dispatch } from "react";

interface Props {
  integration: Components.Schemas.Integration;
  setName?: Dispatch<string>;
  setCanSave?: Dispatch<boolean>;
}

export default function Koulutustoimija({ integration }: Props) {
    const { role } = useParams();
    
    const identityProvider = integration.configurationEntity!.idp!;
  
    const testLinkHref =
      // eslint-disable-next-line no-new-func
      new Function("flowName", `return \`${testLink}\``)(
        identityProvider.flowName
      );

    if(role==='idp') {
        
          return (
            <>
              <Typography variant="h2" gutterBottom>
                <FormattedMessage defaultMessage="OKJ-integraatiotyyppikohtaiset tiedot" />
              </Typography>
        
              <Grid container spacing={2} mb={2}>
                <DataRow object={identityProvider} path="type" type={Type} />
                
                {["adfs", "azure", "gsuite"].includes(identityProvider.type!) && (
                  <>
                    <DataRow
                      object={identityProvider}
                      path="metadataValidUntil"
                      type="date"
                    />
                    <DataRow
                      object={identityProvider}
                      path="signingCertificateValidUntil"
                      type="date"
                    />
                    <DataRow
                      object={identityProvider}
                      path="encryptionCertificateValidUntil"
                      type="date"
                    />
                  </>
                )}
                <Grid item xs={4}>
                  <FormattedMessage defaultMessage="Testauslinkki" />
                </Grid>
                <Grid item xs={8} zeroMinWidth>
                  <LinkValue href={testLinkHref} />
                </Grid>
              </Grid>
            </>
          );
    } else {
        return(<></>)
    }
    
}