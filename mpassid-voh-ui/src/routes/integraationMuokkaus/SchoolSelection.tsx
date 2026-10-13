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
import { createLogger } from "@/utils/devLog";

const debugLog = createLogger("DEBUG");
const warnLog = createLogger("WARN");

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


const convertSchoolCode = (value?:string) => {
  if(value === undefined || value === null || value === '' ) {
    return 0;
  }
  return Number(value.substring(17).split("#")[0])
} 

export default function SchoolSelection({ integration, isEditable=false, setConfigurationEntity, configurationEntity, setDiscoveryInformation, discoveryInformation,setCanSave, setLogo, setNewLogo, newLogo, environment }: Props){

  
    const discoveryInformationRef = useRef<Components.Schemas.DiscoveryInformation>(discoveryInformation)
    const oidRef = useRef<string|undefined>(integration.organization?.oid)
    const idRef = useRef<number|undefined>(integration.id)
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
    const [possibleSchoolList, setPossibleSchoolList] = useState<oneEnum[]>([]);
    const [schools, setSchools] = useState<string[]>(integration?.discoveryInformation?.schools||[]);
    const originalSchoolsRef = useRef<string[]>(integration?.discoveryInformation?.schools||[]);
    const [showAllSchools, setShowAllSchools] = useState<boolean>(false);
    const schoolsRef = useRef<string[]>(integration?.discoveryInformation?.schools||[]);
    const [excludeSchools, setExcludeSchools] = useState<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const excludeSchoolsRef = useRef<string[]>(integration?.discoveryInformation?.excludedSchools||[])
    const originalExcludeSchoolsRef = useRef<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const currentExcludeSchools = useRef<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const [hideExcludeSchools, setHideExcludeSchools] = useState<boolean>(false);
    const [exampleSchool, setExampleSchool] = useState<string>(possibleSchools.current?.filter(p=>excludeSchools.indexOf(p?.value||'')===-1)[0]?.label||'Mansikkalan koulu');
    const [schoolData, setSchoolData] = useState<SchoolData>();
    const [showLogo, setShowLogo] = useState<boolean>(false);
    const [localCanSave, setLocalCanSave] = useState<boolean>(true);
    const [institutionTypeCanSave, setInstitutionTypeCanSave] = useState<boolean>(true);
    const [titleCanSave, setTitleCanSave] = useState<boolean>(true);
    const [schoolsCanSave, setSchoolsCanSave] = useState<boolean>(true);
    const [customDisplayCanSave, setCustomDisplayCanSave] = useState<boolean>(true);
    const [excludeSchoolsCanSave, setExcludeSchoolsCanSave] = useState<boolean>(true);
    const [loading, setLoading] = useState(false);
    const [adminConfiguration, setAdminConfiguration] = useState(false);
  
    const extraSchoolConfigurationNeeded = useRef<boolean>(false)
    const disableExtraSchoolConfigurationSwitch = useRef<boolean>(false);
    const existingSchoolsIncluded = useRef<string[]|null>([]);
    const existingSchoolsExcluded = useRef<string[]|null>([]);
    const oldEnvironment = useRef<number>(environment);
    const originalEnvironment = useRef<number>(environment);

    const institutionTypeInit = useRef<boolean>(false);
    const noExistingSchoolConfigurations = useRef<boolean>(true);    

    const intl = useIntl();

    useEffect(() => {
      discoveryInformationRef.current=discoveryInformation
    }, [discoveryInformation]);

    useEffect(() => {
      debugLog("SchoolSelection (init localCanSave)",localCanSave)
      if(idRef.current && idRef.current !== integration.id) {
        originalSchoolsRef.current=(integration.discoveryInformation?.schools)?integration.discoveryInformation?.schools:[]
        originalExcludeSchoolsRef.current=(integration.discoveryInformation?.excludedSchools)?integration.discoveryInformation?.excludedSchools:[]
      }
      idRef.current=integration.id;
      oidRef.current=integration.organization?.oid
      if(!localCanSave) {
        setLocalCanSave(true)
      }
    }, [integration]);

    useEffect(() => {
      debugLog("SchoolSelection (localCanSave)",localCanSave)
      if(!localCanSave) {
        debugLog("SchoolSelection (canSave 1)",false)
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
        
        possibleSchools.current = newSchoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) }));
        debugLog("useEffect (possibleSchools, organizations exists)", possibleSchools.current)
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
          if(integration.deploymentPhase===1&&institutionTypeList.length>1) {
            setAdminConfiguration(true);
            debugLog("SchoolSelection (adminConfiguration)",true)
          }
          
        }
        
        setSchoolData(newSchoolData)
      }
      
      
    }, [institutionTypeList, integration, possibleSchools]);

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

    
    useEffect(() => {
      if (schoolData && institutionTypeList.length > 0) {
        debugLog("useEffect (updateExtraSchoolsConfigurationData) start")
        updateExtraSchoolsConfigurationData(institutionTypeList,environment,schoolData)
          .then(result => {
            possibleSchools.current = result
            setPossibleSchoolList(prev => isEqual(prev, result) ? prev : result)
          })
      }
    }, [institutionTypeList, schoolData, environment])
    

    const isExtraSchoolConfigurationOk = () => {
      debugLog("isExtraSchoolConfigurationOk start")
      debugLog("isExtraSchoolConfigurationOk (extraSchoolConfigurationNeeded.current)",extraSchoolConfigurationNeeded.current)
      if(possibleSchools.current.length===0) {
        debugLog("isExtraSchoolConfigurationOk (No possibleSchools)",possibleSchools.current.length)
        return false
      }
      if(extraSchoolConfigurationNeeded.current) {
        debugLog("isExtraSchoolConfigurationOk (configurationEntity.idp.institutionTypes?.length)",configurationEntity?.idp?.institutionTypes?.length)

        
        if(configurationEntity?.idp?.institutionTypes?.length===1) {
          var configurationCheckOk=true;
          // discoveryInformationRef.current, NOT the discoveryInformation prop:
          // saveCheck()/isExtraSchoolConfigurationOk() are always called
          // synchronously right after updateDiscoveryInformation() within the
          // SAME event handler (e.g. updateSchools() below) - the prop is one
          // render behind at that point (setDiscoveryInformation hasn't
          // committed yet), but updateDiscoveryInformation() already updated
          // discoveryInformationRef.current synchronously, so it reflects the
          // just-made change. Using the stale prop here made "Tallenna" get
          // stuck disabled whenever a mandatory schools/excludedSchools pick
          // was satisfied by exactly one click (e.g. picking a single school
          // when only one is required) - the very next such pick would
          // "self-correct" by reading the *previous* click's already-committed
          // value, masking the bug for any 2+-click selection.
          debugLog("isExtraSchoolConfigurationOk (discoveryInformation?.excludedSchools)",discoveryInformationRef.current?.excludedSchools)
          debugLog("isExtraSchoolConfigurationOk (discoveryInformation?.schools)",discoveryInformationRef.current?.schools)
          debugLog("isExtraSchoolConfigurationOk (existingSchoolsExcluded.current)",existingSchoolsExcluded.current)
          if(existingSchoolsIncluded.current?.length! === 0) {
            if(discoveryInformationRef.current?.excludedSchools?.length! > 0) {
              debugLog("isExtraSchoolConfigurationOk (failed check: all schools include already exists)")
              configurationCheckOk=false
            }
          }
          if(existingSchoolsExcluded.current?.length! > 0) {

            discoveryInformationRef.current?.schools?.forEach(school=>{
              if(existingSchoolsExcluded.current!.indexOf(school)<0) {
                debugLog("isExtraSchoolConfigurationOk (failed check: one included school is not in existing excluded schools)")
                configurationCheckOk=false
              }
            })
          }
          debugLog("isExtraSchoolConfigurationOk (existingSchoolsIncluded.current)",existingSchoolsIncluded.current)
          if(existingSchoolsIncluded.current?.length! > 0 && configurationCheckOk) {

            discoveryInformationRef.current?.schools?.forEach(school=>{
              if(existingSchoolsIncluded.current!.indexOf(school)>=0) {
                debugLog("isExtraSchoolConfigurationOk (failed check 3)")
                configurationCheckOk=false
              }
            })

          }

          debugLog("isExtraSchoolConfigurationOk (return 1)",(configurationCheckOk&&discoveryInformationRef.current?.showSchools&&configurationEntity !== undefined&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformationRef.current?.schools?.length!>0))))
          return (configurationCheckOk&&discoveryInformationRef.current?.showSchools&&configurationEntity !== undefined&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformationRef.current?.schools?.length!>0)))

        } else {

          debugLog("isExtraSchoolConfigurationOk (return 2)",(discoveryInformationRef.current?.showSchools&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformationRef.current?.schools?.length!>0))))
          return (discoveryInformationRef.current?.showSchools&&configurationEntity&&
            configurationEntity?.idp?.institutionTypes?.length!>0&&
            ((currentExcludeSchools.current?.length!>0||discoveryInformationRef.current?.schools?.length!>0)))
        }

      } else {
        debugLog("isExtraSchoolConfigurationOk (check 6)", {
          excludedSchools: discoveryInformationRef.current?.excludedSchools,
          schools: discoveryInformationRef.current?.schools,
          result: (discoveryInformationRef.current?.excludedSchools?.length! >= 0 && discoveryInformationRef.current?.schools?.length! >= 0),
        })
        return discoveryInformationRef.current?.excludedSchools?.length! >= 0 && discoveryInformationRef.current?.schools?.length! >= 0;
      }
      
    }

    const saveCheck = (idp:boolean,showLogo:boolean,showSchools:boolean) => {
      
      if(integration?.configurationEntity?.idp) {
        debugLog("SchoolSelection (idp)",idp)      
        
        if(idp&&((configurationEntity?.idp?.logoUrl&&configurationEntity?.idp?.logoUrl!=='')||showLogo)) {
            debugLog("SchoolSelection (logo)",true)            
            if (!showSchools||
                (showSchools&&
                isExtraSchoolConfigurationOk()&&
                (configurationEntity?.idp&&(configurationEntity.idp.institutionTypes?.length!>0))
                )){
                  debugLog("SchoolSelection (canSave School configuration)",true)                  
                  setCanSave(true)  
                  debugLog("SchoolSelection (saveCheck ready)",true)
                } else {
                  debugLog("SchoolSelection (canSave School configuration)",false)                  
                  setCanSave(false)  
                  debugLog("SchoolSelection (saveCheck ready)",false)
                }
          
        } else {
          debugLog("SchoolSelection (saveCheck environment)",environment)
          debugLog("SchoolSelection (saveCheck originalEnvironment.current)",originalEnvironment.current)
          if(environment===originalEnvironment.current||originalEnvironment.current===-5) {
            debugLog("SchoolSelection (canSave Original environemt)",true)
            setCanSave(false)
            debugLog("SchoolSelection (saveCheck not ready)",false)

            
          } else {
            debugLog("SchoolSelection (canSave 4 institutionTypeList.length)",institutionTypeList.length)
            debugLog("SchoolSelection (canSave 4 schools)",discoveryInformation.schools?.length)
            debugLog("SchoolSelection (canSave 4 excludedSchools)",discoveryInformation.excludedSchools?.length)
            
            if(institutionTypeList.length>1&&discoveryInformation.schools?.length===0&&discoveryInformation.excludedSchools?.length===0) {
              debugLog("SchoolSelection (canSave 4)",false)
              setCanSave(false)
            } else {
              debugLog("SchoolSelection (canSave 4)",true)
              setCanSave(true)
            }
            
            debugLog("SchoolSelection (saveCheck environment changed ready)",false)
          }
          
        }

      } else {
        debugLog("SchoolSelection (canSave not idp)",false)
        setCanSave(false)
        debugLog("SchoolSelection (saveCheck not ready)",true)
      }

    }

    const handleShowSchoolsChange = async (event: ChangeEvent,checked: boolean) => {
      debugLog("handleShowSchoolsChange",checked)
      showSchools.current=checked
       discoveryInformation.showSchools=checked;
      if(checked) {
        if(customDisplayName&&customDisplayName===integration?.organization?.name){
          handleCustomDisplayNameChange('')
        }
        //delete discoveryInformation.customDisplayName;
        debugLog("handleShowSchoolsChange (updateExtraSchoolsConfigurationData)",checked)
        possibleSchools.current = await updateExtraSchoolsConfigurationData(institutionTypeList,environment,schoolData);
        //setPossibleSchoolList(response);
        handleTitleChange(integration?.organization?.name||'')        
      } else {
        if(!customDisplayName){
          handleCustomDisplayNameChange(integration.discoveryInformation?.customDisplayName||integration?.organization?.name||'')
        }
        handleTitleChange('')
        updateInstitutionTypes([])
        debugLog("handleShowSchoolsChange (setExcludeSchools)",[])
        updateExcludeSchools([])
        debugLog("handleShowSchoolsChange (updateSchools)",[])
        updateSchools([])
        setExtraSchoolsConfiguration(false)
        extraSchoolConfigurationNeeded.current=false
      }
      updateDiscoveryInformation(clone(discoveryInformation))
      setConfigurationEntity(clone(configurationEntity))

      
      saveCheck(true,showLogo,checked);
    };

  const mandatoryExtraSchoolConfiguration = (includes: string[],excludes: string[],otherIncludes: string[]|null,otherExcludes: string[]|null) => {
    if (includes.length > 0 || excludes.length > 0) {
        debugLog("mandatoryExtraSchoolConfiguration (current existing configuration)",true)
        debugLog("mandatoryExtraSchoolConfiguration (possibleSchools.current.length)",possibleSchools.current.length)
        setExtraSchoolsConfiguration(true)
    } else {
        if(otherIncludes===null&&otherExcludes===null) {
          debugLog("mandatoryExtraSchoolConfiguration (no other existing configuration)",false)
          setExtraSchoolsConfiguration(false)
        } else {
          debugLog("mandatoryExtraSchoolConfiguration (other existing configuration)",true)
          debugLog("mandatoryExtraSchoolConfiguration (possibleSchools.current.length)",possibleSchools.current.length)
          if(possibleSchools.current.length>0) {
            setExtraSchoolsConfiguration(true)
          } else {
            setExtraSchoolsConfiguration(false)
          }
          
        }      
    }
  }

  const analyseExistingInclude = (institutionTypeList:number[],eSI: string[] | null,eSE: string[] | null, allSchools: SchoolType[]): oneEnum[] => {

    var newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1).map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
    debugLog("analyseExistingInclude (response.existingIncluded)", eSI) 
    let allschoolsNeeded = false;
    if (eSI !== null) {
      extraSchoolConfigurationNeeded.current = true
      disableExtraSchoolConfigurationSwitch.current = true;
      // Note: Existing include either all or for some integrations
      if (eSI.length === 0) {
                  // Note: Only existing integration with excludes exists
                  if (eSE !== null) {
                    // Note: Only existing integration with excludes exists
                    if (eSE.length === 0) {
                      // Note: Not possible. (eSI.length = 0 and eSE.length = 0) 
                      newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1)
                        .map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
                      const allowed: string[] = [...new Set([ ...originalSchoolsRef.current])];
                      newPossibleSchools = newPossibleSchools.filter(k => allowed && allowed.indexOf(k.value) > -1);

                    } else {
                      // (eSI.length = 0 and eSE.length > 0) 
                      // Note add: Integration with excludedSchools == eSE exists -> possibleSchools == excludeSchools: can only be used to add schools
                      // Note modify: Integration with excludedSchools == eSE exists + schools -> possibleSchools == excludeSchools + originalSchoolsRef: can only be used to add schools
                      newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1)
                        .map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));                      
                      debugLog("analyseExistingInclude (possibleSchools == excludeSchools: can only be used to add schools)", newPossibleSchools)
                      
                      const allowed: string[] = [...new Set([...eSE, ...originalSchoolsRef.current])];
                      debugLog("analyseExistingInclude (for possibleSchools, exists)", eSE)
                      debugLog("analyseExistingInclude (for possibleSchools allowed)", allowed)
                      newPossibleSchools = newPossibleSchools.filter(k => allowed && allowed.indexOf(k.value) > -1);
                      debugLog("analyseExistingInclude (allowed possibleSchools)", newPossibleSchools)
                    }
                  } else {
                    // Note: Not possible. (eSI.length = 0 and eSE == null)
                    newPossibleSchools = [];
                  }
      } else {
        // Note: existing integrations with schools exists and integration with excludeSchools exists
                  if (eSE !== null) {
                    // Note: existing integrations with schools exists and integration with excludeSchools exists
                    if (eSE.length === 0) {
                    // Note: (eSI.length > 0 and eSE.length === 0)
                    // Note add: existing integrations with schools exists and no integration with excludeSchools exists   -> possibleSchools == allSchools - includeSchools: can only be used to add schools
                    // Problem schools and excludeSchools have different possibleSchools
                    //            -> possibleSchools == excludeSchools - includeSchools: can only be used to add schools
                    //            -> possibleSchools == allschools: can only be used to modify excludeSchools                                        
                    // Note modify: existing integrations with schools exists and no integration with excludeSchools exists   -> possibleSchools == allSchools - includeSchools: can only be used to add schools
                    // Problem schools and excludeSchools have different possibleSchools
                    //            -> possibleSchools == originalSchoolsRef + excludeSchools - includeSchools: can only be used to add schools
                    //            -> possibleSchools == allschools: can only be used to modify excludeSchools 
                    newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1)
                        .filter(k => eSE && eSE.indexOf(String(k.koulukoodi)) > -1)
                        .filter(k => ((eSI && eSI.indexOf(String(k.koulukoodi)) < 0) || originalSchoolsRef.current.indexOf(String(k.koulukoodi)) > -1))
                        .map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
                      debugLog("analyseExistingInclude (possibleSchools == excludeSchools: can only be used to add schools)", newPossibleSchools)
                    allschoolsNeeded = true;
                    } else {
                    // Note: (eSI.length > 0 and eSE.length > 0)
                    // Note add: existing integrations with schools exists and integration with excludeSchools exists   -> possibleSchools == excludeSchools - includeSchools: can only be used to add schools
                    // Problem schools and excludeSchools have different possibleSchools
                    //            -> possibleSchools == excludeSchools - includeSchools: can only be used to add schools
                    //            -> possibleSchools == allschools: can only be used to modify excludeSchools
                    // Note modify: existing integrations with schools exists and integration with excludeSchools exists   -> possibleSchools == excludeSchools - includeSchools: can only be used to add schools 
                    // Problem schools and excludeSchools have different possibleSchools
                    //            -> possibleSchools == originalSchoolsRef - excludeSchools - includeSchools: can only be used to add schools
                    //            -> possibleSchools == allschools: can only be used to modify excludeSchools 
                    
                    newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1)
                        .filter(k => eSE && eSE.indexOf(String(k.koulukoodi)) > -1)
                        .filter(k => ((eSI && eSI.indexOf(String(k.koulukoodi)) < 0) || originalSchoolsRef.current.indexOf(String(k.koulukoodi)) > -1))
                        .map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
                      debugLog("analyseExistingInclude (possibleSchools == excludeSchools: can only be used to add schools)", newPossibleSchools)
                    allschoolsNeeded = true;
                    }
                  } else {
                    // Note: (eSI.length > 0 and eSE.length null)
                    // Note add: existing integrations with schools exists -> possibleSchools == allSchools - includeSchools: can only be used to add schools
                    // Problem schools and excludeSchools have different possibleSchools
                    //            -> possibleSchools == allSchools - includeSchools: can only be used to add schools
                    //            -> possibleSchools == allschools: can only be used to modify excludeSchools                                        
                    // Note modify: existing integrations with schools exists and no integration with excludeSchools exists   -> possibleSchools == allSchools - includeSchools: can only be used to add schools
                    // Problem schools and excludeSchools have different possibleSchools
                    //            -> possibleSchools == originalSchoolsRef + allSchools - includeSchools: can only be used to add schools
                    //            -> possibleSchools == allschools: can only be used to modify excludeSchools 
                    newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1)
                        .filter(k => ((eSI && eSI.indexOf(String(k.koulukoodi)) < 0) || originalSchoolsRef.current.indexOf(String(k.koulukoodi)) > -1))
                        .map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
                      debugLog("analyseExistingInclude (possibleSchools == excludeSchools: can only be used to add schools)", newPossibleSchools)
                    allschoolsNeeded = true;
                  }
      }
    } else {
      extraSchoolConfigurationNeeded.current = false
      disableExtraSchoolConfigurationSwitch.current = false;
      // eSI == null => eSE must be null
      // Note: No other integrations  -> possibleSchools == allschools
      newPossibleSchools = allSchools.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1)                        
                        .map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
                      debugLog("analyseExistingInclude (possibleSchools == allSchools: can only be used enywhere)", newPossibleSchools)
    }
    
    setShowAllSchools(allschoolsNeeded)

    return newPossibleSchools;
  }
  const analyseExistingExclude = (oldIntegration:boolean,institutionTypeCount: number, eSI: string[] | null,eSE: string[] | null) => {
    if (eSE !== null && eSE.length >= 0) {
          //existing Exclude defined list [ "1", "2"]                                                
          if (institutionTypeCount > 1) {
            debugLog("analyseExistingExclude (several institutionTypes)", institutionTypeCount)
            setHideExcludeSchools(false)
            debugLog("analyseExistingExclude (hideExcludeSchools 1)", false)
            extraSchoolConfigurationNeeded.current = true
            if (eSI !== null && eSI?.length > 0 && eSE?.length === 0) {
              setAdminConfiguration(false)
            } else {
              setAdminConfiguration(true)
            }            
          } else {
            setAdminConfiguration(false)
            debugLog("analyseExistingExclude (one institutionTypes)", institutionTypeCount)
            if (eSE?.length! > 0) {
              if (oldIntegration) {
                if(originalExcludeSchoolsRef.current.length===0) {
                  setHideExcludeSchools(true)
                } else {
                  setHideExcludeSchools(false)
                }                
                debugLog("analyseExistingExclude (hideExcludeSchools 2.1)", true)
              } else {
                setHideExcludeSchools(true)
                debugLog("analyseExistingExclude (hideExcludeSchools 2.2)", true)
              }

            } else {
              setHideExcludeSchools(false)
              debugLog("analyseExistingExclude (hideExcludeSchools 3)", false)
            }

            extraSchoolConfigurationNeeded.current = false
          }
          disableExtraSchoolConfigurationSwitch.current = true
          debugLog("analyseExistingExclude (disableExtraSchoolConfigurationSwitch.current 1)", disableExtraSchoolConfigurationSwitch.current)

        } else {
          //Exclude not defined, null
          setHideExcludeSchools(false)
          debugLog("analyseExistingExclude (hideExcludeSchools 4)", false)
          disableExtraSchoolConfigurationSwitch.current = false;
          debugLog("analyseExistingExclude (disableExtraSchoolConfigurationSwitch.current 2)", disableExtraSchoolConfigurationSwitch.current)

          if (institutionTypeCount > 1) {
            if (eSI !== null && eSI?.length >= 0 && eSE?.length === 0) {
              setAdminConfiguration(false)
            } else {
              setAdminConfiguration(true)
            }
            
          }

        }
  }

  const updateExtraSchoolsConfigurationData = async (institutionTypeList: number[],environment: number,schoolData:  SchoolData|undefined): Promise<oneEnum[]> => {

    if(schoolData !== undefined && schoolData.koulut !== null){

      if (oidRef.current && institutionTypeList.length > 0) {
        debugLog("updateExtraSchoolsConfigurationData (deplomentPhase)", environment);
        
        if (environment === 1) {
          try {
            debugLog("updateExtraSchoolsConfigurationData (execute getIntegrationDiscoveryInformation)")
            const response = await getIntegrationDiscoveryInformation({ organizationOid: oidRef.current, institutionType: institutionTypeList, id: idRef.current })
            debugLog("updateExtraSchoolsConfigurationData (integration.id)", idRef.current)
            debugLog("updateExtraSchoolsConfigurationData (response.existingIncluded)", response.existingIncluded)
            debugLog("updateExtraSchoolsConfigurationData (response.existingExcluded)", response.existingExcluded)
            if (response.existingExcluded === null && response.existingIncluded === null) {
              noExistingSchoolConfigurations.current = true
            } else {
              noExistingSchoolConfigurations.current = false
            }
            existingSchoolsExcluded.current = (response.existingExcluded !== undefined) ? response.existingExcluded : null;
            existingSchoolsIncluded.current = (response.existingIncluded !== undefined) ? response.existingIncluded : null;
            const eSE = existingSchoolsExcluded.current
            const eSI = existingSchoolsIncluded.current
            //const eSI = (discoveryInformationRef.current?.schools && discoveryInformationRef.current?.schools.length >= 0 && existingSchoolsIncluded.current !== null)?existingSchoolsIncluded.current.filter(e => discoveryInformationRef.current?.schools && discoveryInformationRef.current?.schools?.indexOf(e) < 0):existingSchoolsIncluded.current

            //Check if extra school configuration is needed and so on...
            analyseExistingExclude((idRef.current !== undefined && idRef.current > 0),institutionTypeList.length,eSI,eSE)
            let newPossibleSchools = analyseExistingInclude(institutionTypeList,eSI,eSE,schoolData.koulut)
                          
            if (institutionTypeList.length>1) {
              newPossibleSchools = schoolData.koulut.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1).map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
              debugLog("updateExtraSchoolsConfigurationData (possibleSchools admin)", possibleSchools.current)
            }

            mandatoryExtraSchoolConfiguration(schoolsRef.current,excludeSchoolsRef.current,eSI,eSE)

            const newExcludeSchools = excludeSchoolsRef.current.filter((es) => schoolData.koulut.map(p => p.koulukoodi).indexOf(es) >= 0);
            debugLog("updateExtraSchoolsConfigurationData 1 (setExcludeSchools)",newExcludeSchools)
            updateExcludeSchools(newExcludeSchools)
              
            debugLog("updateExtraSchoolsConfigurationData (institutionTypeInit.current)", institutionTypeInit.current)
            if (!institutionTypeInit.current) {
              institutionTypeInit.current = true;
              debugLog("updateExtraSchoolsConfigurationData (updateSchools)", schoolsRef.current)
              debugLog("updateExtraSchoolsConfigurationData (updateSchools)", discoveryInformationRef.current.schools)
              updateSchools(schoolsRef.current.filter((es) => newPossibleSchools.map(p => p.value).indexOf(es) >= 0))
            }
            
            debugLog("updateExtraSchoolsConfigurationData (possibleSchools.current)", newPossibleSchools)
            debugLog("updateExtraSchoolsConfigurationData (schools)", schoolsRef.current)
            if(possibleSchoolList.length!==newPossibleSchools.length) {
              setPossibleSchoolList(prev => isEqual(prev, newPossibleSchools) ? prev : newPossibleSchools )
            }           
            existingSchoolsExcluded.current = eSE
            existingSchoolsIncluded.current = eSI   
            return newPossibleSchools
            
          } catch (error) {
            warnLog("updateExtraSchoolsConfigurationData (koulutietojen haku epäonnistui, palataan kaikkiin kouluihin)", error)
            return schoolData.koulut.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1).map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
          }
          
        } else {

          debugLog("updateExtraSchoolsConfigurationData (for environment)", environment)
          setAdminConfiguration(false)
          
          debugLog("updateExtraSchoolsConfigurationData (schools)", schoolsRef.current)
          const newPossibleSchools = schoolData.koulut.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1).map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));
          
          debugLog("updateExtraSchoolsConfigurationData (possibleSchools not production integration)", newPossibleSchools)
          extraSchoolConfigurationNeeded.current = false;
          
          const newExcludeSchools = excludeSchoolsRef.current.filter((es) => schoolData.koulut.map(p => p.koulukoodi).indexOf(es) >= 0)
          debugLog("updateExtraSchoolsConfigurationData 2 (setExcludeSchools)",newExcludeSchools)
          updateExcludeSchools(newExcludeSchools)
          
          const newSchools = schoolsRef.current.filter((es) => newPossibleSchools.map(p => p.value).indexOf(es) >= 0)
          debugLog("updateExtraSchoolsConfigurationData (updateSchools newSchools)", newSchools)
          updateSchools(newSchools)

          debugLog("updateExtraSchoolsConfigurationData (possibleSchools.current*)", newPossibleSchools)
          debugLog("updateExtraSchoolsConfigurationData (schools*)", schoolsRef.current)
          return newPossibleSchools
        }

      } else {

        return schoolData.koulut.filter(k => institutionTypeList.indexOf(k.oppilaitostyyppi) > -1).map(k => ({ label: k.nimi, value: String(k.koulukoodi) }));

      }

    } else {

      return []
      
    }
  };

  const changeExtraSchoolsConfiguration = async (event: ChangeEvent<HTMLInputElement>) => {
      
      const newValue = event.target.checked;
      debugLog("changeExtraSchoolsConfiguration (new value)",newValue)

      setLoading(true)
      if(event.target.checked) {
          debugLog("changeExtraSchoolsConfiguration (updateExtraSchoolsConfigurationData)",newValue)
          possibleSchools.current =  await updateExtraSchoolsConfigurationData(institutionTypeList,environment,schoolData)          
      } else {
        debugLog("changeExtraSchoolsConfiguration (setExcludeSchools)",[])
        updateExcludeSchools([])
        debugLog("changeExtraSchoolsConfiguration (updateSchools 4)",[])
        updateSchools([])
      }

      extraSchoolConfigurationNeeded.current=newValue      
      setExtraSchoolsConfiguration(newValue)
      setLoading(false)
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
        discoveryInformationRef.current=clone(value)
        setDiscoveryInformation(clone(value)) 
    }

    const updateInstitutionTypes = async (values:string[]) => {
        if(values.length<=1) {
          setAdminConfiguration(false)
        }
        if(configurationEntity&&configurationEntity.idp) {
          configurationEntity.idp.institutionTypes=values.map(value=>Number(value))
          setInstitutionTypeList(configurationEntity.idp.institutionTypes)            
          if(values&&values.length>0) {       
            debugLog("updateInstitutionTypes (updateExtraSchoolsConfigurationData)",values) 
            possibleSchools.current = await updateExtraSchoolsConfigurationData(values.map(v=>Number(v)),environment,schoolData)            
          } 
        }
        //if(extraSchoolsConfiguration) {
        //  updateExtraSchoolsConfigurationData(values.map(v=>Number(v)))
        //}
        setConfigurationEntity(clone(configurationEntity))      
        if(values&&values.length>0) {  
          saveCheck(true,showLogo,showSchools.current)
        } else {
          debugLog("SchoolSelection (canSave 6)",false)
          setCanSave(false)
        }
        
        
        
    }

    const checkDiscoveryInformation = (newDiscoveryInformation:Components.Schemas.DiscoveryInformation) => {      
      var updateNeeded=false;
      if(newDiscoveryInformation) {        
        debugLog("checkDiscoveryInformation (existingSchoolsIncluded)",existingSchoolsIncluded.current)
        debugLog("checkDiscoveryInformation (existingSchoolsExcluded)",existingSchoolsExcluded.current)
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
              debugLog("checkDiscoveryInformation (add schools)",school)
            }
            
          })
        }
        
        if(updateNeeded) {
          debugLog("checkDiscoveryInformation (excludedSchools)",newDiscoveryInformation.excludedSchools)
          updateDiscoveryInformation(newDiscoveryInformation)
        }                
      }      
    }

    const updateExcludeSchools = (values:string[]) => {
      if(!isEqual(discoveryInformationRef.current.excludedSchools,values)||!isEqual(excludeSchoolsRef.current,values)){
        const newDiscoveryInformation:Components.Schemas.DiscoveryInformation = clone(discoveryInformationRef.current);
        if(newDiscoveryInformation) {
          newDiscoveryInformation.excludedSchools=values.map(value=>value);
          debugLog("updateExcludeSchools (existingSchoolsIncluded)",existingSchoolsIncluded.current)
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
                debugLog("updateExcludeSchools (add schools)",school)
              }
              
            })
          }
                    
          debugLog("updateExcludeSchools (excludedSchools)",newDiscoveryInformation.excludedSchools)
          updateDiscoveryInformation(newDiscoveryInformation)          
          
        }
        
        setExampleSchool(possibleSchools.current?.filter(p=>values.indexOf(p?.value||'')===-1)[0]?.label||'Mansikkalan koulu')
        debugLog("updateExcludeSchools (setExcludeSchools)",values)
        excludeSchoolsRef.current = values
        setExcludeSchools(values)
        
        
      }
      currentExcludeSchools.current=values;
      saveCheck(true,showLogo,showSchools.current)
  }

  const updateSchools = (values:string[]) => {
    if(discoveryInformationRef.current) {
      if(!isEqual(discoveryInformationRef.current.schools,values)||discoveryInformationRef.current?.excludedSchools?.length!=0){
        const newDiscoveryInformation:Components.Schemas.DiscoveryInformation = clone(discoveryInformationRef.current);
        newDiscoveryInformation.schools=values
        newDiscoveryInformation.excludedSchools=[]
        updateDiscoveryInformation(newDiscoveryInformation)      
      }
      
    }
    if(!isEqual(schoolsRef.current,values)){
      debugLog("updateSchools (schools)",schoolsRef.current)
      debugLog("updateSchools (values)",values)
      schoolsRef.current = values
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
      
/*
    if(!institutionTypeInit.current) {
      //institutionTypeInit.current=true
      if(institutionTypeList.length>0) {
        debugLog("Init updateExtraSchoolsConfigurationData",institutionTypeInit.current)
        debugLog("schoolSelection 1 (updateExtraSchoolsConfigurationData)",institutionTypeList) 
        updateExtraSchoolsConfigurationData(institutionTypeList,environment,schoolData).then(result => possibleSchools.current = result)
        
      }      
    }
    
    if(environment!==oldEnvironment.current&&institutionTypeList !== undefined && institutionTypeList.length > 0) {
      oldEnvironment.current=environment;
      debugLog("schoolSelection 2 (updateExtraSchoolsConfigurationData)",institutionTypeList) 
      updateExtraSchoolsConfigurationData(institutionTypeList,environment,schoolData).then(result => possibleSchools.current = result);
      
    }
*/    
    checkDiscoveryInformation(discoveryInformation);
    debugLog("SchoolSelection post start")
    if((institutionTypeList === undefined || institutionTypeList.length===0)&&showSchools.current&&localCanSave) {
      debugLog("SchoolSelection post 1 (localCanSave)",localCanSave)
      debugLog("SchoolSelection post 1 (institutionTypeList)",institutionTypeList)
      setLocalCanSave(false)
    } 

    if(possibleSchools.current.length===0&&showSchools.current&&localCanSave) {
      debugLog("SchoolSelection post 2 (localCanSave)",localCanSave)
      debugLog("SchoolSelection post 2 (possibleSchools)",possibleSchools.current)
      debugLog("SchoolSelection post 2 (extraSchoolsConfiguration)",extraSchoolsConfiguration)
      setLocalCanSave(false)
    }

    debugLog("SchoolSelection post", {
      localCanSave,
      environment,
      showSchools: showSchools.current,
      institutionTypes: configurationEntity?.idp?.institutionTypes?.length,
      schools: schools.length,
      extraSchoolsConfiguration,
      hideExcludeSchools,
      excludeSchools: excludeSchools.length,
      possibleSchools: possibleSchools.current.length,
      possibleSchoolList: possibleSchoolList.length,
      schoolData,
    })
    
    if(isEditable) {
      return(<>
        <Typography variant="h2" gutterBottom>
          <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
        </Typography>
        
        
        <Grid container size={12} spacing={2} sx={{ mb: 3 }}>

          <>
            <DataRowTitle path="showSchools"></DataRowTitle>
            <Grid size={8}>
              <Switch checked={showSchools.current}
                      onChange={handleShowSchoolsChange} />
            </Grid>
          </>      
          
          {showSchools.current&&
            <>
              <Grid size={12}>
                <Grid container spacing={1} sx={{ mb: 3 }}>
                  <Grid size={4}>
                    <FormattedMessage defaultMessage="Oppilaitostyypit" />
                  </Grid>
                  <Grid size={8}>
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
                  {adminConfiguration&&!noExistingSchoolConfigurations.current&&institutionTypeList!==null&&institutionTypeList.length>0&&
                        <>
                        <Grid size={4}>
                        </Grid>
                        <Grid size={6}>
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
                        <Grid size={8}>
                          <Switch checked={extraSchoolsConfiguration}
                                  sx={{ opacity: disableExtraSchoolConfigurationSwitch.current&&environment===1?0.4:1}}
                                  onChange={changeExtraSchoolsConfiguration} 
                                  disabled={(disableExtraSchoolConfigurationSwitch.current&&environment===1)||loading}/>
                                  
                        </Grid>
                              
                      {showSchools.current&&configurationEntity&&configurationEntity.idp&&configurationEntity.idp.institutionTypes&&configurationEntity.idp.institutionTypes?.length>0&&
                              (excludeSchools.length===0)&&extraSchoolsConfiguration&&
                      <>
                        <Grid size={4}>
                          <FormattedMessage defaultMessage="schools" />
                        </Grid>
                        <Grid size={8}>
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
                          schools.length===0&&extraSchoolsConfiguration&&!hideExcludeSchools&&schoolData !== undefined &&
                      <>
                        <Grid size={4}>
                          <FormattedMessage defaultMessage="excludedSchools" />
                        </Grid>
                        <Grid size={8}>
                          <MultiSelectForm 
                                  values={excludeSchools}
                                  label={"excludeSchools"}
                                  attributeType={"data"}
                                  isEditable={true}
                                  mandatory={
                                    (environment===1&&institutionTypeList.length>1&&schools?.length===0&&excludeSchools?.length===0)?true:false
                                  }                    
                                  helperText={extraIncludeNoticeHelpText}
                                  enums={(showAllSchools)?schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) })):possibleSchools.current}
                                  onValidate={validator} 
                                  setCanSave={setExcludeSchoolsCanSave} 
                                  onUpdate={updateExcludeSchools}/>
                        </Grid>
                      </>}

                      {discoveryInformation.excludedSchools !== undefined && excludeSchools.length>0 && existingSchoolsIncluded.current !== null && discoveryInformation.excludedSchools.length === ( possibleSchools.current.length + existingSchoolsIncluded.current.length ) &&
                        <>
                        <Grid size={4}>
                        </Grid>
                        <Grid size={6}>
                        <Alert severity="info"><FormattedMessage defaultMessage="Kouluja ei jäänyt jäljelle!" /></Alert>
                        </Grid>
                        </>}
                    </>
                  } 
                    
                  
                </Grid>
              </Grid>
            </>}
          </Grid>
          
          <Grid container size={12} spacing={2} sx={{ mb: 3 }}>    
          
          {title&&title!==''&&showSchools.current&&<>
          <DataRowTitle></DataRowTitle>
          <DataRowValue><FormattedMessage defaultMessage="Esim. {exampleSchool} ({title})" values={{exampleSchool: exampleSchool,title: title}} /></DataRowValue>            
          </>}
          {(title===undefined||title==='')&&showSchools.current&&<>
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
            <Grid size={8}><img id="integratio-logo-preview" alt={"logo"} hidden/></Grid>
            
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
          <Grid container size={12} spacing={2} sx={{ mb: 3 }}>    
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
        <Grid container size={12} spacing={2} sx={{ mb: 3 }}>
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
          
            <Grid size={4}>
                <FormattedMessage defaultMessage="Oppilaitostyypit" />
            </Grid>
            <Grid size={8}>
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
      <Grid size={4}>
        <Tooltip
          title={
            <>
              {tooltip && (
                <Box sx={{ mb: 1 }}>
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
      <Grid size={8}>
        {children}
      </Grid>
  );
}

