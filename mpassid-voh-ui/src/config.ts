export const roles = ["idp", "sp", "set"] as const;
export const environments = ["0", "1", "2"] as const;
export const openIntegrationsSessionStorageKey =
  "mpassid-open-integration-tabs";
export const attributePreferredOrder = ["firstName", "surname"]
  // Tallennetaan käännetty järjestys, jotta järjestäminen on optimaalisempi ja puuttuvat arvot järjestetään loppuun.
  .reverse();

// Lokalisointi
export const category = "mpassid-hallinta";

export const testLink =
  // eslint-disable-next-line no-template-curly-in-string
  "https://firmitas.csc.fi/mpass/Shibboleth.sso/Login?entityID=https://mpass-proxy.csc.fi/idp/shibboleth&authnContextClassRef=urn:mpass.id:authnsource:${flowName}";

export const tallentajaOphGroup =
  "APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000001";
export const katselijaOphGroup =
  "APP_MPASSID_KATSELIJA_1.2.246.562.10.00000000001";  

export const mpassIdUserAttributeTestService = 3000001

export interface IntegrationType {
    name: string;
    editable: boolean;
    visible: boolean;
}
export interface UiConfiguration {
  name: string;
  type: string;
  oid?: string;
  mandatory: boolean;
  multivalue?: boolean;
  environment?: number;
  validation: string[];
  integrationType: IntegrationType[];
}

export const defaultIntegrationType:IntegrationType = {
  name: 'default',
  editable: false,
  visible: true,
}

export const defaultDataConfiguration:UiConfiguration = {
  name: 'default',
  type: 'user',
  mandatory: true,
  
  validation: [],
  integrationType: [
      {
          name: 'azure',
          editable: false,
          visible: true,
      },
      {
          name: 'adfs',
          editable: false,
          visible: false,
      },
      {
        name: 'wilma',
        editable: false,
        visible: true,
    },
    {
        name: 'gsuite',
        editable: false,
        visible: false,
    },  
    {
        name: 'opinsys',
        editable: false,
        visible: false,
    },  
    {
        name: 'oidc',
        editable: false,
        visible: false,
    },  
    {
        name: 'saml',
        editable: false,
        visible: false,
    }
  ]
}
export const dataConfiguration:UiConfiguration[] = [
  {
      name: 'clientId',
      type: 'data',
      mandatory: true,
      
      validation: [],
      integrationType: []
  },
  {
      name: 'clientKey',
      type: 'data',
      mandatory: true,
      
      validation: [],
      integrationType: []
  },
  {
    name: 'datasource',
    type: 'data',
    mandatory: true,
    
    validation: [],
    integrationType: []
  },
  {
    name: 'tenantId',
    type: 'data',
    mandatory: true,
    
    validation: [],
    integrationType: []
  },
  {
      name: 'firstName',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'surname',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'groups',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'schoolIdStatic',
      oid: '1.2.246.562.10.21199106507',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: false,
              visible: true,
          }
      ]
  },
  {
      name: 'learningMaterialsCharges',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'azureApplicationIdUri',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: false,
              visible: false,
          }
      ]
  },
  {
      name: 'schoolIds',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'nickname',
      type: 'user',
      mandatory: true,
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'studentGroupGuid',
      oid: '1.2.246.562.10.21199106507',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'customTeacherRole',
      oid: '1.2.246.562.10.21199106507',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: false,
          }
      ]
  },
  {
      name: 'groupLevels',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'customStudentRole',
      oid: '1.2.246.562.10.21199106507',
      type: 'user',
      mandatory: false,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'username',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'learnerId',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'roles',
      type: 'user',
      mandatory: true,
      
      validation: [],
      integrationType: [
          {
              name: 'azure',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'redirect_uris',
      type: 'metadata',
      mandatory: true,
      multivalue: true,
      environment: 1,
      validation: [ 'fqdn', 'nohash', 'https' ],
      integrationType: [
          {
              name: 'oidcrp',
              editable: true,
              visible: true,
          }
      ]
  }

]