import type { Dispatch, PropsWithChildren} from "react";
import { useEffect, useState } from "react";
import type { SelectChangeEvent} from "@mui/material";
import { Box, FormControl, Grid, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { DataRow, TextList } from "../integraatio/IntegrationTab/DataRow";
import type { Components } from "@/api";
import getKoodistoValue from "@/utils/getKoodistoValue";
import { useKoodisByKoodisto } from "@/api/koodisto";
import toLanguage from "@/utils/toLanguage";
import type { oneEnum } from "./Form/MultiSelectForm";
import MultiSelectForm from "./Form/MultiSelectForm";
import { helperText, validate } from "@/utils/Validators";
import { SchoolForm } from "./Form";
import { clone, last, toPath } from "lodash";

interface Props {
    isEditable: boolean; 
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    discoveryInformation: Components.Schemas.DiscoveryInformation;
    setCanSave: Dispatch<React.SetStateAction<boolean>>;
    setConfigurationEntity: Dispatch<Components.Schemas.ConfigurationEntity>;
    setDiscoveryInformation: Dispatch<Components.Schemas.DiscoveryInformation>;
}

const kouluData = {
  organisaatio: '',
  koulut: [ 
    { nimi: '',
      oppilaitostyyppi:'',
      koulukoodi: 111
    },
    { nimi: '',
      oppilaitostyyppi:'',
      koulukoodi: 112
    }
  ],
  existingIncludes: [],
  existingExcludes: []
}

export default function SchoolSelection({ integration, isEditable=false, setConfigurationEntity, configurationEntity, setDiscoveryInformation, discoveryInformation,setCanSave }: Props){

    const [enums, setEnums] = useState<oneEnum[]>([]);
    const [showSchools, setShowSchools] = useState<boolean>(discoveryInformation?.showSchools||false);
    const [title, setTitle] = useState<string>(discoveryInformation?.title||integration?.organization?.name||'');
    //const [earlyEducationProvides, setEarlyEducationProvides] = useState<boolean>(discoveryInformation?.earlyEducationProvides||false);
    const [customDisplayName, setCustomDisplayName] = useState<string>(discoveryInformation?.customDisplayName||integration?.organization?.name||'');
    const institutionTypes = useKoodisByKoodisto(
        "mpassidnsallimatoppilaitostyypit"
      );
    const language = toLanguage(useIntl().locale).toUpperCase();
    const identityProvider = integration.configurationEntity!.idp!;
    

    const handleShowSchoolsChange = (event: SelectChangeEvent) => {
      if(event.target.value==="false") {
        setShowSchools(false);
        discoveryInformation.showSchools=false;
      } else {
        setShowSchools(true);
        discoveryInformation.showSchools=true;
        delete discoveryInformation.customDisplayName;
      }
      setDiscoveryInformation(clone(discoveryInformation))
      setCanSave(true)
      
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
        }
        setConfigurationEntity(clone(configurationEntity))
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
      /*
      <SchoolForm 
              isVisible={true} 
              isEditable={true} 
              isMandatory={false} 
              name="showSchools"
              value={showSchools.toString()} 
              newConfigurationEntityData={undefined} 
              helperText={function (data: string): JSX.Element {
                throw new Error("Function not implemented.");
              } } 
              onUpdate={function (value: string): void {
                throw new Error("Function not implemented.");
              } } 
              onValidate={function (data: string): boolean {
                throw new Error("Function not implemented.");
              } } 
              setNewConfigurationEntityData={function (value: Components.Schemas.ConfigurationEntity): void {
                throw new Error("Function not implemented.");
              } } 
              setCanSave={function (value: boolean): void {
                throw new Error("Function not implemented.");
              } }/>
      */
    if(isEditable) {
      return(<>
        <Typography variant="h2" gutterBottom>
          ***<FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />***
        </Typography>
        
        
        <Grid container spacing={2} mb={3}>
        <>
          <DataRowTitle path="showSchools"></DataRowTitle>
          
          <Grid item xs={8}>
            <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
              
              <Select
                labelId="demo-simple-select-standard-label"
                id="demo-simple-select-standard"
                value={String(showSchools)}
                onChange={handleShowSchoolsChange}
                
              >
                <MenuItem value="false"><FormattedMessage defaultMessage="Ei" /></MenuItem>
                <MenuItem value="true"><FormattedMessage defaultMessage="Kyllä" /></MenuItem>
                
              </Select>
            </FormControl>
            
      
        </Grid>
      </>          
      {showSchools&&
          <>
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
          
          
              </>}
          {showSchools&&configurationEntity&&configurationEntity?.idp&&configurationEntity?.idp?.institutionTypes&&configurationEntity?.idp?.institutionTypes?.length>0&&<DataRow
            object={integration}
            path="discoveryInformation.schools"
            type="text-list"
          />}
          {showSchools&&configurationEntity&&configurationEntity?.idp&&configurationEntity?.idp?.institutionTypes&&configurationEntity?.idp?.institutionTypes?.length>0&&<DataRow
            object={integration}
            path="discoveryInformation.excludedSchools"
            type="text-list"
          />}

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
          
                     
          <DataRow
                object={integration}
                path="configurationEntity.idp.logoUrl"
                type="image"
            />
        </Grid>
        {!showSchools&&customDisplayName&&configurationEntity&&
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
              setCanSave={setCanSave}/>}
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