export const fixPackage = true;
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

export const getRandom = () => {
  return Math.random();
}

export async function calculateSHA1(message: string) {
    // Convert the string to an array buffer (UTF-8 encoding)
    const encoder = new TextEncoder();
    const data: Uint8Array = encoder.encode(message);
  
    // Use SubtleCrypto API to hash the data using SHA-1
    const hashBuffer: ArrayBuffer = await crypto.subtle.digest('SHA-1', data);
  
    // Convert the hash (ArrayBuffer) to a hex string
    const hashArray: number[] = Array.from(new Uint8Array(hashBuffer));  // Convert buffer to byte array
    const hashHex: string = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');  // Convert bytes to hex string
  
    return hashHex;
  }

export interface IntegrationType {
    name: string;
    editable: boolean;
    visible: boolean;
    attribute?: string;
    path?: string; 
    defaultValue?: any;
    index?: string;
    generate?: string;
}
export interface UiConfiguration {
  name: string;
  type: string;
  oid?: string;
  mandatory: boolean;
  array: boolean;
  multiselect?: boolean;
  switch: boolean;
  object?: boolean;
  trim?: string;
  enum?: any[]
  environment?: number;
  label?: string;
  validation: string[];
  integrationType: IntegrationType[];
}

export const defaultIntegrationType:IntegrationType = {
  name: 'default',
  editable: true,
  visible: false,
  attribute: ''
}

export const defaultDataConfiguration:UiConfiguration = {
  name: 'default',
  type: 'user',
  mandatory: false,
  array: false,
  switch: false,
  validation: [],
  integrationType: [
      {
          name: 'azure',
          editable: false,
          visible: false,
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
      array: false,
      switch: false,
      validation: [ 'binddn' ],
      integrationType: [        
        {
            name: 'opinsys',
            editable: true,
            visible: true,
        }
      ]
  },
  {
    name: 'clientId',
    type: 'data',
    mandatory: false,
    array: false,
    switch: false,
    validation: [ ],
    integrationType: [
      {
          name: 'azure',
          editable: false,
          visible: true,
      }
    ]
},
  {
      name: 'clientKey',
      type: 'data',
      mandatory: false,
      array: false,
      switch: false,
      validation: [],
      integrationType: [
        {
            name: 'azure',
            editable: false,
            visible: true,
        },
        {
            name: 'opinsys',
            editable: true,
            visible: true,
        }
      ]
  },
  {
    name: 'datasource',
    type: 'data',
    mandatory: false,
    array: false,
    switch: false,
    enum: [ 'azurev4', 'wilma', 'wilmav2', 'opinsys', 'azureLuovi'],
    validation: [ 'expert' ],
    integrationType: [
        {
            name: 'wilma',
            editable: true,
            visible: true,
            defaultValue: 'wilma'
        },
        {
            name: 'opinsys',
            editable: true,
            visible: true,
            defaultValue: 'opinsys'
        },
        {
            name: 'azure',
            editable: false,
            visible: true,
            defaultValue: 'azurev4'
        }
    ]
  },
  {
    name: 'tenantId',
    type: 'data',
    mandatory: true,
    array: false,
    switch: false,
    validation: [],
    integrationType: [
        {
            name: 'opinsys',
            editable: true,
            visible: true
        }
    ]
  },
  {
      name: 'firstName',
      type: 'user',
      mandatory: true,
      array: false,
      switch: false,
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
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      array: false,
      switch: false,
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
      mandatory: false,
      array: false,
      switch: false,
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
      name: 'learnerId',
      type: 'user',
      mandatory: true,
      array: false,
      switch: false,
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
      array: false,
      switch: false,
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
      name: 'post_logout_redirect_uris',
      type: 'metadata',
      mandatory: false,
      switch: false,
      array: true,
      validation: [ ],
      integrationType: [
          {
              name: 'oidc',
              editable: true,
              visible: false,
          }
      ]
  },
  
  
  {
    name: 'grant_types',
    type: 'metadata',
    mandatory: true,
    array: false,
    multiselect: true,
    switch: false,
    validation: [ ],
    enum: [ "authorization_code",
                "implicit"],
    integrationType: [
        {
            name: 'oidc',
            editable: false,
            visible: true,
            defaultValue: 'authorization_code'
        }
    ]
   },
   {
        name: 'redirect_uris',
        type: 'metadata',
        mandatory: true,
        array: true,
        switch: false,
        validation: [ 'uri', 'nohash' ],
        //validation: [ ],
        integrationType: [
            {
                name: 'oidc',
                editable: true,
                visible: true,
            }
        ]
  },
  {
    name: 'redirect_uris',
    type: 'metadata',
    mandatory: true,
    array: true,
    switch: false,
    environment: 1,
    validation: [ 'uri', 'https', 'nolocalhost', 'nohash' ],
    //validation: [ ],
    integrationType: [
        {
            name: 'oidc',
            editable: true,
            visible: true,
        }
    ]
  },
  {
    name: 'scope',
    type: 'metadata',
    mandatory: false,
    array: false,
    switch: false,
    validation: [],
    integrationType: [
        {
            name: 'oidc',
            editable: false,
            visible: true,
            defaultValue: 'openid profile'
        }
    ]
},
{
    name: 'client_secret',
    type: 'metadata',
    mandatory: true,
    array: false,
    switch: false,
    validation: [],
    integrationType: [
        {
            name: 'oidc',
            editable: false,
            visible: true,
            //index: 'randomsha1',
            //generate: 'randomsha1'            
        }
    ]
},
{
    name: 'client_id',
    type: 'metadata',
    mandatory: true,
    array: false,
    switch: false,
    validation: [],
    integrationType: [
        {
            name: 'oidc',
            editable: false,
            visible: true,
            //index: 'name_randomsha1',
            //generate: 'name_randomsha1',
        }
    ]
},
{
    name: 'response_types',
    type: 'metadata',
    mandatory: true,
    array: false,
    multiselect: true,
    switch: false,
    enum: [ "code",                
                "code id_token",
                "code token",
                "code id_token token" ],
    validation: [],
    integrationType: [
        {
            name: 'oidc',
            //editable: true,
            editable: false, //fix 2.4.1
            visible: true,
            defaultValue: 'code'
        }
    ]
},
  {
    name: 'wantAssertionsSigned',
    type: 'metadata',
    mandatory: true,
    array: false,
    switch: true,
    enum: [ true, false ],
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
            defaultValue: 'false'
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'wantAssertionsSigned',
    type: 'metadata',
    environment: 1,
    mandatory: true,
    array: false,
    switch: true,
    enum: [ true, false ],
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: false,
            visible: true,
            defaultValue: 'true'
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'assertionConsumerServiceUrls',
    type: 'metadata',
    mandatory: true,
    array: true,
    switch: false,
    object: true,
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'authnRequestsSigned',
    type: 'metadata',
    mandatory: true,
    array: false,
    switch: true,
    enum: [ true, false ],
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
            defaultValue: 'true'
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'encryptionCertificates',
    type: 'metadata',
    mandatory: false,
    array: true,
    switch: false,
    validation: ['cert' ],
    trim: 'cert',
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'entityId',
    type: 'metadata',
    mandatory: true,
    array: false,
    switch: false,
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'signingCertificates',
    type: 'metadata',
    mandatory: false,
    array: true,
    switch: false,
    validation: [ 'cert'],
    trim: 'cert',
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'signingCertificates',
    type: 'metadata',
    mandatory: true,
    array: true,
    switch: false,
    validation: ['cert' ],
    trim: 'cert',
    environment: 1,
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
        }
    ]
  },
  {
    name: 'token_endpoint_auth_method',
    type: 'metadata',
    mandatory: false,
    array: false,
    multiselect: false,
    switch: false,
    enum: [ 'client_secret_basic', 'client_secret_post', 'client_secret_jwt' ],
    validation: [ ],
    integrationType: [
        
        {
            name: 'oidc',
            //editable: true,
            editable: false,//fix 2.4.1
            visible: true,
            defaultValue: 'client_secret_basic'
        }
    ]
  },
  {
    name: 'id_token_signed_response_alg',
    type: 'metadata',
    mandatory: false,
    array: false,
    multiselect: false,
    switch: false,
    validation: [ ],
    enum: [ 'null', 'HS256' ],
    integrationType: [
        
        {
            name: 'oidc',
            //editable: true,
            editable: false, //fix 2.4.1
            visible: true 
        }
    ]
  },
  {
    name: 'allowtestlearnerid',
    type: 'data',
    mandatory: false,
    array: false,
    switch: true,
    enum: [ true, false ],
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
            defaultValue: 'false'
        },
        {
            name: 'oidc',
            //editable: true,
            editable: false, //fix 2.4.1
            visible: true,
            defaultValue: 'false'
        }
    ]
  },
  {
    name: 'serviceName',
    type: 'integrationDetails',
    mandatory: true,
    array: false,
    switch: false,
    validation: [ 'notempty'],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        },
        {
            name: 'oidc',
            editable: true,
            visible: true,
        }
    ]
  },
  {
    name: 'bindings',
    type: 'assertionConsumerServiceUrls',
    mandatory: true,
    array: false,
    switch: false,
    validation: [],
    integrationType: [
        {
            name: 'saml',
            editable: false,
            visible: false,
            defaultValue: 'HTTP-POST'
        }
    ]
  },
  {
    name: 'index',
    type: 'assertionConsumerServiceUrls',
    mandatory: true,
    array: false,
    switch: false,
    validation: ['number'],
    integrationType: [
        {
            name: 'saml',
            editable: false,
            visible: true,
            index: 'auto'
        }
    ]
  },
  {
    name: 'isDefault',
    type: 'assertionConsumerServiceUrls',
    mandatory: true,
    array: false,
    switch: true,
    enum: [ true, false ],
    validation: [ ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
            defaultValue: false
        }
    ]
  },
  {
    name: 'location',
    type: 'assertionConsumerServiceUrls',
    mandatory: true,
    array: false,
    switch: false,
    validation: [ 'uri', 'https' ],
    integrationType: [
        {
            name: 'saml',
            editable: true,
            visible: true,
        }
    ]
  },
  {
      name: 'hostname',
      type: 'data',
      mandatory: true,
      array: true,
      switch: false,
      validation: [ 'hostname' ],
      integrationType: [
          {
              name: 'wilma',
              editable: true,
              visible: true,              
          }
      ]
  },
  {
    name: 'entityId',
    type: 'data',
    mandatory: false,
    array: false,
    switch: false,
    validation: [ 'uri' ],
    integrationType: [
        {
            name: 'saml',
            editable: false,
            visible: false,              
        },
        {
            name: 'azure',
            editable: false,
            visible: false,              
        }
    ]
  },
  {
      name: 'uniqueId',
      type: 'data',
      mandatory: false,
      array: true,
      switch: false,
      validation: [  ],
      integrationType: [
          {
              name: 'wilma',
              editable: false,
              visible: false,
              attribute: 'hostname'
          },
          {
            name: 'opinsys',
            editable: false,
            visible: false,
            attribute: 'tenantId'
        },
        {
            name: 'azure',
            editable: false,
            visible: false,
            attribute: 'entityId'
        },
        {
            name: 'saml',
            editable: false,
            visible: false,
            attribute: 'entityId'
        },
        {
            name: 'oidc',
            editable: false,
            visible: false,
            attribute: 'clientId'
        }
      ]
  },
  {
    name: 'deploymentPhase',
    type: 'root',
    mandatory: false,
    array: true,
    switch: false,
    validation: [  ],
    integrationType: [
        {
            name: 'wilma',
            editable: true,
            visible: true
        }
    ]
}


]
