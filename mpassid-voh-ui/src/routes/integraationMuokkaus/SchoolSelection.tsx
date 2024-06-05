import type { ChangeEvent, Dispatch} from "react";
import { useEffect, useState } from "react";
import {  Box, Grid, IconButton, Paper, Switch, Tooltip, Typography } from "@mui/material";
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
    isEditable: boolean; 
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    discoveryInformation: Components.Schemas.DiscoveryInformation;
    setCanSave: Dispatch<React.SetStateAction<boolean>>;
    setConfigurationEntity: Dispatch<Components.Schemas.ConfigurationEntity>;
    setDiscoveryInformation: Dispatch<Components.Schemas.DiscoveryInformation>;
}

interface SchoolType {
  nimi:string;
  oppilaitostyyppi: number;
  koulukoodi:number;
}

interface SchoolData {
  organisaatio:string;
  koulut: SchoolType[];
  existingIncludes:number[];
  existingExcludes:number[];
}

const kouluData:SchoolData = {
  organisaatio: '',
  koulut: [],
  existingIncludes: [],
  existingExcludes: []
}

export default function SchoolSelection({ integration, isEditable=false, setConfigurationEntity, configurationEntity, setDiscoveryInformation, discoveryInformation,setCanSave }: Props){

    const [enums, setEnums] = useState<oneEnum[]>([]);
    const [showSchools, setShowSchools] = useState<boolean>(discoveryInformation?.showSchools||true);
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
    const [possibleSchools, setPossibleSchools] = useState<oneEnum[]>([]);
    const [schools, setSchools] = useState<string[]>([]);
    const [excludeSchools, setExcludeSchools] = useState<string[]>([]);
    const [alreadyExcludeSchools, setAlreadyExcludeSchools] = useState<boolean>(false);
    const [exampleSchool, setExampleSchool] = useState<string>('');
    const [schoolData, setSchoolData] = useState<SchoolData>(kouluData);
    const [logo, setLogo] = useState<File>();
    const intl = useIntl();

    const convertSchoolCode = (value?:string) => {
      if(value === undefined || value === null || value === '' ) {
        return 0;
      }
      return Number(value.substring(17).split("#")[0])
    } 

    useEffect(() => {
      if(integration.organization?.children) {
        
        const newSchoolData:SchoolData = { organisaatio: integration.organization.oid!, 
                                            koulut: [],
                                            existingIncludes: [],
                                            existingExcludes: [] }
        //Filter out existingIncludes
        newSchoolData.koulut = integration.organization?.children.map(c=>({ nimi: c.name!, oppilaitostyyppi: convertSchoolCode(c.oppilaitostyyppi), koulukoodi: Number(c.oppilaitosKoodi)}))
        

        setSchoolData(newSchoolData)
      }
      
     
    }, [integration]);  

    useEffect(() => {
      setPossibleSchools(schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).map(k=>({ label: k.nimi, value: String(k.koulukoodi) })));
    }, [institutionTypeList, schoolData]);

    const handleShowSchoolsChange = (event: ChangeEvent,checked: boolean) => {
      setShowSchools(checked);
       discoveryInformation.showSchools=checked;
      if(checked) {
        delete discoveryInformation.customDisplayName;
      }
      setDiscoveryInformation(clone(discoveryInformation))
      setCanSave(true)
      
    };

    const getExtraSchoolsConfiguration = () => {
        if(integration.organization&&integration.organization.oid) {
          getIntegrationDiscoveryInformation({ organizationOid: integration.organization.oid, institutionType: institutionTypeList})
            .then(response=>{
              if(response.existingExcluded&&response.existingExcluded.length===1&&response.existingExcluded[0]!==String(integration.id)) {
                setAlreadyExcludeSchools(true)
              } else {
                setAlreadyExcludeSchools(false)
              }
              if(response.existingIncluded&&response.existingIncluded.length>0) {
                setPossibleSchools(schoolData.koulut.filter(k=>institutionTypeList.indexOf(k.oppilaitostyyppi)>-1).filter(k=>response.existingIncluded&&response.existingIncluded.indexOf(String(k.koulukoodi))<0).map(k=>({ label: k.nimi, value: String(k.koulukoodi) })));
              }
            })
        }
        
    };

    const changeExtraSchoolsConfiguration = (event: ChangeEvent<HTMLInputElement>) => {
      if(event.target.checked) {
          getExtraSchoolsConfiguration()
      }
      setExtraSchoolsConfiguration(event.target.checked)
      
    };

    const handleCustomDisplayNameChange = (value:string) => {
      
      if(value||value==="") {
        setCustomDisplayName('');
        delete discoveryInformation.customDisplayName
      } else {
        setCustomDisplayName(value);
        discoveryInformation.customDisplayName=value;
      }
      setDiscoveryInformation(clone(discoveryInformation))
      setCanSave(true)
      
    };
    
    const handleTitleChange = (value:string) => {
      
      if(value===undefined||value==="") {
        setTitle('');
        delete discoveryInformation.title
      } else {
        setTitle(value);
        discoveryInformation.title=value;
      }
      setDiscoveryInformation(clone(discoveryInformation))
      setCanSave(true)
      
    };

    /*
    Näytetäänkö koulut (KYLLÄ/EI)
      JOS näytetään koulut KYLLÄ 
        Koulutustoimijan perusnimi näyttää oletuksena kentässä koulutustoimijan virallisen nimen OPH:n org-palvelussa
        Mutta sallii myös vapaamuotoisen tekstin täyttämisen esim. Vantaan peruskoulu (Digione)
      Include schools (käyttäjän omaan organisaation ja valittuihin oppilaitostyyppeihin liittyvät koulut haetaan/näytetään organisaatiopalvelusta)
        Esim. Jos valittuna oppilaitostyyppi peruskoulut, käyttäjälle ei näytetä lukioita.
      Exclude schools
      Jos koulut näytetään niin koulutustoimijan näyttönimi on disabled (tooltipin infona, syy disaploitumiseen)
        Jos näytetään koulut EI, niin näyttönimi aktivoituna 
      Käyttäjä lisää "Oppilaitostyyppivalinnat" (Ei näytetä tätä kohtaa, jos ei tarvita tunnistuksenvälityspalvelun konfiguraatiossa, jos valittuna "kouluja ei näytetä" (CSC tarkistaa))
        Hyödynnetään OPH:n koodistopalvelun MPASSid-koodistoa: 
        Testi: https://virkailija.testiopintopolku.fi/koodisto-app/koodisto/view/mpassidnsallimatoppilaitostyypit/1
        Tuotanto:https://virkailija.opintopolku.fi/koodisto-app/koodisto/view/mpassidnsallimatoppilaitostyypit/1
        Alasvetovalikko/checkbox
      Lisää logon, jota käytetään koulunvalintasivulla.
        maksimikoko 125x36 px
        huom! siirretään ui:ssa logo otsikon "Oppilaitoksen valintanäkymän tiedot"
    */
    const updateInstitutionTypes = (values:string[]) => {
        if(configurationEntity&&configurationEntity.idp) {
          configurationEntity.idp.institutionTypes=values.map(value=>Number(value))
          setInstitutionTypeList(configurationEntity.idp.institutionTypes)  
        }
        if(extraSchoolsConfiguration) {
          getExtraSchoolsConfiguration()
        }
        setConfigurationEntity(clone(configurationEntity))
        setCanSave(true)
    }

    const updateExcludeSchools = (values:string[]) => {
      if(discoveryInformation) {
        discoveryInformation.excludedSchools=values.map(value=>value)
        setDiscoveryInformation(clone(discoveryInformation))
        
      }
      setExcludeSchools(values.map(value=>value))
      setCanSave(true)
  }

  const updateSchools = (values:string[]) => {
    if(discoveryInformation) {
      discoveryInformation.schools=values.map(value=>value)
      setDiscoveryInformation(clone(discoveryInformation))
      
    }
    setSchools(values.map(value=>value))
    setCanSave(true)
}

    const validator = (value:string) => {
        //return validate(configuration.validation,value);
        return validate([],value);
      }
      const helpGeneratorText = (value:string) => {
        //return helperText(configuration.validation,value);
        return helperText([],value);
      }
      
      
      
      const loadFile = (event:ChangeEvent<HTMLInputElement>) => {
          
          var reader = new FileReader();
          reader.onload = function(){
            const img:HTMLImageElement = document.getElementById('integratio-logo-preview') as HTMLImageElement;
            if(event&&event.target&&event.target.files&&event.target.files.length>0) {
              img.src = URL.createObjectURL(event.target.files[0]);
            }
          };
          if(event&&event.target&&event.target.files&&event.target.files.length>0) {
            reader.readAsDataURL(event.target.files[0]);
            
            setLogo(event.target.files[0])
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
              <Switch checked={showSchools}
                      onChange={handleShowSchoolsChange} />
            </Grid>
          </>          
          {showSchools&&
            <>
              {/*<Grid item xs={4}></Grid>*/}
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
                  {showSchools&&configurationEntity&&
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

                  <DataRowTitle path="extraSchoolsConfiguration"></DataRowTitle>
                  <Grid item xs={8}>
                    <Switch checked={extraSchoolsConfiguration}
                            onChange={changeExtraSchoolsConfiguration} />
                  </Grid>
                  
                  
                  {showSchools&&configurationEntity&&configurationEntity?.idp&&configurationEntity?.idp?.institutionTypes&&configurationEntity?.idp?.institutionTypes?.length>0&&
                          possibleSchools.length>0&&excludeSchools.length===0&&extraSchoolsConfiguration&&
                  <>
                    <Grid item xs={4}>
                      <FormattedMessage defaultMessage="schools" />
                    </Grid>
                    <Grid item xs={8}>
                    {possibleSchools&&<MultiSelectForm 
                              values={discoveryInformation.schools||[]}
                              label={"schools"}
                              attributeType={"data"}
                              isEditable={true}
                              mandatory={false}                    
                              helperText={helpGeneratorText}
                              enums={possibleSchools}
                              onValidate={validator} 
                              setCanSave={setCanSave} 
                              onUpdate={updateSchools}/>}
                    </Grid>
                  </>} 
                  {showSchools&&configurationEntity&&configurationEntity?.idp&&configurationEntity?.idp?.institutionTypes&&configurationEntity?.idp?.institutionTypes?.length>0&&
                      possibleSchools.length>0&&schools.length===0&&extraSchoolsConfiguration&&!alreadyExcludeSchools&&
                  <>
                    <Grid item xs={4}>
                      <FormattedMessage defaultMessage="excludedSchools" />
                    </Grid>
                    <Grid item xs={8}>
                    {possibleSchools&&<MultiSelectForm 
                              values={discoveryInformation.excludedSchools||[]}
                              label={"excludeSchools"}
                              attributeType={"data"}
                              isEditable={true}
                              mandatory={false}                    
                              helperText={helpGeneratorText}
                              enums={possibleSchools}
                              onValidate={validator} 
                              setCanSave={setCanSave} 
                              onUpdate={updateExcludeSchools}/>}
                    </Grid>
                  </>}
                  
                </Grid>
              </Grid>
            </>}
          </Grid>
          
          <Grid container spacing={2} mb={3}>    
          {false&&!showSchools&&<DataRow
            object={integration}
            path="discoveryInformation.earlyEducationProvider"
            type="text-list"
          />}
          {title&&title!==''&&showSchools&&<>
          <DataRowTitle></DataRowTitle>
          <DataRowValue><FormattedMessage defaultMessage="Esim. Mansikkalan koulu ({title})" values={{title: title}} /></DataRowValue>            
          </>}
          {title===undefined||title===''&&showSchools&&<>
          <DataRowTitle></DataRowTitle>
          <DataRowValue><FormattedMessage defaultMessage="Esim. Mansikkalan koulu" values={{title: title}} /></DataRowValue>            
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
                <IconButton color="primary" component="span">
                  <PhotoCamera />
                </IconButton><FormattedMessage defaultMessage="Valitse" values={{title: title}} />
                  
                </label>   
              </form>
              
            </DataRowValue>               
            {logo&&<>
              <DataRowTitle></DataRowTitle>
              <DataRowValue><img id="integratio-logo-preview" alt={"logo"} style={{maxHeight:"125 px",maxWidth:"36 px"}}/></DataRowValue>
              </>}
            {integration?.configurationEntity?.idp?.logoUrl&&integration.configurationEntity.idp.logoUrl!==''&&!logo&&
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
        
        {!showSchools&&customDisplayName&&configurationEntity&&
          <Grid container spacing={2} mb={3}>    
              <SchoolForm 
              isVisible={true} 
              isEditable={true} 
              isMandatory={false} 
              name="customDisplayName"
              value={customDisplayName} 
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

