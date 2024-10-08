import type { ChangeEvent, Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import {  Alert, Box, Grid, IconButton, Paper, Switch, Tooltip, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { DataRow, TextList } from "../integraatio/IntegrationTab/DataRow";
import { getIntegrationDiscoveryInformation, type Components } from "@/api";
import getKoodistoValue from "@/utils/getKoodistoValue";
import { useKoodisByKoodisto } from "@/api/koodisto";
import toLanguage from "@/utils/toLanguage";
import type { oneEnum } from "./Form/MultiSelectForm";
import MultiSelectForm from "./Form/MultiSelectForm";
import { helperText, validate } from "@/utils/Validators";
import { SchoolForm } from "./Form";
import { clone, last, toPath } from "lodash";
import { PhotoCamera } from "@mui/icons-material";

interface Props {
    newLogo: boolean;
    isEditable: boolean; 
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    discoveryInformation: Components.Schemas.DiscoveryInformation;
    setCanSave: Dispatch<React.SetStateAction<boolean>>;
    setConfigurationEntity: Dispatch<Components.Schemas.ConfigurationEntity>;
    setDiscoveryInformation: Dispatch<Components.Schemas.DiscoveryInformation>;
    setLogo: Dispatch<Blob>;
    setNewLogo: Dispatch<boolean>;
}

interface SchoolType {
  nimi:string;
  oppilaitostyyppi: number;
  koulukoodi:string;
}

interface SchoolData {
  organisaatio:string;
  koulut: SchoolType[];
  existingIncludes:string[];
  existingExcludes:string[];
}

const kouluData:SchoolData = {
  organisaatio: '',
  koulut: [],
  existingIncludes: [],
  existingExcludes: []
}

const convertSchoolCode = (value?:string) => {
  if(value === undefined || value === null || value === '' ) {
    return 0;
  }
  return Number(value.substring(17).split("#")[0])
} 

export default function SchoolSelection({ integration, isEditable=false, setConfigurationEntity, configurationEntity, setDiscoveryInformation, discoveryInformation,setCanSave, setLogo, setNewLogo, newLogo }: Props){

    const [enums, setEnums] = useState<oneEnum[]>([]);
    //const [showSchools, setShowSchools] = useState<boolean>(integration.id===0||integration?.discoveryInformation?.showSchools!);
    const showSchools = useRef<boolean>(integration.id===0||integration?.discoveryInformation?.showSchools!)
    const [extraSchoolsConfiguration, setExtraSchoolsConfiguration] = useState<boolean>(
          ((discoveryInformation?.schools&&discoveryInformation?.schools?.length>0)||
          (discoveryInformation?.excludedSchools&&discoveryInformation?.excludedSchools?.length>0))||
          false);
    const [title, setTitle] = useState<string>(discoveryInformation?.title||integration?.organization?.name||'');
    const [institutionTypeList, setInstitutionTypeList] = useState<number[]>(integration?.configurationEntity?.idp?.institutionTypes||[]);
    //const [earlyEducationProvides, setEarlyEducationProvides] = useState<boolean>(discoveryInformation?.earlyEducationProvides||false);
    const [customDisplayName, setCustomDisplayName] = useState<string>(discoveryInformation?.customDisplayName||integration?.organization?.name||'');
    const institutionTypes = useKoodisByKoodisto(
        "mpassidnsallimatoppilaitostyypit"
      );
    const language = toLanguage(useIntl().locale).toUpperCase();
    const identityProvider = integration.configurationEntity!.idp!;
    const possibleSchools = useRef<oneEnum[]>(integration?.organization?.children?.map(c=>({ nimi: c.name!, oppilaitostyyppi: convertSchoolCode(c.oppilaitostyyppi), koulukoodi: c.oppilaitosKoodi||''})).map(k=>({ label: k.nimi, value: k.koulukoodi }))||[]);
    const [schools, setSchools] = useState<string[]>(integration?.discoveryInformation?.schools||[]);
    
    const [excludeSchools, setExcludeSchools] = useState<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const [alreadyExcludeSchools, setAlreadyExcludeSchools] = useState<boolean>(false);
    const [exampleSchool, setExampleSchool] = useState<string>(possibleSchools.current?.filter(p=>excludeSchools.indexOf(p?.value||'')===-1)[0]?.label||'Mansikkalan koulu');
    const [schoolData, setSchoolData] = useState<SchoolData>(kouluData);
    const [showLogo, setShowLogo] = useState<boolean>(false);
    const extraSchoolConfigurationNeeded = useRef<boolean>(false)
    const disableExtraSchoolConfiguration = useRef<boolean>(false);
    const intl = useIntl();

    useEffect(() => {
      if(integration.organization?.children) {
        
        const newSchoolData:SchoolData = { organisaatio: integration.organization.oid!, 
                                            koulut: [],
                                            existingIncludes: [],
                                            existingExcludes: [] }

        newSchoolData.koulut = integration.organization?.children.map(c=>({ nimi: c.name!, oppilaitostyyppi: convertSchoolCode(c.oppilaitostyyppi), koulukoodi: c.oppilaitosKoodi||''}))
        
        possibleSchools.current=newSchoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
        if(integration?.discoveryInformation?.schools&&integration.discoveryInformation.schools.length>0) {
          const existingSchools=integration.discoveryInformation.schools;
          newSchoolData.koulut.map(k=>({ label: k.nimi, value: String(k.koulukoodi) }))
          .forEach(element => {
            if(existingSchools.indexOf(element.value)>-1) {
              if(possibleSchools.current.map(p=>p.value).indexOf(element.value)<0) {
                possibleSchools.current.push(element)
              }
            }
            
          });
        }
        if(integration?.discoveryInformation?.excludedSchools&&integration.discoveryInformation.excludedSchools.length>0) {
          const existingExcludeSchools=integration.discoveryInformation.excludedSchools;
          newSchoolData.koulut.map(k=>({ label: k.nimi, value: String(k.koulukoodi) }))
          .forEach(element => {
            if(existingExcludeSchools.indexOf(element.value)>-1&&possibleSchools.current.map(ps=>ps.value).indexOf(element.value)>-1) {
              if(possibleSchools.current.map(p=>p.value).indexOf(element.value)<0) {
                possibleSchools.current.push(element)
              }
            }
            
          });
        }
        setSchoolData(newSchoolData)
      }
      
      
    }, [institutionTypeList, integration,possibleSchools]);


    const isExtraSchoolConfigurationOk = () => {
      
      if(extraSchoolConfigurationNeeded.current) {
        return (discoveryInformation?.showSchools&&configurationEntity&&
          configurationEntity?.idp?.institutionTypes?.length!>0&&
          ((discoveryInformation?.excludedSchools?.length!>0||discoveryInformation?.schools?.length!>0)))
      } else {
        return discoveryInformation?.excludedSchools?.length!>=0&&discoveryInformation?.schools?.length!>=0;
      }

    }

    const saveCheck = (value:boolean,showLogo:boolean,showSchools:boolean) => {

      
      if(integration?.configurationEntity?.idp) {
        
        if(value&&
          ((configurationEntity?.idp?.logoUrl&&configurationEntity?.idp?.logoUrl!=='')||showLogo)&&
           (!showSchools||
            (showSchools&&
             isExtraSchoolConfigurationOk()&&
             (configurationEntity?.idp&&(configurationEntity.idp.institutionTypes?.length!>0))
            )
           )
        ) {
          setCanSave(true)  
        } else {
          setCanSave(false)
        }

      } else {
        setCanSave(false)
      }

    }

    const handleShowSchoolsChange = (event: ChangeEvent,checked: boolean) => {

      showSchools.current=checked
       discoveryInformation.showSchools=checked;
      if(checked) {
        delete discoveryInformation.customDisplayName;
        getExtraSchoolsConfiguration(institutionTypeList)
      } else {
        handleTitleChange('')
        updateInstitutionTypes([])
        updateExcludeSchools([])
        updateSchools([])
        setExtraSchoolsConfiguration(false)
        extraSchoolConfigurationNeeded.current=false
      }
      updateDiscoveryInformation(clone(discoveryInformation))
      setConfigurationEntity(clone(configurationEntity))

      saveCheck(true,showLogo,checked);
    };

    const getExtraSchoolsConfiguration = (institutionTypeList:number[]) => {
        if(integration.organization&&integration.organization.oid) {
          getIntegrationDiscoveryInformation({ organizationOid: integration.organization.oid, institutionType: institutionTypeList, id: integration.id})
            .then(response=>{              
              var newExtraSchoolConfigurationNeeded=false
              if(response.existingExcluded&&response.existingExcluded!==null&&response.existingExcluded.length>0&&response.existingExcluded.indexOf(String(integration.id))<0) {
                setAlreadyExcludeSchools(true)
                setExtraSchoolsConfiguration(true)
                extraSchoolConfigurationNeeded.current=true
                disableExtraSchoolConfiguration.current=true
                newExtraSchoolConfigurationNeeded=true;
                
              } else {
                setAlreadyExcludeSchools(false)
              }              

              if(response.existingIncluded&&response.existingIncluded!==null) {
                var existingIncluded = response.existingIncluded
                if(integration?.discoveryInformation?.schools&&integration.discoveryInformation?.schools.length>0) {
                  existingIncluded = existingIncluded.filter(e=>integration?.discoveryInformation?.schools&&integration?.discoveryInformation?.schools?.indexOf(e)<0)
                }
                possibleSchools.current=schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).filter(k=>existingIncluded.indexOf(String(k.koulukoodi))<0).map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
                setExtraSchoolsConfiguration(true)
                extraSchoolConfigurationNeeded.current=true
                disableExtraSchoolConfiguration.current=true;
                if(response.existingIncluded.length===0||possibleSchools.current.length===0){
                  possibleSchools.current=[]
                }

              } else {
                possibleSchools.current=schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
                extraSchoolConfigurationNeeded.current=newExtraSchoolConfigurationNeeded
                
               
              }  
            
              updateExcludeSchools(excludeSchools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))
              updateSchools(schools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))

            })
        }
        
    };

    const changeExtraSchoolsConfiguration = (event: ChangeEvent<HTMLInputElement>) => {
      if(event.target.checked) {
          getExtraSchoolsConfiguration(institutionTypeList)
      } else {
        updateExcludeSchools([])
        updateSchools([])
      }
      extraSchoolConfigurationNeeded.current=event.target.checked
      setExtraSchoolsConfiguration(event.target.checked)
      
    };

    const handleCustomDisplayNameChange = (value:string) => {
      
      if(value==="") {
        setCustomDisplayName('');
        delete discoveryInformation.customDisplayName
      } else {
        setCustomDisplayName(value);
        discoveryInformation.customDisplayName=value;
      }
      updateDiscoveryInformation(discoveryInformation)
      
      saveCheck(true,showLogo,showSchools.current)
      
    };
    
    const handleTitleChange = (value:string) => {
      
      if(value===undefined||value==="") {
        setTitle('');
        discoveryInformation.title=integration?.organization?.name||''
      } else {
        setTitle(value);
        discoveryInformation.title=value;
      }
      updateDiscoveryInformation(clone(discoveryInformation))
      saveCheck(true,showLogo,showSchools.current)
      
    };

    const updateDiscoveryInformation = (value:Components.Schemas.DiscoveryInformation) => {
        value.showSchools=showSchools.current
        setDiscoveryInformation(clone(value)) 
    }

    const updateInstitutionTypes = (values:string[]) => {
      
        if(configurationEntity&&configurationEntity.idp) {
          configurationEntity.idp.institutionTypes=values.map(value=>Number(value))
          setInstitutionTypeList(configurationEntity.idp.institutionTypes)  
          if(values&&values.length>0) {
            getExtraSchoolsConfiguration(values.map(v=>Number(v)))
          }
        }
        if(extraSchoolsConfiguration) {
          getExtraSchoolsConfiguration(values.map(v=>Number(v)))
        }
        setConfigurationEntity(clone(configurationEntity))
        saveCheck(true,showLogo,showSchools.current)
        
        
    }

    const updateExcludeSchools = (values:string[]) => {
      if(discoveryInformation) {
        discoveryInformation.excludedSchools=values.map(value=>value)
        updateDiscoveryInformation(discoveryInformation)
        
      }
      setExampleSchool(possibleSchools.current?.filter(p=>values.indexOf(p?.value||'')===-1)[0]?.label||'Mansikkalan koulu')
      setExcludeSchools(values)
      saveCheck(true,showLogo,showSchools.current)
  }

  const updateSchools = (values:string[]) => {
    if(discoveryInformation) {
      discoveryInformation.schools=values
      updateDiscoveryInformation(discoveryInformation)
      
    }
    setSchools(values.map(value=>value))
    saveCheck(true,showLogo,showSchools.current)
}

    const validator = (value:string) => {
        return validate([],value);
      }
      const helpGeneratorText = (value:string) => {
        return helperText([],value);
      }
      
      
      function resizeImage(file:File, maxWidth:number, maxHeight:number):Promise<Blob> {
        return new Promise((resolve, reject) => {
            
              
              const image = new Image();
              image.src = URL.createObjectURL(file);
              image.onload = () => {
                  const width = image.width;
                  const height = image.height;
                  
                  if (width <= maxWidth && height <= maxHeight) {
                      resolve(file);
                  }
      
                  let newWidth:number;
                  let newHeight:number;
      
                  if (width > height) {
                      newHeight = height * (maxWidth / width);
                      newWidth = maxWidth;
                  } else {
                      newWidth = width * (maxHeight / height);
                      newHeight = maxHeight;
                  }
      
                  const canvas = document.createElement('canvas');
                  canvas.width = newWidth;
                  canvas.height = newHeight;
      
                  const context = canvas.getContext('2d');
                  if(context===null) {
                    image.onerror = reject;
                  } else {
                    context.drawImage(image, 0, 0, newWidth, newHeight);
                    const resolveBlob = (value: Blob|null) => {
                      if(value!==null) {
                        resolve(value)
                      } else {
                        image.onerror = reject;
                      }
                      
                    }
                    canvas.toBlob(resolveBlob, file.type);
                  }
                  
              }
              image.onerror = reject;
            
        });
    }
    
      
      
      const loadFile = (event:ChangeEvent<HTMLInputElement>) => {
            
          const img:HTMLImageElement = document.getElementById('integratio-logo-preview') as HTMLImageElement;
          
          if(event&&event.target&&event.target.files&&event.target.files.length>0) {
              resizeImage(event.target.files[0],125,36).then(result=>{
                img.src = URL.createObjectURL(result);
                img.removeAttribute("hidden")             
                setLogo(result)
                setNewLogo(true)
                setShowLogo(true)
                updateDiscoveryInformation(discoveryInformation)
                saveCheck(true,true,showSchools.current)
                
              })
           
          }
          
        };  
      

    useEffect(() => {
     
        const newEnums:oneEnum[] = [];
        institutionTypes.forEach(it=>{
            const newLabel=getKoodistoValue(
                institutionTypes,
                String(it.koodiArvo),
                language
            )+' ('+it.koodiArvo+')'
            const newEnum:oneEnum = { label: newLabel,
            value: it.koodiArvo}
            newEnums.push(newEnum);
        })
        
        setEnums(newEnums);    
        
      }, [language,institutionTypes ]);
     
    if(isEditable) {
      return(<>
        <Typography variant="h2" gutterBottom>
          <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
        </Typography>
        
        
        <Grid container spacing={2} mb={3}>

          <>
            <DataRowTitle path="showSchools"></DataRowTitle>
            <Grid item xs={8}>
              <Switch checked={showSchools.current}
                      onChange={handleShowSchoolsChange} />
            </Grid>
          </>      
          
          {showSchools.current&&
            <>
              <Grid item xs={12}>
                <Grid container spacing={1} mb={3}>
                  <Grid item xs={4}>
                    <FormattedMessage defaultMessage="Oppilaitostyypit" />
                  </Grid>
                  <Grid item xs={8}>
                    {enums&&<MultiSelectForm 
                              values={configurationEntity?.idp?.institutionTypes?.map(it=>it.toString())||[]}
                              label={"Oppilaitostyypit"}
                              attributeType={"data"}
                              isEditable={true}
                              mandatory={false}                    
                              helperText={helpGeneratorText}
                              enums={enums}
                              onValidate={validator} 
                              setCanSave={setCanSave} 
                              onUpdate={updateInstitutionTypes}/>}
                  </Grid>
                  {showSchools.current&&configurationEntity&&
                    <SchoolForm 
                    isVisible={true} 
                    isEditable={true} 
                    isMandatory={false} 
                    name="title"
                    value={title} 
                    newConfigurationEntityData={configurationEntity} 
                    helperText={helpGeneratorText} 
                    onUpdate={handleTitleChange} 
                    onValidate={validator} 
                    setNewConfigurationEntityData={function (value: Components.Schemas.ConfigurationEntity): void {
                      throw new Error("Function not implemented.");
                    } } 
                    setCanSave={setCanSave}/>}

                  { configurationEntity&&configurationEntity.idp&&configurationEntity.idp.institutionTypes&&configurationEntity.idp.institutionTypes?.length>0&&
                    <>
                      <DataRowTitle path="extraSchoolsConfiguration"></DataRowTitle>
                        <Grid item xs={8}>
                          <Switch checked={extraSchoolsConfiguration}
                                  sx={{ opacity: disableExtraSchoolConfiguration.current?0.4:1}}
                                  onChange={changeExtraSchoolsConfiguration} 
                                  disabled={disableExtraSchoolConfiguration.current}/>
                                  
                        </Grid>

                        {possibleSchools.current.length===0&&extraSchoolsConfiguration&&
                        <>
                        <Grid item xs={4}>
                        </Grid>
                        <Grid item xs={6}>
                        <Alert severity="warning"><FormattedMessage defaultMessage="Kaikki koulut jo käytössä muissa integraatioissa" /></Alert>
                        </Grid>
                        </>}
                              
                         
                      {showSchools.current&&configurationEntity&&configurationEntity.idp&&configurationEntity.idp.institutionTypes&&configurationEntity.idp.institutionTypes?.length>0&&
                              excludeSchools.length===0&&extraSchoolsConfiguration&&
                      <>
                        <Grid item xs={4}>
                          <FormattedMessage defaultMessage="schools" />
                        </Grid>
                        <Grid item xs={8}>
                          <MultiSelectForm 
                                  values={schools}
                                  label={"schools"}
                                  attributeType={"data"}
                                  isEditable={true}
                                  mandatory={false}                    
                                  helperText={helpGeneratorText}
                                  enums={possibleSchools.current}
                                  onValidate={validator} 
                                  setCanSave={setCanSave} 
                                  onUpdate={updateSchools}/>
                        </Grid>
                      </>} 
                      {showSchools.current&&configurationEntity&&configurationEntity?.idp&&configurationEntity?.idp?.institutionTypes&&configurationEntity?.idp?.institutionTypes?.length>0&&
                          schools.length===0&&extraSchoolsConfiguration&&!alreadyExcludeSchools&&
                      <>
                        <Grid item xs={4}>
                          <FormattedMessage defaultMessage="excludedSchools" />
                        </Grid>
                        <Grid item xs={8}>
                          <MultiSelectForm 
                                  values={excludeSchools}
                                  label={"excludeSchools"}
                                  attributeType={"data"}
                                  isEditable={true}
                                  mandatory={false}                    
                                  helperText={helpGeneratorText}
                                  enums={possibleSchools.current}
                                  onValidate={validator} 
                                  setCanSave={setCanSave} 
                                  onUpdate={updateExcludeSchools}/>
                        </Grid>
                      </>}
                    </>
                  } 
                    
                  
                </Grid>
              </Grid>
            </>}
          </Grid>
          
          <Grid container spacing={2} mb={3}>    
          
          {title&&title!==''&&showSchools.current&&<>
          <DataRowTitle></DataRowTitle>
          <DataRowValue><FormattedMessage defaultMessage="Esim. {exampleSchool} ({title})" values={{exampleSchool: exampleSchool,title: title}} /></DataRowValue>            
          </>}
          {title===undefined||title===''&&showSchools.current&&<>
          <DataRowTitle></DataRowTitle>
          <DataRowValue><FormattedMessage defaultMessage="Esim. {exampleSchool}" values={{exampleSchool: exampleSchool}} /></DataRowValue>            
          </>}
           
          
            <DataRowTitle path="logoUrl"></DataRowTitle>
            <DataRowValue>
              <form >
                <input
                  accept="image/*"
                  hidden
                  id="contained-button-file"
                  multiple
                  type="file"
                  onChange={e=>loadFile(e)}
                />
                <label htmlFor="contained-button-file">
                {(integration?.configurationEntity?.idp?.logoUrl||newLogo)&&<><IconButton color="primary" component="span">
                  <PhotoCamera />
                </IconButton><FormattedMessage defaultMessage="Valitse"  /></>}
                {!(integration?.configurationEntity?.idp?.logoUrl||newLogo)&&<><IconButton color="error" component="span">
                  <PhotoCamera />
                </IconButton><span >{intl.formatMessage({
                    defaultMessage: "Valitse, logo on pakollinen",
                  })}</span></>}
                  
                </label>   
              </form>
              
            </DataRowValue>               
            
            <DataRowTitle></DataRowTitle>
            <Grid item xs={8}><img id="integratio-logo-preview" alt={"logo"} hidden/></Grid>
            
            {integration?.configurationEntity?.idp?.logoUrl&&integration.configurationEntity.idp.logoUrl!==''&&!showLogo&&
            <>
            <DataRowTitle></DataRowTitle>
            <DataRowValue>
              <Paper variant="outlined" sx={{ display: "inline-flex" }}>
                <img
                  src={integration.configurationEntity.idp.logoUrl}
                  alt={intl.formatMessage({
                    defaultMessage: "organisaation logo",
                    description: "saavutettavuus",
                  })}
                />
            </Paper>
            </DataRowValue>
            
            </>}
            
            

        </Grid>
        
        {!showSchools.current&&configurationEntity&&
          <Grid container spacing={2} mb={3}>    
              <SchoolForm 
              isVisible={true} 
              isEditable={true} 
              isMandatory={false} 
              name="customDisplayName"
              value={customDisplayName||''} 
              newConfigurationEntityData={configurationEntity} 
              helperText={helpGeneratorText} 
              onUpdate={handleCustomDisplayNameChange} 
              onValidate={validator} 
              setNewConfigurationEntityData={setConfigurationEntity} 
              setCanSave={setCanSave}/>
          </Grid>}
      </>)
      
    } else {
      return(<>
        <Typography variant="h2" gutterBottom>
          <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
        </Typography>
        <Grid container spacing={2} mb={3}>
          <DataRow
            object={integration}
            path="discoveryInformation.customDisplayName"
          />
          <DataRow
            object={integration}
            path="discoveryInformation.showSchools"
            type="boolean"
          />
          <DataRow
            object={integration}
            path="discoveryInformation.schools"
            type="text-list"
          />
          <DataRow
            object={integration}
            path="discoveryInformation.excludedSchools"
            type="text-list"
          />
          <DataRow
            object={integration}
            path="discoveryInformation.title"
          />
          
            <Grid item xs={4}>
                <FormattedMessage defaultMessage="Oppilaitostyypit" />
            </Grid>
            <Grid item xs={8}>
                <TextList
                    value={
                    identityProvider.institutionTypes?.length
                        ? identityProvider.institutionTypes.map(
                            (institutionType) =>
                            `${getKoodistoValue(
                                institutionTypes,
                                String(institutionType),
                                language
                            )} (${institutionType})`
                        )
                        : []
                    }
                />
            </Grid>
            
        <DataRow
              object={integration}
              path="configurationEntity.idp.logoUrl"
              type="image"
          />
        </Grid>        
      </>)
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

