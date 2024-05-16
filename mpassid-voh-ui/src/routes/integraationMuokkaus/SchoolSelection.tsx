import type { Dispatch} from "react";
import { useEffect, useState } from "react";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { DataRow, TextList } from "../integraatio/IntegrationTab/DataRow";
import type { Components } from "@/api";
import getKoodistoValue from "@/utils/getKoodistoValue";
import { useKoodisByKoodisto } from "@/api/koodisto";
import toLanguage from "@/utils/toLanguage";
import type { oneEnum } from "./Form/MultiSelectForm";
import MultiSelectForm from "./Form/MultiSelectForm";
import { helperText, validate } from "@/utils/Validators";
import _ from "lodash";

interface Props {
    isEditable: boolean; 
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    discoveryInformation: Components.Schemas.DiscoveryInformation;
    setCanSave: Dispatch<boolean>;
    setConfigurationEntity: Dispatch<Components.Schemas.ConfigurationEntity>;
}

export default function SchoolSelection({ integration, isEditable=false, setConfigurationEntity, configurationEntity, discoveryInformation,setCanSave }: Props){

    const [enums, setEnums] = useState<oneEnum[]>([]);
    const [showSchools, setShowSchools] = useState(true);
    const institutionTypes = useKoodisByKoodisto(
        "mpassidnsallimatoppilaitostyypit"
      );
    const language = toLanguage(useIntl().locale).toUpperCase();
    const identityProvider = integration.configurationEntity!.idp!;

    const updateInstitutionTypes = (values:string[]) => {
        if(configurationEntity&&configurationEntity.idp) {
          configurationEntity.idp.institutionTypes=values.map(value=>Number(value))
        }
        setConfigurationEntity(_.clone(configurationEntity))
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
      
    if(isEditable) {
      return(<>
        <Typography variant="h2" gutterBottom>
          ***<FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />***
        </Typography>
        <Grid container spacing={2} mb={3}>
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
          <DataRow
            object={integration}
            path="discoveryInformation.customDisplayName"
          />                      
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="Oppilaitostyypit" />
          </Grid>
          <Grid item xs={8}>
            {enums&&<MultiSelectForm 
                      values={configurationEntity?.idp?.institutionTypes.map(it=>it.toString())||[]}
                      label={"Oppilaitostyypit"}
                      attributeType={"data"}
                      isEditable={true}
                      mandatory={false}                    
                      helperText={helpGeneratorText}
                      enums={enums}
                      onValidate={validator} 
                      setCanSave={function (value: boolean): void {
                          throw new Error("Function not implemented.");
                      } } 
                      onUpdate={updateInstitutionTypes}>

                      </MultiSelectForm>}
          </Grid>
          <DataRow
                object={integration}
                path="configurationEntity.idp.logoUrl"
                type="image"
            />
        </Grid>
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