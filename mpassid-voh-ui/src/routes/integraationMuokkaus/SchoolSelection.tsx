import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import type { Components } from "@/api";
import getKoodistoValue from "@/utils/getKoodistoValue";
import { useKoodisByKoodisto } from "@/api/koodisto";
import toLanguage from "@/utils/toLanguage";
import type { oneEnum } from "./Form/MultiSelectForm";
import { SchoolForm } from "./Form";
import { clone, isEqual } from 'lodash';
import { createLogger } from "@/utils/devLog";
import {
  analyseExistingExclude as analyseExistingExcludeRule,
  analyseExistingInclude as analyseExistingIncludeRule,
  extraSchoolConfigurationDefault,
  keepOfferedSchools,
  keepSchoolsOfTypes,
  keepOrganisationSchools,
  parseInstitutionType,
  schoolOptions,
  toOption,
  validateSchoolSelection,
  type SchoolType,
} from "./schoolSelection/schoolRules";
import { useSiblingSchoolConfig, type SiblingSchoolConfig } from "./schoolSelection/useSiblingSchoolConfig";
import { useRefState } from "./schoolSelection/useRefState";
import LogoField from "./schoolSelection/LogoField";
import DataRowTitle from "./schoolSelection/components/DataRowTitle";
import ExamplePreview from "./schoolSelection/components/ExamplePreview";
import InstitutionTypesField from "./schoolSelection/components/InstitutionTypesField";
import NoticeRow from "./schoolSelection/components/NoticeRow";
import RulesSwitch from "./schoolSelection/components/RulesSwitch";
import SchoolsField from "./schoolSelection/components/SchoolsField";
import ShowSchoolsSwitch from "./schoolSelection/components/ShowSchoolsSwitch";
import { excludedSchoolsHelperText, ignoreCanSave, noHelperText, noValidation } from "./schoolSelection/components/fieldHelpers";

const debugLog = createLogger("DEBUG");
const warnLog = createLogger("WARN");

interface Props {
    newLogo: boolean;
    environment: number;
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    discoveryInformation: Components.Schemas.DiscoveryInformation;
    setCanSave: Dispatch<React.SetStateAction<boolean>>;
    // Parent state may be undefined before the integration is loaded.
    setConfigurationEntity: Dispatch<SetStateAction<Components.Schemas.ConfigurationEntity | undefined>>;
    setDiscoveryInformation: Dispatch<Components.Schemas.DiscoveryInformation>;
    setLogo: Dispatch<Blob>;
    setNewLogo: Dispatch<boolean>;
}

interface SchoolData {
  organisaatio:string;
  koulut: SchoolType[];
}



export default function SchoolSelection({ integration, setConfigurationEntity, configurationEntity, setDiscoveryInformation, discoveryInformation,setCanSave, setLogo, setNewLogo, newLogo, environment }: Props){

  
    const discoveryInformationRef = useRef<Components.Schemas.DiscoveryInformation>(discoveryInformation)
    const [showSchools, showSchoolsValue, setShowSchools] = useRefState<boolean>(integration.id===0||(integration.discoveryInformation?.showSchools ?? false))
    const [extraSchoolsConfiguration, setExtraSchoolsConfiguration] = useState<boolean>(
          ((discoveryInformation?.schools&&discoveryInformation?.schools?.length>0)||
          (discoveryInformation?.excludedSchools&&discoveryInformation?.excludedSchools?.length>0))||
          false);
    // Defaults depend on the school view: with the view on, the title
    // defaults to the organisation's name; with it off, the display name does
    // (published to the draft by the effect below).
    const [title, setTitle] = useState<string|undefined>(showSchoolsValue?(discoveryInformation?.title||integration?.organization?.name||''):undefined);
    const [institutionTypeList, setInstitutionTypeList] = useState<number[]>(integration?.configurationEntity?.idp?.institutionTypes||[]);
    const [customDisplayName, setCustomDisplayName] = useState<string|undefined>(showSchoolsValue?(discoveryInformation?.customDisplayName||undefined):(discoveryInformation?.customDisplayName||integration?.organization?.name||''));
    const institutionTypes = useKoodisByKoodisto(
        "mpassidnsallimatoppilaitostyypit"
      );
    const language = toLanguage(useIntl().locale).toUpperCase();
    const [, possibleSchoolsValue, setPossibleSchools] = useRefState<oneEnum[]>(() => integration?.organization?.children?.map(c=>({ nimi: c.name!, oppilaitostyyppi: parseInstitutionType(c.oppilaitostyyppi), koulukoodi: c.oppilaitosKoodi||''})).map(k=>({ label: k.nimi, value: k.koulukoodi }))||[]);
    const [schools, setSchools] = useState<string[]>(integration?.discoveryInformation?.schools||[]);
    const originalSchoolsRef = useRef<string[]>(integration?.discoveryInformation?.schools||[]);
    // The integration's own original schools stay selectable although other
    // production integrations include them only if it already was in
    // production when opened (decided 2026-10-13). Read at mount: the parent
    // overwrites integration.deploymentPhase when the environment changes.
    const [openedInProduction] = useState<boolean>(environment === 1);
    const [showAllSchools, setShowAllSchools] = useState<boolean>(false);
    const schoolsRef = useRef<string[]>(integration?.discoveryInformation?.schools||[]);
    const [excludeSchools, setExcludeSchools] = useState<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const excludeSchoolsRef = useRef<string[]>(integration?.discoveryInformation?.excludedSchools||[])
    const originalExcludeSchoolsRef = useRef<string[]>(integration?.discoveryInformation?.excludedSchools||[]);
    const [hideExcludeSchools, setHideExcludeSchools] = useState<boolean>(false);
    // The organisation's schools. Memoized on the organisation only: a new
    // object on every institution type change would make the fetch effect
    // below call the API once more per change.
    const schoolData = useMemo<SchoolData|undefined>(
      () =>
        integration.organization?.children
          ? {
              organisaatio: integration.organization.oid!,
              koulut: integration.organization.children.map(c=>({ nimi: c.name!, oppilaitostyyppi: parseInstitutionType(c.oppilaitostyyppi), koulukoodi: c.oppilaitosKoodi||''})),
            }
          : undefined,
      [integration.organization]
    );
    // reloadToken asks useSiblingSchoolConfig to load again (switch
    // toggles); awaitingToggle keeps the rules switch disabled meanwhile.
    const [reloadToken, setReloadToken] = useState(0);
    const [awaitingToggle, setAwaitingToggle] = useState(false);
    // The rules switch's own value, applied after the reload it triggered
    // (it used to be assigned after awaiting the request).
    const extraOverride = useRef<boolean|null>(null);
    const appliedSiblingKey = useRef<string|null>(null);
    // Status of the last applied useSiblingSchoolConfig result; set together
    // with possibleSchools, so the two always match in render.
    const [appliedSiblingStatus, setAppliedSiblingStatus] = useState<SiblingSchoolConfig["status"]>("skipped");
    // The loaded integration is a multi-type production integration with its
    // own school rules: the admin notice applies while several types stay chosen.
    const multiTypeWithOwnRules = () =>
      schoolData !== undefined&&
      (integration.configurationEntity?.idp?.institutionTypes?.length ?? 0)>1&&
      integration.discoveryInformation?.schools!==undefined&&integration.discoveryInformation?.excludedSchools!==undefined&&
      (integration.discoveryInformation.schools.length>0||integration.discoveryInformation.excludedSchools.length>0)&&
      integration.deploymentPhase===1
    const [adminConfiguration, setAdminConfiguration] = useState(() => multiTypeWithOwnRules()&&institutionTypeList.length>1);
  
    const [extraSchoolConfigurationNeeded, setExtraSchoolConfigurationNeeded] = useState<boolean>(false)
    const [, disableExtraSchoolConfigurationSwitchValue, setDisableExtraSchoolConfigurationSwitch] = useRefState<boolean>(false);
    const [existingSchoolsIncluded, existingSchoolsIncludedValue, setExistingSchoolsIncluded] = useRefState<string[]|null>([]);
    const [existingSchoolsExcluded, existingSchoolsExcludedValue, setExistingSchoolsExcluded] = useRefState<string[]|null>([]);

    const institutionTypeInit = useRef<boolean>(false);
    const [, noExistingSchoolConfigurationsValue, setNoExistingSchoolConfigurations] = useRefState<boolean>(true);    

    const intl = useIntl();

    useEffect(() => {
      discoveryInformationRef.current=discoveryInformation
    }, [discoveryInformation]);


    useEffect(() => {
      if(schoolData) {
        const nextPossibleSchools = schoolOptions(schoolData.koulut, institutionTypeList);
        // The integration's own schools stay selectable even if not of the chosen types.
        if(integration?.discoveryInformation?.schools&&integration.discoveryInformation.schools.length>0) {
          const existingSchools=integration.discoveryInformation.schools;
          schoolData.koulut.map(toOption)
          .forEach(element => {
            if(existingSchools.indexOf(element.value)>-1) {
              if(nextPossibleSchools.map(p=>p.value).indexOf(element.value)<0) {
                nextPossibleSchools.push(element)
              }
            }
            
          });
        }
        debugLog("useEffect (possibleSchools, organizations exists)", nextPossibleSchools)
        setPossibleSchools(nextPossibleSchools)
      }
    }, [institutionTypeList, integration, schoolData, setPossibleSchools]);

    // Derived from the koodisto, not state.
    const institutionTypeEnums = useMemo<oneEnum[]>(
      () =>
        institutionTypes.map((it) => ({
          label: getKoodistoValue(institutionTypes, String(it.koodiArvo), language)+' ('+it.koodiArvo+')',
          value: it.koodiArvo,
        })),
      [language, institutionTypes]
    );

    // The other production integrations' school configuration - the only
    // source of getIntegrationDiscoveryInformation requests.
    const sibling = useSiblingSchoolConfig({
      enabled: schoolData !== undefined,
      organizationOid: integration.organization?.oid,
      integrationId: integration.id,
      institutionTypes: institutionTypeList,
      environment,
      reloadToken,
    });

    // Validity is derived from the current values. The logo is the parent's
    // rule.
    // The integration's own schools that production does not allow (other
    // production integrations already use them, e.g. after switching from
    // Tuotanto-Testi). They are kept and shown - not silently removed - and
    // block saving until the user removes them.
    const notAllowedSchools = appliedSiblingStatus === "ok"
      ? schools.filter(code => !possibleSchoolsValue.some(option => option.value === code))
      : []
    const schoolName = (code: string) => schoolData?.koulut.find(school => school.koulukoodi === code)?.nimi || code
    const schoolSelectOptions = notAllowedSchools.length > 0
      ? [
          ...possibleSchoolsValue,
          ...notAllowedSchools.map(code => ({
            label: intl.formatMessage({ defaultMessage: "{school} (ei sallittu)" }, { school: schoolName(code) }),
            value: code,
          })),
        ]
      : possibleSchoolsValue

    const isValid = validateSchoolSelection({
      notAllowedSchoolCount: notAllowedSchools.length,
      draftHasIdp: Boolean(configurationEntity?.idp),
      showSchoolsSwitch: showSchoolsValue,
      possibleSchoolCount: possibleSchoolsValue.length,
      extraSchoolConfigurationNeeded,
      institutionTypeCount: institutionTypeList.length,
      hasConfigurationEntity: Boolean(configurationEntity),
      existingIncluded: existingSchoolsIncludedValue,
      existingExcluded: existingSchoolsExcludedValue,
      showSchools: discoveryInformation?.showSchools,
      schools: discoveryInformation?.schools,
      excludedSchools: discoveryInformation?.excludedSchools,
      currentExcludeSchools: excludeSchools,
    })

    useEffect(() => {
      debugLog("SchoolSelection (canSave)", isValid)
      setCanSave(isValid)
    }, [isValid, setCanSave]);

    const handleShowSchoolsChange = (event: ChangeEvent,checked: boolean) => {
      debugLog("handleShowSchoolsChange",checked)
      setShowSchools(checked)
      if(checked) {
        if(customDisplayName&&customDisplayName===integration?.organization?.name){
          handleCustomDisplayNameChange('')
        }
        // Load the other integrations' configuration again (applied by the effect above).
        setReloadToken(token => token+1)
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
        setExtraSchoolConfigurationNeeded(false)
      }
      // discoveryInformationRef.current, NOT the discoveryInformation prop: the
      // handlers above (updateSchools/updateExcludeSchools/handleTitleChange)
      // already wrote their changes to the ref synchronously, while the prop is
      // still the pre-click value - cloning the prop here put the cleared
      // schools/excludedSchools back into the draft.
      updateDiscoveryInformation(clone(discoveryInformationRef.current))


    };

  // Thin wrappers around schoolRules.ts: they apply the pure results to the
  // component's refs and state.
  const mandatoryExtraSchoolConfiguration = (includes: string[],excludes: string[],otherIncludes: string[]|null,otherExcludes: string[]|null,possibleSchoolCount: number) => {
    const value = extraSchoolConfigurationDefault({
      schools: includes,
      excludedSchools: excludes,
      existingIncluded: otherIncludes,
      existingExcluded: otherExcludes,
      possibleSchoolCount,
    })
    debugLog("mandatoryExtraSchoolConfiguration", { includes, excludes, otherIncludes, otherExcludes, possibleSchoolCount, value })
    setExtraSchoolsConfiguration(value)
  }

  const analyseExistingInclude = (institutionTypeList:number[],eSI: string[] | null,eSE: string[] | null, allSchools: SchoolType[]): oneEnum[] => {
    const result = analyseExistingIncludeRule({
      institutionTypes: institutionTypeList,
      existingIncluded: eSI,
      existingExcluded: eSE,
      allSchools,
      originalSchools: openedInProduction ? originalSchoolsRef.current : [],
    })
    debugLog("analyseExistingInclude", { eSI, eSE, result })
    setExtraSchoolConfigurationNeeded(result.extraSchoolConfigurationNeeded)
    setDisableExtraSchoolConfigurationSwitch(result.disableExtraSchoolConfigurationSwitch)
    setShowAllSchools(result.showAllSchools)
    return result.options;
  }

  const analyseExistingExclude = (oldIntegration:boolean,institutionTypeCount: number, eSI: string[] | null,eSE: string[] | null) => {
    const result = analyseExistingExcludeRule({
      oldIntegration,
      institutionTypeCount,
      existingIncluded: eSI,
      existingExcluded: eSE,
      originalExcludedSchools: originalExcludeSchoolsRef.current,
    })
    debugLog("analyseExistingExclude", { oldIntegration, institutionTypeCount, eSI, eSE, result })
    setHideExcludeSchools(result.hideExcludeSchools)
    if (result.extraSchoolConfigurationNeeded !== undefined) {
      setExtraSchoolConfigurationNeeded(result.extraSchoolConfigurationNeeded)
    }
    if (result.adminConfiguration !== undefined) {
      setAdminConfiguration(result.adminConfiguration)
    }
    setDisableExtraSchoolConfigurationSwitch(result.disableExtraSchoolConfigurationSwitch)
  }

  // Applies a useSiblingSchoolConfig result. Returns the new possible
  // schools, or undefined when there is nothing to apply.
  const applySiblingSchoolConfig = (sibling: SiblingSchoolConfig): oneEnum[] | undefined => {
    if (sibling.status === "skipped" || sibling.status === "loading" || schoolData === undefined) {
      return undefined
    }
    const institutionTypeList = sibling.institutionTypes
    debugLog("applySiblingSchoolConfig", sibling)

    // No other integrations to consult: null = none. (existingIncluded []
    // means "another integration has ALL schools", so leaving the initial []
    // - or a previous production load - here blocked the integration's own
    // excludedSchools and leaked production siblings' schools into its
    // excludedSchools.) Set before updateExcludeSchools, which reads the ref.
    const forgetSiblings = () => {
      setAdminConfiguration(false)
      setExistingSchoolsIncluded(null)
      setExistingSchoolsExcluded(null)
      setNoExistingSchoolConfigurations(true)
      setDisableExtraSchoolConfigurationSwitch(false)
      setHideExcludeSchools(false)
      setShowAllSchools(false)
      setExtraSchoolConfigurationNeeded(false)
    }

    if (sibling.status === "error") {
      warnLog("applySiblingSchoolConfig (koulutietojen haku epäonnistui, palataan kaikkiin kouluihin)", sibling.error)
      // A previous load's siblings (lock, rules) do not apply to these types.
      // The draft is left as it is.
      forgetSiblings()
      return schoolOptions(schoolData.koulut, institutionTypeList);
    }

    if (sibling.status === "nonProduction") {
      // Other integrations are not consulted outside production.
      forgetSiblings()
      const newPossibleSchools = schoolOptions(schoolData.koulut, institutionTypeList);
      updateExcludeSchools(keepOrganisationSchools(excludeSchoolsRef.current, schoolData.koulut))
      updateSchools(keepOfferedSchools(schoolsRef.current, newPossibleSchools))
      return newPossibleSchools
    }

    // Production.
    setNoExistingSchoolConfigurations(sibling.existingExcluded === null && sibling.existingIncluded === null)
    setExistingSchoolsExcluded(sibling.existingExcluded)
    setExistingSchoolsIncluded(sibling.existingIncluded)
    const eSE = sibling.existingExcluded
    const eSI = sibling.existingIncluded

    analyseExistingExclude((integration.id !== undefined && integration.id > 0),institutionTypeList.length,eSI,eSE)
    let newPossibleSchools = analyseExistingInclude(institutionTypeList,eSI,eSE,schoolData.koulut)
    if (institutionTypeList.length>1) {
      newPossibleSchools = schoolOptions(schoolData.koulut, institutionTypeList);
    }

    // The options just computed, not the previous round's.
    mandatoryExtraSchoolConfiguration(schoolsRef.current,excludeSchoolsRef.current,eSI,eSE,newPossibleSchools.length)

    updateExcludeSchools(keepOrganisationSchools(excludeSchoolsRef.current, schoolData.koulut))

    if (!institutionTypeInit.current) {
      institutionTypeInit.current = true;
      // Normalizes the draft's arrays only: schools that are not allowed are
      // kept and reported (notAllowedSchools) instead of silently removed.
      updateSchools(schoolsRef.current)
    }
    return newPossibleSchools
  };

  const changeExtraSchoolsConfiguration = (event: ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.checked;
      debugLog("changeExtraSchoolsConfiguration (new value)",newValue)
      if(newValue) {
        // Load again; once applied, the switch's own value overrides the
        // loaded default (see the apply effect) and the switch is re-enabled.
        extraOverride.current = true
        setAwaitingToggle(true)
        setReloadToken(token => token+1)
        return
      }
      updateExcludeSchools([])
      updateSchools([])
      setExtraSchoolConfigurationNeeded(false)
      setExtraSchoolsConfiguration(false)
    };

    // Every draft edit starts from the latest draft
    // (discoveryInformationRef) and never mutates the discoveryInformation
    // prop - edits made earlier in the same event are kept.
    const editDraft = (edit: (draft: Components.Schemas.DiscoveryInformation) => void) => {
      const next = clone(discoveryInformationRef.current)
      edit(next)
      updateDiscoveryInformation(next)
    }

    const handleCustomDisplayNameChange = (value:string) => {
      setCustomDisplayName(value);
      editDraft(draft => {
        if(value==="") {
          delete draft.customDisplayName
        } else {
          draft.customDisplayName=value;
        }
      })
    };
    
    const handleTitleChange = (value:string) => {
      setTitle(value||'');
      editDraft(draft => {
        if(value===undefined||value==="") {
          delete draft.title;
        } else {
          draft.title=value;
        }
      })
    };

    // Publishes a new draft object; the ref and the parent's state hold the
    // SAME object, so the parent's own changes to it are seen here too.
    const updateDiscoveryInformation = (value:Components.Schemas.DiscoveryInformation) => {
        value.showSchools=showSchools.current
        discoveryInformationRef.current=value
        setDiscoveryInformation(value) 
    }

    // The display name default (school view off) is saved, not only shown -
    // as when the school view is switched off (handleShowSchoolsChange).
    // Idempotent (StrictMode runs it twice).
    useEffect(() => {
      if(!showSchools.current&&customDisplayName&&!discoveryInformationRef.current.customDisplayName) {
        editDraft(draft => { draft.customDisplayName=customDisplayName })
      }
      // Once, on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateInstitutionTypes = (values:string[]) => {
        if(values.length<=1) {
          setAdminConfiguration(false)
        } else if(multiTypeWithOwnRules()) {
          setAdminConfiguration(true)
        }
        if(configurationEntity&&configurationEntity.idp) {
          const types = values.map(value=>Number(value))
          // useSiblingSchoolConfig loads the other integrations' configuration
          // for the new types (keyed on institutionTypeList).
          setInstitutionTypeList(types)
          // Functional update: Attributes/Metadata edit the same entity.
          setConfigurationEntity(prev => prev?.idp ? { ...prev, idp: { ...prev.idp, institutionTypes: types } } : prev)
          // Chosen and excluded schools of types no longer chosen are removed
          // (decided 2026-10-13; production did not prune at all, the other
          // environments only the chosen schools). Schools that other
          // production integrations use are not removed here - they are
          // reported (notAllowedSchools) once the new types are loaded.
          if(schoolData) {
            const keptSchools = keepSchoolsOfTypes(schoolsRef.current, schoolData.koulut, types)
            if(keptSchools.length!==schoolsRef.current.length) {
              updateSchools(keptSchools)
            }
            const keptExcludes = keepSchoolsOfTypes(excludeSchoolsRef.current, schoolData.koulut, types)
            if(keptExcludes.length!==excludeSchoolsRef.current.length) {
              updateExcludeSchools(keptExcludes)
            }
          }
        }
    }

    // When another integration includes schools (eSI) and nothing is excluded
    // elsewhere, a draft that includes no schools of its own gets eSI as its
    // excluded schools. Runs in an effect on the latest draft (not during
    // render).
    useEffect(() => {
      const eSI = existingSchoolsIncluded.current
      if(eSI===null||eSI.length===0||existingSchoolsExcluded.current!==null) {
        return
      }
      const next = clone(discoveryInformationRef.current)
      let updateNeeded=false;
      if(next.excludedSchools === undefined) {
        next.excludedSchools = [];
        updateNeeded=true
      }
      const excluded = [...next.excludedSchools]
      if(next.schools && next.schools.length === 0) {
        eSI.forEach(school=>{
          if(excluded.indexOf(school)<0) {
            excluded.push(school);
            updateNeeded=true
            debugLog("checkDiscoveryInformation (add schools)",school)
          }
        })
      }
      if(updateNeeded) {
        next.excludedSchools = excluded
        debugLog("checkDiscoveryInformation (excludedSchools)",next.excludedSchools)
        updateDiscoveryInformation(next)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [discoveryInformation, existingSchoolsIncludedValue])

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
        
        debugLog("updateExcludeSchools (setExcludeSchools)",values)
        excludeSchoolsRef.current = values
        setExcludeSchools(values)
        
        
      }
  }

  const updateSchools = (values:string[]) => {
    if(discoveryInformationRef.current) {
      // Schools and excludedSchools are mutually exclusive, so picking schools
      // clears the exclusions - but an empty pick must not: that used to wipe
      // an integration's own excludedSchools on every load (the
      // pruning in applySiblingSchoolConfig calls updateSchools([])).
      // A missing excludedSchools is still normalized to [] (see
      // isExtraSchoolConfigurationOk's length checks).
      const clearExcludes = values.length>0&&discoveryInformationRef.current.excludedSchools?.length!=0
      const normalizeExcludes = discoveryInformationRef.current.excludedSchools===undefined
      if(!isEqual(discoveryInformationRef.current.schools,values)||clearExcludes||normalizeExcludes){
        const newDiscoveryInformation:Components.Schemas.DiscoveryInformation = clone(discoveryInformationRef.current);
        newDiscoveryInformation.schools=values
        if(values.length>0||newDiscoveryInformation.excludedSchools===undefined) {
          newDiscoveryInformation.excludedSchools=[]
        }
        updateDiscoveryInformation(newDiscoveryInformation)
      }
      
    }
    if(!isEqual(schoolsRef.current,values)){
      debugLog("updateSchools (schools)",schoolsRef.current)
      debugLog("updateSchools (values)",values)
      schoolsRef.current = values
      setSchools(values)
    }
}

    // Apply each loaded result once.
    useEffect(() => {
      if (sibling.status === "loading" || appliedSiblingKey.current === sibling.key) {
        return
      }
      appliedSiblingKey.current = sibling.key
      const result = applySiblingSchoolConfig(sibling)
      if (result !== undefined) {
        setPossibleSchools(result)
      }
      setAppliedSiblingStatus(sibling.status)
      if (extraOverride.current !== null) {
        setExtraSchoolConfigurationNeeded(extraOverride.current)
        setExtraSchoolsConfiguration(extraOverride.current)
        extraOverride.current = null
        setAwaitingToggle(false)
      }
      // Runs per result; the handlers it calls read refs, not stale state.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sibling.key, sibling.status])

      // A new logo (resized by LogoField). Publishing the draft again keeps
      // the former loadFile behaviour (the parent re-checks it).
      const handleLogo = (logo: Blob) => {
        setLogo(logo)
        setNewLogo(true)
        updateDiscoveryInformation(clone(discoveryInformationRef.current))
      };

    // A school the selection view would show: the first chosen school, else
    // the first offered one that is not excluded. Derived (it was state
    // updated only when the excluded schools changed, so it could show a
    // school of a type no longer chosen).
    const exampleSchool = (schools.length>0
      ? schoolName(schools[0])
      : possibleSchoolsValue.find(option => excludeSchools.indexOf(option.value)===-1)?.label) || 'Mansikkalan koulu'
    const typesChosen = (configurationEntity?.idp?.institutionTypes?.length ?? 0)>0
    const schoolSelectMandatory = environment===1&&institutionTypeList.length>1&&schools.length===0&&excludeSchools.length===0

      return(<>
        <Typography variant="h2" gutterBottom>
          <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
        </Typography>
        
        
        <Grid container size={12} spacing={2} sx={{ mb: 3 }}>
          <ShowSchoolsSwitch checked={showSchoolsValue} onChange={handleShowSchoolsChange} />

          {showSchoolsValue&&
              <Grid size={12}>
                <Grid container spacing={1} sx={{ mb: 3 }}>
                  <InstitutionTypesField
                    selectedTypes={configurationEntity?.idp?.institutionTypes}
                    enums={institutionTypeEnums}
                    noSchoolsLeft={possibleSchoolsValue.length===0}
                    onUpdate={updateInstitutionTypes}/>
                  {adminConfiguration&&!noExistingSchoolConfigurationsValue&&institutionTypeList.length>0&&
                    <NoticeRow severity="warning"><FormattedMessage defaultMessage="Valittuja oppilaitostyyppejä jo muissa integraatioissa, muokkaaminen mahdollistaa saman koulun näkymisen useassa integraatiossa" /></NoticeRow>}

                  {configurationEntity&&
                    <SchoolForm 
                    isVisible={true} 
                    isEditable={true} 
                    isMandatory={false} 
                    name="title"
                    value={title||''} 
                    newConfigurationEntityData={configurationEntity} 
                    helperText={noHelperText} 
                    onUpdate={handleTitleChange} 
                    onValidate={noValidation} 
                    setCanSave={ignoreCanSave}/>}

                  {typesChosen&&
                    <>
                      <RulesSwitch
                        checked={extraSchoolsConfiguration}
                        locked={disableExtraSchoolConfigurationSwitchValue&&environment===1}
                        awaiting={awaitingToggle}
                        onChange={changeExtraSchoolsConfiguration}/>
                      {excludeSchools.length===0&&extraSchoolsConfiguration&&
                        <SchoolsField
                          kind="schools"
                          values={schools}
                          mandatory={schoolSelectMandatory}
                          enums={schoolSelectOptions}
                          helperText={noHelperText}
                          onUpdate={updateSchools}/>}
                      {notAllowedSchools.length>0&&
                        <NoticeRow severity="warning"><FormattedMessage defaultMessage="Kaikki valitut koulut eivät ole sallittuja Tuotannossa, koska ne ovat jo käytössä muissa integraatioissa: {schools}. Poista ne ennen tallennusta." values={{schools: notAllowedSchools.map(schoolName).join(", ")}} /></NoticeRow>}
                      {schools.length===0&&extraSchoolsConfiguration&&!hideExcludeSchools&&schoolData!==undefined&&
                        <SchoolsField
                          kind="excludedSchools"
                          values={excludeSchools}
                          mandatory={schoolSelectMandatory}
                          enums={showAllSchools?schoolOptions(schoolData.koulut, institutionTypeList):possibleSchoolsValue}
                          helperText={excludedSchoolsHelperText(existingSchoolsIncludedValue)}
                          onUpdate={updateExcludeSchools}/>}
                      {discoveryInformation.excludedSchools!==undefined&&excludeSchools.length>0&&existingSchoolsIncludedValue!==null&&discoveryInformation.excludedSchools.length===(possibleSchoolsValue.length+existingSchoolsIncludedValue.length)&&
                        <NoticeRow severity="info"><FormattedMessage defaultMessage="Kouluja ei jäänyt jäljelle!" /></NoticeRow>}
                    </>}
                </Grid>
              </Grid>}
          </Grid>
          
          <Grid container size={12} spacing={2} sx={{ mb: 3 }}>    
            {showSchoolsValue&&<ExamplePreview title={title} exampleSchool={exampleSchool}/>}
            <DataRowTitle path="logoUrl"/>
            <LogoField
              logoUrl={integration?.configurationEntity?.idp?.logoUrl}
              newLogo={newLogo}
              onLogo={handleLogo}/>
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
              helperText={noHelperText} 
              onUpdate={handleCustomDisplayNameChange} 
              onValidate={noValidation}               
              setCanSave={ignoreCanSave}/>
          </Grid>}
      </>)
    
}
