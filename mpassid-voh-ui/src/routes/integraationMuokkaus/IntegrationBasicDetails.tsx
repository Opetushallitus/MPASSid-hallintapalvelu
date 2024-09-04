import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from 'react-intl';
import type { DataRowProps } from '../integraatio/IntegrationTab/DataRow';
import { DataRow } from '../integraatio/IntegrationTab/DataRow';
import {
    typeAbbreviations,
    typeTooltips,
  } from "@/routes/home/IntegrationsTable";
import UniqueId from "./UniqueId";
import type { oneEnum } from "./Form/MultiSelectForm";
import MultiSelectForm from "./Form/MultiSelectForm";
import type { Dispatch, MutableRefObject} from "react";
import { useState } from "react";
import { devLog } from '../../utils/devLog';


interface Props {
    integration: Components.Schemas.Integration;
    environment: MutableRefObject<number>;
    newEnvironment: boolean;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    metadata?: any;
    setNewEnvironment: Dispatch<boolean>;
}
  
export default function IntegrationBasicDetails({ integration, configurationEntity, environment, setNewEnvironment, newEnvironment, metadata }: Props) {

    const [ values, setValues ] = useState<string[]>([String(environment.current)])
    const intl = useIntl();
    const role  = (configurationEntity?.idp) ? "idp" : "sp"

    const environmentValues: oneEnum[]=[ { label: intl.formatMessage({defaultMessage: "Tuotanto-Testi"}), value: "2" }, { label:intl.formatMessage({defaultMessage: "Tuotanto"}), value: "1" },{ label:intl.formatMessage({defaultMessage: "Testi"}), value: "0" }]
    const environmentSPValues: oneEnum[]=[  { label:intl.formatMessage({defaultMessage: "Tuotanto"}), value: "1" },{ label:intl.formatMessage({defaultMessage: "Testi"}), value: "0" }]
    
    const updateEnvironment = (valueList: string[]) => {
      setNewEnvironment(!newEnvironment)
      if(valueList&&valueList.length>0) {
        setValues([ valueList[0] ])
        environment.current=parseInt(valueList[0])
      } else {
        setValues([ "0" ])
        environment.current=0
      }
    }
    devLog("configurationEntity",configurationEntity)
    devLog("METADATA",metadata)
    return(
        <>
              <Typography variant="h2" gutterBottom>
                <FormattedMessage defaultMessage="Integraation perustiedot" />
              </Typography>

              <Grid container spacing={2} mb={3}>
                {integration.id!==0&&<DataRow object={integration} path="id" />}
                <Grid item xs={4}>
                  <FormattedMessage defaultMessage="Jäsentyyppi" />
                </Grid>
                <Grid item xs={8}>
                  <FormattedMessage {...typeAbbreviations[role]} /> (
                  <FormattedMessage {...typeTooltips[role]} />)
                </Grid>
                <Grid item xs={4}>
                  <FormattedMessage defaultMessage="Yksilöllinen tunniste" />
                </Grid>
                
                
                <Grid item xs={8}>
                  {configurationEntity&&<UniqueId
                    configurationEntity={configurationEntity!}
                    role={role}
                    ValueComponent={UniqueIdValue}
                  />}
                </Grid>
                {false&&values&&values.length>0&&(values[0]==='0'||values[0]==='1'||values[0]==='2')&&<>
                  <Grid item xs={4}>
                    <FormattedMessage defaultMessage="deploymentPhase" />
                  </Grid>
                  <Grid item xs={8} sx={{}}>
                          <Typography
                          sx={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                          }}
                          variant="caption"
                          />
                          
                          <MultiSelectForm label={""} attributeType={"data"} isEditable={true} multiple={false} createEmpty={false} mandatory={false} enums={environmentValues} values={values} helperText={function (data: string): JSX.Element {
                              throw new Error("Function not implemented.");
                            } } setCanSave={function (value: boolean): void {
                              throw new Error("Function not implemented.");
                            } } onUpdate={updateEnvironment} onValidate={function (data: string): boolean {
                              throw new Error("Function not implemented.");
                            } }  />
                  </Grid>
                </>}

                {false&&role === "sp"&&values&&values.length>0&&(values[0]==='0'||values[0]==='1'||values[0]==='2')&&<>
                  <Grid item xs={4}>
                    <FormattedMessage defaultMessage="deploymentPhase" />
                  </Grid>
                  <Grid item xs={8} sx={{}}>
                          <Typography
                          sx={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                          }}
                          variant="caption"
                          />
                          
                          <MultiSelectForm label={""} attributeType={"data"} isEditable={true} multiple={false} createEmpty={false} mandatory={false} enums={environmentSPValues} values={values} helperText={function (data: string): JSX.Element {
                              throw new Error("Function not implemented.");
                            } } setCanSave={function (value: boolean): void {
                              throw new Error("Function not implemented.");
                            } } onUpdate={updateEnvironment} onValidate={function (data: string): boolean {
                              throw new Error("Function not implemented.");
                            } }  />
                  </Grid>
                </>}
                  
                  {role === "sp" && (
                      <DataRow
                      object={integration}
                      path="integrationGroups"
                      type="service-list"
                    />
                  )}
              </Grid>
            </>
    )
  
}

export function UniqueIdValue({ name, label, children }: DataRowProps) {
    return (
      <>
        {(children as JSX.Element)?.props?.value ? children : "–"} (
        <span>{label ? <FormattedMessage {...label} /> : name}</span>)
      </>
    );
  }