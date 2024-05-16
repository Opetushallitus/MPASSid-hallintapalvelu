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
import AttributeForm from "./Form";
import type { UiConfiguration } from "@/config";

interface Props {
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    discoveryInformation: Components.Schemas.DiscoveryInformation;
}

export default function SchoolSelection({ integration, configurationEntity, discoveryInformation }: Props){

    const [enums, setEnums] = useState<oneEnum[]>([]);
    const institutionTypes = useKoodisByKoodisto(
        "mpassidnsallimatoppilaitostyypit"
      );
    const language = toLanguage(useIntl().locale).toUpperCase();
    const identityProvider = integration.configurationEntity!.idp!;

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
      
      const configuration:UiConfiguration = {
        name: 'customDisplayName',
        type: 'data',
        mandatory: false,
        multivalue: false,
        environment: 1,
        validation: [  ],
        integrationType: [
            {
                name: 'wilma',
                editable: false,
                visible: true
            }
        ]
    }
    return(<>
        <Typography variant="h2" gutterBottom>
          *<FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />*
        </Typography>
        <AttributeForm 
                key={configuration.name!}
                onValidate={validator}
                uiConfiguration={configuration}
                type={'wilma'}
                role={'idp'}
                helperText={helpGeneratorText}
                onUpdate={function (name: string, value: string, type: "data" | "user"): void {
                    throw new Error("Function not implemented.");
                } }
                setCanSave={function (value: boolean): void {
                    throw new Error("Function not implemented.");
                } }
                attribute={{name: 'customDisplayName'}}
                attributeType={"data"} 
                newConfigurationEntityData={undefined} 
                setNewConfigurationEntityData={function (value: Components.Schemas.ConfigurationEntity): void {
                    throw new Error("Function not implemented.");
                } }/>
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
            <Grid item xs={4}>
            <FormattedMessage defaultMessage="Oppilaitostyypit" />
        </Grid>
        <Grid item xs={8}>
        {enums&&<MultiSelectForm 
                    object={undefined}
                    type={""}
                    label={"Oppilaitostyypit"}
                    attributeType={"data"}
                    isEditable={true}
                    mandatory={false}
                    path={undefined}
                    helperText={helpGeneratorText}
                    enums={enums}
                    onValidate={validator} 
                    setCanSave={function (value: boolean): void {
                        throw new Error("Function not implemented.");
                    } } 
                    onUpdate={(name: string, value: string, type: "data" | "user" | undefined) => {
                        throw new Error("Function not implemented.");
                    } }>

                    </MultiSelectForm>}
        </Grid>
        <DataRow
              object={integration}
              path="configurationEntity.idp.logoUrl"
              type="image"
          />
        </Grid>
        
                
                
        
        
      </>)
}