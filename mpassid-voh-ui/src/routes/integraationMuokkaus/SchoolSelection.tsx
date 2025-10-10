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
import { clone, last, toPath, isEqual } from 'lodash';
import { PhotoCamera } from "@mui/icons-material";
import { devLog } from "@/utils/devLog";

interface Props {
    newLogo: boolean;
    isEditable: boolean; 
    environment: number;
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

export default function SchoolSelection({ integration, isEditable=false, setConfigurationEntity, configurationEntity, setDiscoveryInformation, discoveryInformation,setCanSave, setLogo, setNewLogo, newLogo, environment }: Props){

    const [institutionTypeEnums, setInstitutionTypeEnums] = useState<oneEnum[]>([]);
    const showSchools = useRef<boolean>(integration.id===0||integration?.discoveryInformation?.showSchools!)    
    const [extraSchoolsConfiguration, setExtraSchoolsConfiguration] = useState<boolean>(
          ((discoveryInformation?.schools&&discoveryInformation?.schools?.length>0)||
          (discoveryInformation?.excludedSchools&&discoveryInformation?.excludedSchools?.length>0))||
          false);
    const [title, setTitle] = useState<string|undefined>((showSchools)?(discoveryInformation?.title||integration?.organization?.name||''):undefined);
    const [institutionTypeList, setInstitutionTypeList] = useState<number[]>(integration?.configurationEntity?.idp?.institutionTypes||[]);
    const [customDisplayName, setCustomDisplayName] = useState<string|undefined>((showSchools)?discoveryInformation?.customDisplayName||undefined:(discoveryInformation?.customDisplayName||integration?.organization?.name||''));
    const institutionTypes = useKoodisByKoodisto(
        "mpassidnsallimatoppilaitostyypit"
      );
    const language = toLanguage(useIntl().locale).toUpperCase();
    const identityProvider = integration.configurationEntity!.idp!;
    const possibleSchools = useRef<oneEnum[]>(integration?.organization?.children?.map(c=>({ nimi: c.name!, oppilaitostyyppi: convertSchoolCode(c.oppilaitostyyppi), koulukoodi: c.oppilaitosKoodi||''})).map(k=>({ label: k.nimi, value: k.koulukoodi }))||[]);
    const [schools, setSchools] = useState<string[]>(integration?.discoveryInformation?.schools||[]);
    
    const [excludeSchools, setExcludeSchools] = useState<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const currentExcludeSchools = useRef<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const [hideExcludeSchools, setHideExcludeSchools] = useState<boolean>(false);
    const [exampleSchool, setExampleSchool] = useState<string>(possibleSchools.current?.filter(p=>excludeSchools.indexOf(p?.value||'')===-1)[0]?.label||'Mansikkalan koulu');
    const [schoolData, setSchoolData] = useState<SchoolData>(kouluData);
    const [showLogo, setShowLogo] = useState<boolean>(false);
    const [localCanSave, setLocalCanSave] = useState<boolean>(true);
    const [institutionTypeCanSave, setInstitutionTypeCanSave] = useState<boolean>(true);
    const [titleCanSave, setTitleCanSave] = useState<boolean>(true);
    const [schoolsCanSave, setSchoolsCanSave] = useState<boolean>(true);
    const [customDisplayCanSave, setCustomDisplayCanSave] = useState<boolean>(true);
    const [excludeSchoolsCanSave, setExcludeSchoolsCanSave] = useState<boolean>(true);
  

    
    const extraSchoolConfigurationNeeded = useRef<boolean>(false)
    const disableExtraSchoolConfigurationSwitch = useRef<boolean>(false);
    const existingSchoolsIncluded = useRef<string[]|null>([]);
    const existingSchoolsExcluded = useRef<string[]|null>([]);
    const oldEnvironment = useRef<number>(environment);
    const originalEnvironment = useRef<number>(environment);
    const adminConfiguration = useRef<boolean>(false);
    const institutionTypeInit = useRef<boolean>(false);    

    const intl = useIntl();

    useEffect(() => {
      devLog("DEBUG","SchoolSelection (init localCanSave)",localCanSave)
      if(!localCanSave) {
        setLocalCanSave(true)
      }
    }, [integration]);

    useEffect(() => {
      devLog("DEBUG","SchoolSelection (localCanSave)",localCanSave)
      if(!localCanSave) {
        devLog("DEBUG","SchoolSelection (canSave 1)",false)
        setCanSave(false)
      }
    }, [localCanSave, setCanSave]);   
    
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

        if(integration?.configurationEntity?.idp?.institutionTypes&&
          integration?.configurationEntity?.idp?.institutionTypes?.length>1&&
          integration.discoveryInformation?.schools&&integration.discoveryInformation?.excludedSchools&&
          (integration.discoveryInformation?.schools.length>0||integration.discoveryInformation?.excludedSchools.length>0)) {
          if(integration.deploymentPhase===1) {
            adminConfiguration.current=true;
            devLog("DEBUG", "SchoolSelection (adminConfiguration.current)",adminConfiguration.current)
          }
          
        }
        
        setSchoolData(newSchoolData)
      }
      
      
    }, [integration,possibleSchools]);

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
      setInstitutionTypeEnums(newEnums);    
      
    }, [language,institutionTypes ]);

    const isExtraSchoolConfigurationOk = () => {
      devLog("DEBUG","isExtraSchoolConfigurationOk","start")
      devLog("DEBUG","isExtraSchoolConfigurationOk (extraSchoolConfigurationNeeded.current)",extraSchoolConfigurationNeeded.current)
      if(extraSchoolConfigurationNeeded.current) {
        devLog("DEBUG","isExtraSchoolConfigurationOk (configurationEntity.idp.institutionTypes?.length)",configurationEntity?.idp?.institutionTypes?.length)

        
        if(configurationEntity?.idp?.institutionTypes?.length===1) {
          var configurationCheckOk=true;
          if(!(discoveryInformation?.schools?.length!>0||discoveryInformation?.excludedSchools?.length!>0)) {

            if((existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current.length>0)) {
              devLog("DEBUG","isExtraSchoolConfigurationOk (failed check)","empty, mutta includet lisätään excludeihin ok")
            } else {
              devLog("DEBUG","isExtraSchoolConfigurationOk (failed check)","empty")
              configurationCheckOk=false
            }
            
          }
          
          devLog("DEBUG","isExtraSchoolConfigurationOk (discoveryInformation?.excludedSchools)",discoveryInformation?.excludedSchools)
          devLog("DEBUG","isExtraSchoolConfigurationOk (discoveryInformation?.schools)",discoveryInformation?.schools)
          devLog("DEBUG","isExtraSchoolConfigurationOk (existingSchoolsExcluded.current)",existingSchoolsExcluded.current)
          if(existingSchoolsExcluded.current?.length! > 0) {       

            if(discoveryInformation?.excludedSchools?.length! > 0) {              
              devLog("DEBUG","isExtraSchoolConfigurationOk (failed check)",1)
              configurationCheckOk=false
            }
            discoveryInformation?.schools?.forEach(school=>{
              if(existingSchoolsExcluded.current!.indexOf(school)<0) {
                devLog("DEBUG","isExtraSchoolConfigurationOk (failed check)",2)
                configurationCheckOk=false
              }
            })
          }
          devLog("DEBUG","isExtraSchoolConfigurationOk (existingSchoolsIncluded.current)",existingSchoolsIncluded.current)
          if(existingSchoolsIncluded.current?.length! > 0 && configurationCheckOk) { 

            discoveryInformation?.schools?.forEach(school=>{
              if(existingSchoolsIncluded.current!.indexOf(school)>=0) {
                devLog("DEBUG","isExtraSchoolConfigurationOk (failed check)",3)
                configurationCheckOk=false
              }
            })    
            
          }      

          devLog("DEBUG","isExtraSchoolConfigurationOk (return 1)",(configurationCheckOk&&discoveryInformation?.showSchools&&configurationEntity !== undefined&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformation?.schools?.length!>0))))  
          return (configurationCheckOk&&discoveryInformation?.showSchools&&configurationEntity !== undefined&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformation?.schools?.length!>0)))
                  
        } else {

          devLog("DEBUG","isExtraSchoolConfigurationOk (return 2)",(discoveryInformation?.showSchools&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformation?.schools?.length!>0))))      
          return (discoveryInformation?.showSchools&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformation?.schools?.length!>0)))
        }

      } else {
        devLog("DEBUG","isExtraSchoolConfigurationOk (check)",6)
        devLog("DEBUG","isExtraSchoolConfigurationOk (discoveryInformation?.excludedSchools)",discoveryInformation?.excludedSchools)
        devLog("DEBUG","isExtraSchoolConfigurationOk (discoveryInformation?.schools)",discoveryInformation?.schools)
        devLog("DEBUG","isExtraSchoolConfigurationOk (return 3)",(discoveryInformation?.excludedSchools?.length! >= 0 && discoveryInformation?.schools?.length! >= 0))
        return discoveryInformation?.excludedSchools?.length! >= 0 && discoveryInformation?.schools?.length! >= 0;
      }
      
    }

    const saveCheck = (idp:boolean,showLogo:boolean,showSchools:boolean) => {
      
      if(integration?.configurationEntity?.idp) {
        devLog("DEBUG","SchoolSelection (idp)",idp)      
        
        if(idp&&((configurationEntity?.idp?.logoUrl&&configurationEntity?.idp?.logoUrl!=='')||showLogo)) {
            devLog("DEBUG","SchoolSelection (logo)",true)            
            if (!showSchools||
                (showSchools&&
                isExtraSchoolConfigurationOk()&&
                (configurationEntity?.idp&&(configurationEntity.idp.institutionTypes?.length!>0))
                )){
                  devLog("DEBUG","SchoolSelection (canSave School configuration)",true)                  
                  setCanSave(true)  
                  devLog("DEBUG","SchoolSelection (saveCheck ready)",true)
                } else {
                  devLog("DEBUG","SchoolSelection (canSave School configuration)",false)                  
                  setCanSave(false)  
                  devLog("DEBUG","SchoolSelection (saveCheck ready)",false)
                }
          
        } else {
          devLog("DEBUG","SchoolSelection (saveCheck environment)",environment)
          devLog("DEBUG","SchoolSelection (saveCheck originalEnvironment.current)",originalEnvironment.current)
          if(environment===originalEnvironment.current||originalEnvironment.current===-5) {
            devLog("DEBUG","SchoolSelection (canSave Original environemt)",true)
            setCanSave(false)
            devLog("DEBUG","SchoolSelection (saveCheck not ready)",false)

            
          } else {
            devLog("DEBUG","SchoolSelection (canSave 4 institutionTypeList.length)",institutionTypeList.length)
            devLog("DEBUG","SchoolSelection (canSave 4 schools)",discoveryInformation.schools?.length)
            devLog("DEBUG","SchoolSelection (canSave 4 excludedSchools)",discoveryInformation.excludedSchools?.length)
            
            if(institutionTypeList.length>1&&discoveryInformation.schools?.length===0&&discoveryInformation.excludedSchools?.length===0) {
              devLog("DEBUG","SchoolSelection (canSave 4)",false)
              setCanSave(false)
            } else {
              devLog("DEBUG","SchoolSelection (canSave 4)",true)
              setCanSave(true)
            }
            
            devLog("DEBUG","SchoolSelection (saveCheck environment changed ready)",false)
          }
          
        }

      } else {
        devLog("DEBUG","SchoolSelection (canSave not idp)",false)
        setCanSave(false)
        devLog("DEBUG","SchoolSelection (saveCheck not ready)",true)
      }

    }

    const handleShowSchoolsChange = (event: ChangeEvent,checked: boolean) => {
      devLog("DEBUG", "handleShowSchoolsChange",checked)
      showSchools.current=checked
       discoveryInformation.showSchools=checked;
      if(checked) {
        if(customDisplayName&&customDisplayName===integration?.organization?.name){
          handleCustomDisplayNameChange('')
        }
        //delete discoveryInformation.customDisplayName;
        getExtraSchoolsConfiguration(institutionTypeList)
        handleTitleChange(integration?.organization?.name||'')        
      } else {
        if(!customDisplayName){
          handleCustomDisplayNameChange(integration.discoveryInformation?.customDisplayName||integration?.organization?.name||'')
        }
        handleTitleChange('')
        updateInstitutionTypes([])
        updateExcludeSchools([])
        devLog("DEBUG", "updateSchools (1)",[])
        updateSchools([])
        setExtraSchoolsConfiguration(false)
        extraSchoolConfigurationNeeded.current=false
      }
      updateDiscoveryInformation(clone(discoveryInformation))
      setConfigurationEntity(clone(configurationEntity))

      
      saveCheck(true,showLogo,checked);
    };

    const getExtraSchoolsConfiguration = (institutionTypeList:number[]) => {        
        if(integration.organization&&integration.organization.oid&&institutionTypeList.length>0) {
          devLog("DEBUG","getExtraSchoolsConfiguration (deplomentPhase)",environment);
          adminConfiguration.current=false
          devLog("DEBUG", "getExtraSchoolsConfiguration (adminConfiguration.current init)",adminConfiguration.current)
          
          if(environment===1) {
            getIntegrationDiscoveryInformation({ organizationOid: integration.organization.oid, institutionType: institutionTypeList, id: integration.id})
            .then(response=>{              
              existingSchoolsExcluded.current=(response.existingExcluded !== undefined)?response.existingExcluded:null;
              existingSchoolsIncluded.current=(response.existingIncluded!== undefined)?response.existingIncluded:null;              
              devLog("DEBUG","getExtraSchoolsConfiguration (integration.id)",integration.id)
              devLog("DEBUG","getExtraSchoolsConfiguration (response.existingExcluded)",response.existingExcluded)
              if(response.existingExcluded&&response.existingExcluded!==null&&response.existingExcluded.length>=0) {
                //Exclude defined, either all [], or list [ "1", "2"]                                                
                if(institutionTypeList.length>1) {
                  devLog("DEBUG","getExtraSchoolsConfiguration (several institutionTypes)",institutionTypeList.length)
                  setHideExcludeSchools(false)          
                  devLog("DEBUG","getExtraSchoolsConfiguration (hideExcludeSchools 1)",false)         
                  extraSchoolConfigurationNeeded.current=true
                  if(existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current?.length>0&&existingSchoolsExcluded.current?.length===0) {
                    adminConfiguration.current=false                                                      
                  } else {
                    adminConfiguration.current=true                                                      
                  }
                  devLog("DEBUG", "getExtraSchoolsConfiguration (adminConfiguration.current several institution types 1)",adminConfiguration.current)
                } else {                  
                  devLog("DEBUG","getExtraSchoolsConfiguration (one institutionTypes)",institutionTypeList.length)
                  if(existingSchoolsExcluded.current?.length!>0) {
                    if(integration&&integration.id&&integration.id>0) {
                      setHideExcludeSchools(false)                                                      
                      devLog("DEBUG","getExtraSchoolsConfiguration (hideExcludeSchools 2.1)",true)
                    } else {
                      setHideExcludeSchools(true)                                                      
                      devLog("DEBUG","getExtraSchoolsConfiguration (hideExcludeSchools 2.2)",true)
                    }
                    
                  } else {
                    setHideExcludeSchools(false)                                            
                    devLog("DEBUG","getExtraSchoolsConfiguration (hideExcludeSchools 3)",false)          
                  }
                  
                  extraSchoolConfigurationNeeded.current=false                  
                }
                disableExtraSchoolConfigurationSwitch.current=true
                devLog("DEBUG", "getExtraSchoolsConfiguration (disableExtraSchoolConfigurationSwitch.current 1)",disableExtraSchoolConfigurationSwitch.current)
                
              } else {
                //Exclude not defined, null
                setHideExcludeSchools(false)         
                devLog("DEBUG","getExtraSchoolsConfiguration (hideExcludeSchools 4)",false)        
                disableExtraSchoolConfigurationSwitch.current=false;                                                
                devLog("DEBUG", "getExtraSchoolsConfiguration (disableExtraSchoolConfigurationSwitch.current 2)",disableExtraSchoolConfigurationSwitch.current)
                
                if(institutionTypeList.length>1) {                      
                  if(existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current?.length>=0&&existingSchoolsExcluded.current?.length===0) {
                    adminConfiguration.current=false                                                      
                  } else {
                    adminConfiguration.current=true                                                      
                  }
                  devLog("DEBUG", "getExtraSchoolsConfiguration (adminConfiguration.current several institution types 2)",adminConfiguration.current)
                }
                
              }              
              devLog("DEBUG", "getExtraSchoolsConfiguration (response.existingIncluded)",response.existingIncluded)
              if(response.existingIncluded&&response.existingIncluded!==null&&response.existingIncluded.length>=0) {
              
                if(integration?.discoveryInformation?.schools&&integration.discoveryInformation?.schools.length>=0) {                                    
                  if(existingSchoolsIncluded.current!==null) {
                    existingSchoolsIncluded.current = existingSchoolsIncluded.current
                        .filter(e=>integration?.discoveryInformation?.schools&&integration?.discoveryInformation?.schools?.indexOf(e)<0)
                  } 
                }
                if(existingSchoolsIncluded.current!==null) {                  
                  if(existingSchoolsIncluded.current.length===0) {
                    if(existingSchoolsExcluded.current?.length===0) {                      
                      possibleSchools.current=[];
                      devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools, all excluded)",possibleSchools.current)
                    } else {                      
                      possibleSchools.current=schoolData.koulut
                        .filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1)                        
                        .filter(k=>existingSchoolsExcluded.current!==null&&existingSchoolsExcluded.current.indexOf(String(k.koulukoodi))>=0)
                        .map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));  
                      devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools, only excluded with correct school code)",possibleSchools.current)  
                    }                                      
                  } else {
                    devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools filter out existingSchoolsExcluded)",3) 
                    
                    possibleSchools.current=schoolData.koulut
                        .filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1)
                        .filter(k=>existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current.indexOf(String(k.koulukoodi))<0)                        
                        .map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
                    devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools filter with existing and correct school code)",possibleSchools.current)
                  }
                  
                } else {               
                  possibleSchools.current=schoolData.koulut
                        .filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1)
                        .map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
                  devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools filter with correct school code)",possibleSchools.current)
                }
                
                if(existingSchoolsExcluded.current!==null) {                  
                  devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools filter out existingSchoolsExcluded)",existingSchoolsExcluded.current)  
                  possibleSchools.current=possibleSchools.current.filter(k=>existingSchoolsExcluded.current&&existingSchoolsExcluded.current.indexOf(k.value)>-1);
                }
                devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools existing integrations)",possibleSchools.current) 
                
                
                extraSchoolConfigurationNeeded.current=true
                disableExtraSchoolConfigurationSwitch.current=true;
                devLog("DEBUG", "getExtraSchoolsConfiguration (disableExtraSchoolConfigurationSwitch.current 3)",disableExtraSchoolConfigurationSwitch.current)
                /*
                if(response.existingIncluded.length===0||possibleSchools.current.length===0){
                  possibleSchools.current=[]
                }
                */
              } else {                
                if(existingSchoolsExcluded.current!==null) {                  
                  possibleSchools.current=schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1)
                    .filter(k=>existingSchoolsExcluded.current&&existingSchoolsExcluded.current.indexOf(k.koulukoodi)>-1)
                    .map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
                    devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools, only excluded with correct school code)",possibleSchools.current)  
                } else {                  
                  possibleSchools.current=schoolData.koulut
                    .filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1)
                    .map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
                    devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools, filter with correct school code)",possibleSchools.current)  
                }
                
                devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools)",possibleSchools.current)  
                if(existingSchoolsIncluded.current===null&&(existingSchoolsExcluded.current===null)) {
                  extraSchoolConfigurationNeeded.current=false
                } else {
                  extraSchoolConfigurationNeeded.current=true
                }
                
                disableExtraSchoolConfigurationSwitch.current=false;  
                devLog("DEBUG", "getExtraSchoolsConfiguration (disableExtraSchoolConfigurationSwitch.current 4)",disableExtraSchoolConfigurationSwitch.current)                  
                      
              }  

              //define if extra school configuration is mandatory
              if(institutionTypeList.length>1) {
                setExtraSchoolsConfiguration(true)
              } else {
                if(existingSchoolsExcluded.current&&existingSchoolsIncluded.current&&
                  existingSchoolsExcluded.current.length===0&&existingSchoolsIncluded.current?.length===0) {
                    setExtraSchoolsConfiguration(false)
                  } else {
                    setExtraSchoolsConfiguration(true)
                  }
                
              }

              if(adminConfiguration.current) {
                possibleSchools.current=schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));    
                devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools admin)",possibleSchools.current) 
              }
              updateExcludeSchools(excludeSchools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))
              devLog("DEBUG", "getExtraSchoolsConfiguration (institutionTypeInit.current)",institutionTypeInit.current)
              if(institutionTypeInit.current) {
                devLog("DEBUG", "getExtraSchoolsConfiguration (updateSchools)",schools)
                
                updateSchools(schools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))              
              }
              institutionTypeInit.current=true;
            })
          } else {
            devLog("DEBUG","getExtraSchoolsConfiguration (schools)",schools)            
            possibleSchools.current=schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
            devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools not production integration)",possibleSchools.current) 
            extraSchoolConfigurationNeeded.current=false;
            updateExcludeSchools(excludeSchools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))
            devLog("DEBUG", "updateSchools (3)",schools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))
            updateSchools(schools.filter((es)=>possibleSchools.current.map(p=>p.value).indexOf(es)>=0))
          }
          
        }
        devLog("DEBUG","getExtraSchoolsConfiguration (possibleSchools.current)",schools)
        
        devLog("DEBUG","getExtraSchoolsConfiguration (schools)",schools)
    };

    const changeExtraSchoolsConfiguration = (event: ChangeEvent<HTMLInputElement>) => {
      if(event.target.checked) {
          getExtraSchoolsConfiguration(institutionTypeList)
      } else {
        updateExcludeSchools([])
        devLog("DEBUG", "updateSchools (4)",[])
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
        delete discoveryInformation.title;
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
        //if(extraSchoolsConfiguration) {
        //  getExtraSchoolsConfiguration(values.map(v=>Number(v)))
        //}
        setConfigurationEntity(clone(configurationEntity))      
        if(values&&values.length>0) {  
          saveCheck(true,showLogo,showSchools.current)
        } else {
          devLog("DEBUG","SchoolSelection (canSave 6)",false)
          setCanSave(false)
        }
        
        
        
    }

    const updateiscoveryInformation = (newDiscoveryInformation:Components.Schemas.DiscoveryInformation) => {      
      var updateNeeded=false;
      if(newDiscoveryInformation) {        
        devLog("DEBUG","updateiscoveryInformation (existingSchoolsIncluded)",existingSchoolsIncluded.current)
        devLog("DEBUG","updateiscoveryInformation (existingSchoolsExcluded)",existingSchoolsExcluded.current)
        if(existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current.length>0&&existingSchoolsExcluded.current === null) {
          existingSchoolsIncluded.current.forEach(school=>{
            if(newDiscoveryInformation.excludedSchools === undefined) {
              newDiscoveryInformation.excludedSchools = [];
              updateNeeded=true
            }
                        
            if(newDiscoveryInformation.schools && newDiscoveryInformation.schools?.length === 0 
              && newDiscoveryInformation.excludedSchools && newDiscoveryInformation.excludedSchools.length >= 0               
              && newDiscoveryInformation.excludedSchools.indexOf(school)<0) {
              newDiscoveryInformation.excludedSchools.push(school);
              updateNeeded=true
              devLog("DEBUG","updateiscoveryInformation (add schools)",school)
            }
            
          })
        }
        
        if(updateNeeded) {
          devLog("DEBUG","updateiscoveryInformation (excludedSchools)",newDiscoveryInformation.excludedSchools)
          updateDiscoveryInformation(newDiscoveryInformation)
        }                
      }      
    }

    const updateExcludeSchools = (values:string[]) => {
      if(!isEqual(discoveryInformation.excludedSchools,values)||!isEqual(excludeSchools,values)){
        const newDiscoveryInformation:Components.Schemas.DiscoveryInformation = clone(discoveryInformation);
        if(newDiscoveryInformation) {
          newDiscoveryInformation.excludedSchools=values.map(value=>value);
          devLog("DEBUG","updateExcludeSchools (existingSchoolsIncluded)",existingSchoolsIncluded.current)
          if(existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current.length>0) {
            existingSchoolsIncluded.current.forEach(school=>{
              if(newDiscoveryInformation.excludedSchools === undefined) {
                newDiscoveryInformation.excludedSchools = [];
              }
                          
              if(newDiscoveryInformation.schools && newDiscoveryInformation.schools?.length === 0 
                && newDiscoveryInformation.excludedSchools && newDiscoveryInformation.excludedSchools.length >= 0 
                && values.length>=0 
                && newDiscoveryInformation.excludedSchools.indexOf(school)<0) {
                newDiscoveryInformation.excludedSchools.push(school);
                devLog("DEBUG","updateExcludeSchools (add schools)",school)
              }
              
            })
          }
                    
          devLog("DEBUG","updateExcludeSchools (excludedSchools)",newDiscoveryInformation.excludedSchools)
          updateDiscoveryInformation(newDiscoveryInformation)          
          
        }
        
        setExampleSchool(possibleSchools.current?.filter(p=>values.indexOf(p?.value||'')===-1)[0]?.label||'Mansikkalan koulu')
        setExcludeSchools(values)
        
        
      }
      currentExcludeSchools.current=values;
      saveCheck(true,showLogo,showSchools.current)
  }

  const updateSchools = (values:string[]) => {
    if(discoveryInformation) {
      if(!isEqual(discoveryInformation.schools,values)||discoveryInformation?.excludedSchools?.length!=0){
        discoveryInformation.schools=values
        discoveryInformation.excludedSchools=[]
        updateDiscoveryInformation(discoveryInformation)
      
      }
      
    }
    if(!isEqual(schools,values)){
      devLog("DEBUG", "updateSchools (values)",values)
      setSchools(values)
    }
    saveCheck(true,showLogo,showSchools.current)
}

    const validator = (value:string) => {
        return validate([],value);
      }
      const helpGeneratorText = (value:string) => {
        return helperText([],value);
      }
      const extraIncludeNoticeHelpText = (value:string) => {
        if(existingSchoolsIncluded.current!==null&&existingSchoolsIncluded.current.length>0) {
          return helperText([ "extraExcludes"],value);
        } else {
          return helperText([],value);
        }
        
      }
      const mandatoryinstitutionTypesText = (value:string) => {
        
        if(configurationEntity?.idp?.institutionTypes?.length===0&&value==="") {
          return (<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: intl.formatMessage({
            defaultMessage: "Oppilaitostyypit",
          })}} />);
        } else {
          if(possibleSchools.current.length===0) {
            return helperText([ "allSchoolsUsed"],value);
          } else {
            return(<></>)            
          }
          
        }
        
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
      

    if(!institutionTypeInit.current) {
      if(institutionTypeList.length>0) {
        devLog("DEBUG","Init getExtraSchoolsConfiguration",institutionTypeInit.current)
        getExtraSchoolsConfiguration(institutionTypeList);
      }      
    }
    
    
    if(environment!==oldEnvironment.current&&institutionTypeList !== undefined && institutionTypeList.length > 0) {
      getExtraSchoolsConfiguration(institutionTypeList);
      oldEnvironment.current=environment;
    }
    
    devLog("DEBUG","*************************","updateiscoveryInformation")
    updateiscoveryInformation(discoveryInformation);

    devLog("DEBUG","************************* SchoolSelection post ********************","start")
    if((institutionTypeList === undefined || institutionTypeList.length===0)&&showSchools.current&&localCanSave) {
      devLog("DEBUG","SchoolSelection post 1 (localCanSave)",localCanSave)
      devLog("DEBUG","SchoolSelection post 1 (institutionTypeList)",institutionTypeList)
      setLocalCanSave(false)
    }

    if(possibleSchools.current.length===0&&showSchools.current&&localCanSave) {
      devLog("DEBUG","SchoolSelection post 2 (localCanSave)",localCanSave)
      devLog("DEBUG","SchoolSelection post 2 (possibleSchools)",possibleSchools.current)
      devLog("DEBUG","SchoolSelection post 2 (extraSchoolsConfiguration)",extraSchoolsConfiguration)
      setLocalCanSave(false)
    }

    devLog("DEBUG","SchoolSelection post (localCanSave)",localCanSave)
    devLog("DEBUG","SchoolSelection post (environment)",environment)    
    devLog("DEBUG","SchoolSelection post (showSchools.current)",showSchools.current)
    devLog("DEBUG","SchoolSelection post (configurationEntity?.idp?.institutionTypes?.length)",configurationEntity?.idp?.institutionTypes?.length)
    devLog("DEBUG","SchoolSelection post (schools.length)",schools.length)  
    devLog("DEBUG","SchoolSelection post (extraSchoolsConfiguration)",extraSchoolsConfiguration)
    devLog("DEBUG","SchoolSelection post (hideExcludeSchools)",hideExcludeSchools)
    devLog("DEBUG","SchoolSelection post (excludeSchools.length)",excludeSchools.length)
    devLog("DEBUG","SchoolSelection post (possibleSchools)",possibleSchools.current.length)

    devLog("DEBUG","************************* SchoolSelection post ********************","end")
    
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
                    {institutionTypeEnums&&<MultiSelectForm 
                              values={configurationEntity?.idp?.institutionTypes?.map(it=>it.toString())||[]}
                              label={"Oppilaitostyypit"}
                              attributeType={"data"}
                              isEditable={true}
                              mandatory={configurationEntity?.idp?.institutionTypes?.length===0||(possibleSchools.current.length===0)}                    
                              helperText={mandatoryinstitutionTypesText}
                              enums={institutionTypeEnums}
                              onValidate={validator} 
                              setCanSave={setInstitutionTypeCanSave} 
                              onUpdate={updateInstitutionTypes}/>}
                  </Grid>
                  {adminConfiguration.current&&
                        <>
                        <Grid item xs={4}>
                        </Grid>
                        <Grid item xs={6}>
                        <Alert severity="warning"><FormattedMessage defaultMessage="Valittuja oppilaitostyyppejä jo muissa integraatioissa, muokkaaminen mahdollistaa saman koulun näkymisen useassa integraatiossa" /></Alert>
                        </Grid>
                        </>}         
                  
                  {showSchools.current&&configurationEntity&&
                    <SchoolForm 
                    isVisible={true} 
                    isEditable={true} 
                    isMandatory={false} 
                    name="title"
                    value={title||''} 
                    newConfigurationEntityData={configurationEntity} 
                    helperText={helpGeneratorText} 
                    onUpdate={handleTitleChange} 
                    onValidate={validator} 
                    setCanSave={setTitleCanSave}/>}

                  { configurationEntity&&configurationEntity.idp&&configurationEntity.idp.institutionTypes&&configurationEntity.idp.institutionTypes?.length>0&&
                    <>
                      <DataRowTitle path="extraSchoolsConfiguration"></DataRowTitle>
                        <Grid item xs={8}>
                          <Switch checked={extraSchoolsConfiguration}
                                  sx={{ opacity: disableExtraSchoolConfigurationSwitch.current&&environment===1?0.4:1}}
                                  onChange={changeExtraSchoolsConfiguration} 
                                  disabled={disableExtraSchoolConfigurationSwitch.current&&environment===1}/>
                                  
                        </Grid>
                              
                      {showSchools.current&&configurationEntity&&configurationEntity.idp&&configurationEntity.idp.institutionTypes&&configurationEntity.idp.institutionTypes?.length>0&&
                              (excludeSchools.length===0)&&extraSchoolsConfiguration&&
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
                                  mandatory={
                                    (environment===1&&institutionTypeList.length>1&&schools?.length===0&&excludeSchools?.length===0)?true:false
                                  }                    
                                  helperText={helpGeneratorText}
                                  enums={possibleSchools.current}
                                  onValidate={validator} 
                                  setCanSave={setSchoolsCanSave} 
                                  onUpdate={updateSchools}/>
                        </Grid>
                      </>} 
                      {showSchools.current&&configurationEntity&&configurationEntity?.idp&&configurationEntity?.idp?.institutionTypes&&configurationEntity?.idp?.institutionTypes?.length>0&&
                          schools.length===0&&extraSchoolsConfiguration&&!hideExcludeSchools&&
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
                                  mandatory={
                                    (environment===1&&institutionTypeList.length>1&&schools?.length===0&&excludeSchools?.length===0)?true:false
                                  }                    
                                  helperText={extraIncludeNoticeHelpText}
                                  enums={possibleSchools.current}
                                  onValidate={validator} 
                                  setCanSave={setExcludeSchoolsCanSave} 
                                  onUpdate={updateExcludeSchools}/>
                        </Grid>
                      </>}

                      {discoveryInformation.excludedSchools !== undefined && excludeSchools.length>0 && existingSchoolsIncluded.current !== null && discoveryInformation.excludedSchools.length === ( possibleSchools.current.length + existingSchoolsIncluded.current.length ) &&
                        <>
                        <Grid item xs={4}>
                        </Grid>
                        <Grid item xs={6}>
                        <Alert severity="info"><FormattedMessage defaultMessage="Kouluja ei jäänyt jäljelle!" /></Alert>
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
        
        {configurationEntity&&
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
              setCanSave={setCustomDisplayCanSave}/>
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

