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
  mandatory: boolean;
  multivalue?: boolean;
  environment: string;
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
  environment: 'prod',
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
      name: 'firstName',
      type: 'user',
      mandatory: true,
      environment: 'prod',
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
      environment: 'prod',
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
      environment: 'prod',
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
      type: 'user',
      mandatory: true,
      environment: 'prod',
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
      name: 'learningMaterialsCharges',
      type: 'user',
      mandatory: true,
      environment: 'prod',
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
      environment: 'prod',
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
      environment: 'prod',
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
      environment: 'prod',
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
      type: 'user',
      mandatory: true,
      environment: 'prod',
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
      type: 'user',
      mandatory: true,
      environment: 'prod',
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
      environment: 'prod',
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
      type: 'user',
      mandatory: true,
      environment: 'prod',
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
      environment: 'prod',
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
      environment: 'prod',
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
      environment: 'prod',
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
      environment: 'prod',
      validation: [ 'fqdn', 'nohash', 'https' ],
      integrationType: [
          {
              name: 'oidcrp',
              editable: true,
              visible: true,
          }
      ]
  },
  {
      name: 'samlmetadata',
      type: 'data',
      mandatory: true,
      multivalue: false,
      environment: 'prod',
      validation: [ 'samlschema' ],
      integrationType: [
          {
              name: 'samlidp',
              editable: true,
              visible: true,
          }
      ]
  }

]