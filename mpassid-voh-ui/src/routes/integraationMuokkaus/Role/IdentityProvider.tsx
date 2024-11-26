import { useParams } from "react-router-dom";
import type { Components } from "@/api";
import { azureMetadataUrlTemplate, dataConfiguration, environments, testLink, UiConfiguration } from "@/config";
import { Box, Grid, Tooltip, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { DataRow } from "../../integraatio/IntegrationTab/DataRow"
import LinkValue from "../LinkValue";
import Type from "./Type";
import { useState, type Dispatch, type MutableRefObject } from "react";
import type { oneEnum } from "../Form/MultiSelectForm";
import MultiSelectForm from "../Form/MultiSelectForm";
import { useIntl } from 'react-intl';
import { envAbbreviationValues } from "@/routes/home/IntegrationsTable";
import { devLog } from "@/utils/devLog";
import ErrorBoundary from "@/components/ErrorBoundary";
import InputForm from "../Form/InputForm";
import { helperText, validate } from "@/utils/Validators";
import { last, toPath } from "lodash";
import FileUploader from "../Form/DragAndDropForm";

interface Props {
  integration: Components.Schemas.Integration;
  name?: string;
  tenantId?: string;
  environment: MutableRefObject<number>;
  metadataUrl: string;
  metadataFile: File[];
  setName?: Dispatch<string>;
  setCanSave?: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
  setMetadataFile: Dispatch<File[]>;
}

export default function Koulutustoimija({ integration, environment, tenantId='', setEnvironment, setCanSave, setMetadataUrl,metadataUrl="",metadataFile, setMetadataFile }: Props) {
    const { role } = useParams();
    const intl = useIntl();
    const identityProvider: Components.Schemas.Integration|Components.Schemas.Adfs|Components.Schemas.Azure|Components.Schemas.Gsuite= integration.configurationEntity!.idp!;
    const configurations:UiConfiguration[] = dataConfiguration.filter(conf=>conf.integrationType.filter(i=>i.name===identityProvider.type).length>0)
    const environmentConfiguration:UiConfiguration[] = configurations.filter(conf=>conf.environment!==undefined&&conf.environment===environment.current) || [];
    
    const testLinkHref =
      // eslint-disable-next-line no-new-func
      new Function("flowName", `return \`${testLink}\``)(
        identityProvider.flowName
      );
    
    const metadataUrlTemplate =
      // eslint-disable-next-line no-new-func
        new Function("tenantId", `return (tenantId!=='')?\`${azureMetadataUrlTemplate}\`:''`)(
          tenantId
        );
    
    
    const canSave = (value: boolean) => {  
      devLog("DEBUG","canSave (name)",name)
      devLog("DEBUG","canSave (value)",value)
    }

    const updateMetadataUrl = (name: string, value: string, type: string) => {

      
      devLog("DEBUG","updateMetadataUrl (name)",name)
      devLog("DEBUG","updateMetadataUrl (value)",value)
      devLog("DEBUG","updateMetadataUrl (type)",type)
      setMetadataUrl(value);
      if(value!== undefined && value !== "") {
        setMetadataFile([])
      }
      
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
      /*
      const loadFile = (event:ChangeEvent<HTMLInputElement>) => {
            
        const img:HTMLImageElement = document.getElementById('integratio-logo-preview') as HTMLImageElement;
        
        if(event&&event.target&&event.target.files&&event.target.files.length>0) {
            devLog("DEBUG", "File loaded",event.target.files[0])
            return(<span>Uploaded</span>)
         
        } else {
          return(<span>Not uploaded</span>)
        }
        
      };
      
      const metadataFileUpload = () => {
        return (<form >
          <input
            accept="image/*"
            hidden
            id="contained-button-file"
            multiple
            type="file"
            onChange={e=>loadFile(e)}
          />
          <label htmlFor="contained-button-file">
          {(identityProvider.metadataUrl)&&<><IconButton color="primary" component="span">
            <UploadFileRoundedIcon />
          </IconButton><FormattedMessage defaultMessage="Valitse"  /></>}
          {!(identityProvider.metadataUrl)&&<><IconButton color="error" component="span">
            <UploadFileRoundedIcon />
          </IconButton><span >{intl.formatMessage({
              defaultMessage: "Valitse, metadata on pakollinen",
            })}</span></>}
            
          </label>   
        </form>)
      }
      */
      const metadataUrlForm = (metadataUrl:string,metadataFiles:number) => {    
        
          const id = `attribuutti.metadataUrlField`;        
          const label = id in intl.messages ? { id } : undefined;
          const metadataUrlMandatory=(metadataFiles!==1||(metadataUrl!==undefined && metadataUrl !== ""))?true:false
          
          return (<>                
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
                    content: metadataUrl,
                    name: "metadataUrl"
                  }}
                  path="content"
                  type={"idp"}
                  isEditable={true}
                  mandatory={metadataUrlMandatory}
                  attributeType={"data"} 
                  label={label?intl.formatMessage(label):"metadataUrlField"} 
                  helperText={(data: string)=>helperText([],data)} 
                  setCanSave={canSave} 
                  onUpdate={updateMetadataUrl} 
                  onValidate={(data)=>validate([],data)} />
                </ErrorBoundary>
              
              
              </Typography>
        
      
      </>)
    
    }
        
    if(role==='idp') {
        
          return (
            <>
              <Typography variant="h2" gutterBottom>
                <FormattedMessage defaultMessage="OKJ-integraatiotyyppikohtaiset tiedot" />
              </Typography>
        
              <Grid container spacing={2} mb={2}>                
                                      
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
                {integration&&metadataFile&&(identityProvider.type==='azure'||identityProvider.type==='adfs')&&
                  <>
                    <DataRowTitle path={'metadataUrl'}/>              
                    <DataRowValue>
                        {metadataUrlForm(metadataUrl,metadataFile.length)}
                    </DataRowValue>                                        
                  </>
                }
                {(identityProvider.type==='adfs')&&
                  <>
                    <DataRowTitle/>              
                    <DataRowValue>
                      <FormattedMessage defaultMessage={"tai"} />
                    </DataRowValue>                                        
                  </>
                }                        
                {(identityProvider.type==='adfs')&&
                  <>
                    <DataRowTitle/>              
                    <DataRowValue>
                      <FileUploader  
                          fileExist={ ( metadataUrl !== undefined && metadataUrl !== "" ) || metadataFile.length === 1 }
                          emptyFiles={metadataFile.length === 1}
                          onDelete={()=>setMetadataFile([])}
                          onFilesDrop={(e) => {setMetadataFile(e);setMetadataUrl("")}} 
                        />
                    </DataRowValue>                                        
                  </>
                }
                {(identityProvider.type==='gsuite')&&
                  <>
                    <DataRowTitle path={'metadataUrl'}/>              
                    <DataRowValue>
                      <FileUploader     
                          fileExist={ ( metadataUrl !== undefined && metadataUrl !== "" ) || metadataFile.length === 1 }   
                          emptyFiles={metadataFile.length === 1}   
                          onDelete={()=>setMetadataFile([])}                                                                 
                          onFilesDrop={(e) => setMetadataFile(e)} 
                        />
                    </DataRowValue>                                        
                  </>
                }
                
                
                        
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

export type DataRowProps = {
  path?: string;
  children?: React.ReactNode
};

function DataRowTitle({path}:DataRowProps) {

  const name = last(toPath(path));
  const intl = useIntl();
  const id = `attribuutti.${name}`;
  const tooltipId = `työkaluvihje.${name}`;
  const label = id in intl.messages ? { id } : undefined;
  const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;

  return (
    <>
      <Grid item xs={4}>
        <Tooltip
          title={
            <>
              {tooltip && (
                <Box mb={1}>
                  <FormattedMessage {...tooltip} />
                </Box>
              )}
              <code>{name}</code>
            </>
          }
        >
          <span>{label ? <FormattedMessage {...label} /> : name}</span>
        </Tooltip>
      </Grid>
      
    </>
  );
}

function DataRowValue({children}:DataRowProps) {

  return (
      <Grid item xs={8}>
        {children}
      </Grid>
  );
}

