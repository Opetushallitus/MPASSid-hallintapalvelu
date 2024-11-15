import { useParams } from "react-router-dom";
import type { Components } from "@/api";
import { azureMetadataUrlTemplate, dataConfiguration, environments, testLink, UiConfiguration } from "@/config";
import { Box, Grid, Tooltip, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { DataRow } from "../../integraatio/IntegrationTab/DataRow"
import LinkValue from "../LinkValue";
import Type from "./Type";
import type { Dispatch, MutableRefObject } from "react";
import type { oneEnum } from "../Form/MultiSelectForm";
import MultiSelectForm from "../Form/MultiSelectForm";
import { useIntl } from 'react-intl';
import { envAbbreviationValues } from "@/routes/home/IntegrationsTable";
import { devLog } from "@/utils/devLog";
import ErrorBoundary from "@/components/ErrorBoundary";
import InputForm from "../Form/InputForm";
import { helperText, validate } from "@/utils/Validators";

interface Props {
  integration: Components.Schemas.Integration;
  name?: string;
  tenantId?: string;
  environment: MutableRefObject<number>;
  setName?: Dispatch<string>;
  setCanSave?: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
}

export default function Koulutustoimija({ integration, environment, tenantId='', setEnvironment, setCanSave, setMetadataUrl }: Props) {
    const { role } = useParams();
    const intl = useIntl();
    const identityProvider: Components.Schemas.Integration|Components.Schemas.Azure= integration.configurationEntity!.idp!;
    const configurations:UiConfiguration[] = dataConfiguration.filter(conf=>conf.integrationType.filter(i=>i.name===identityProvider.type).length>0)
    const environmentConfiguration:UiConfiguration[] = configurations.filter(conf=>conf.environment!==undefined&&conf.environment===environment.current) || [];
    var metadataUrlEdit=(identityProvider.metadataUrl)?true:false
    
    const testLinkHref =
      // eslint-disable-next-line no-new-func
      new Function("flowName", `return \`${testLink}\``)(
        identityProvider.flowName
      );
    
    const metadataUrlTemplate =
      // eslint-disable-next-line no-new-func
        new Function("tenantId","metadataUrlEdit", `return (tenantId!==''&&!metadataUrlEdit)?\`${azureMetadataUrlTemplate}\`:''`)(
          tenantId,metadataUrlEdit
        );
    
    
    const canSave = (value: boolean) => {  
      devLog("DEBUG","canSave (name)",name)
      devLog("DEBUG","canSave (value)",value)
    }
    const updateMetadataUrl = (name: string, value: string, type: string) => {

      setMetadataUrl(value);
      metadataUrlEdit=true
      devLog("DEBUG","updateMetadataUrl (name)",name)
      devLog("DEBUG","updateMetadataUrl (value)",value)
      devLog("DEBUG","updateMetadataUrl (type)",type)
    }      

    const updateEnvironment = (values: String[]) => {
      if(values.length>0) {
        environment.current=+values[0];
        setEnvironment(+values[0]);        
      }
      devLog("DEBUG","updateEnvironment (values)",values)
    }   

    const environmentValues: oneEnum[] = environments.filter(env=>(env!=="0"||integration.deploymentPhase===0)).map(env => {
        return (
          {label: intl.formatMessage(envAbbreviationValues[env]), 
            value: String(env) }
          )
      });

      const metadataUrlForm = (metadataUrl:string|undefined) => {        
        const id = `attribuutti.metadataUrl`;
        const label = id in intl.messages ? { id: id } : undefined;           
        const tooltipId = `työkaluvihje.metadataUrl`;
        const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
        if(identityProvider.type==='azure') {
          return (<>                
          <Grid item xs={4}>
            <Tooltip
              title={
                  <>
                  {tooltip && (
                      <Box mb={1}>
                      <FormattedMessage {...tooltip} />
                      </Box>
                  )}
                  <code>metadataUrl</code>
                  </>
              }
              >
              <span>{label ? <FormattedMessage {...label} /> : 'metadataUrl'}</span>
            </Tooltip>
          </Grid>
          <Grid item xs={8} sx={{}}>
              <Typography
                sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                }}
                variant="caption"
                >
              <ErrorBoundary>
                <InputForm key={"metadataUrl"}
                  object={{
                    type: "idp",
                    content: metadataUrl||'',
                    name: "metadataUrl"
                  }}
                  path="content"
                  type={"idp"}
                  isEditable={true}
                  mandatory={true}
                  attributeType={"data"} 
                  label={""} 
                  helperText={(data: string)=>helperText([],data)} 
                  setCanSave={canSave} 
                  onUpdate={updateMetadataUrl} 
                  onValidate={(data)=>validate([],data)} />
                </ErrorBoundary>
              
              
              </Typography>
          </Grid>
      
      
      </>)} else {
        return(<></>)
      }
    
    }
        
    if(role==='idp') {
        
          return (
            <>
              <Typography variant="h2" gutterBottom>
                <FormattedMessage defaultMessage="OKJ-integraatiotyyppikohtaiset tiedot" />
              </Typography>
        
              <Grid container spacing={2} mb={2}>                
                  
                    {!true&&environment.current<0&&

                    (<>
                    <Grid item xs={4}>
                    <FormattedMessage defaultMessage="Palveluympäristö" />
                  </Grid>
                    <Grid item xs={8}>
                      <FormattedMessage
                        defaultMessage={`{deploymentPhase, select,
                          0 {Testi}
                          1 {Tuotanto}
                          2 {Tuotanto-Testi}
                          other {Tuntematon}
                        }`}
                        values={{ deploymentPhase: integration.deploymentPhase }}
                      />
                    </Grid>
                    </>)}
                    {environment.current>-1&&
                    (<>
                      <Grid item xs={4}>
                      <FormattedMessage defaultMessage="Palveluympäristö" />
                    </Grid>
                    <Grid item xs={8}>
                      <ErrorBoundary>
                        <MultiSelectForm 
                          key={"Palveluymparisto"}
                          values={[String(environment.current)]}
                          isEditable={true}
                          //onValidate={onValidate}
                          mandatory={false}
                          label={"Palveluympäristö"}
                          //helperText={helperText}
                          //setCanSave={setCanSaveItem} 
                          attributeType={"data"}
                          enums={environmentValues}
                          createEmpty={false}
                          multiple={false}
                          onUpdate={value => updateEnvironment(value)} 
                          helperText={function (data: string): JSX.Element { return(<></>);} } 
                          setCanSave={canSave} 
                          onValidate={function (data: string): boolean {
                            throw new Error("Function not implemented.");
                          } }/>
                      </ErrorBoundary>
                    </Grid>
                    </>)}
                <DataRow object={identityProvider} path="type" type={Type} />
                
                {metadataUrlForm(identityProvider.metadataUrl)}
                        
                {identityProvider.flowName&&(
                  <>
                    <Grid item xs={4}>
                      <FormattedMessage defaultMessage="Testauslinkki" />
                    </Grid>
                    <Grid item xs={8} zeroMinWidth>
                      <LinkValue href={testLinkHref} />
                    </Grid>
                  </>
                )}                                        
              </Grid>
            </>
          );
    } else {
        return(<></>)
    }
    
}

