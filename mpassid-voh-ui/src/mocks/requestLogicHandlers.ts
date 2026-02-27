import { type Components } from '@/api';
import { getRole } from "@/routes/home/IntegrationsTable";
import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";
import { clone, get, orderBy } from "lodash";
import definition from "../../schemas/schema.json";
import exampleData from "../../schemas/response.json"
import blankData from "../../schemas/blankIdpIntegration.json"
import exampleOrganisations from "../../schemas/organizations.json"


export { definition };

let allIntegrations = exampleData as unknown as Components.Schemas.Integration[];
const organisations = exampleOrganisations as unknown as Components.Schemas.Organization;
const blankIntegrations = blankData as unknown as Components.Schemas.Integration[];


const integration = definition.paths["/api/v2/integration/{id}"].get.responses[
  "200"
].content["application/json"].examples.integration as {
  value?: Components.Schemas.Integration;
};

const blankIntegration = definition.paths["/api/v2/integration"].get.responses[
  "200"
].content["application/json"].examples.integration as {
  value?: Components.Schemas.Integration;
};

const createIntegration = definition.paths["/api/v2/integration"].post.responses[
  "200"
].content["application/json"].examples.integration as {
  value?: Components.Schemas.Integration;
};

const updateIntegration = definition.paths["/api/v2/integration/{id}"].put.responses[
  "200"
].content["application/json"].examples.integration as {
  value?: Components.Schemas.Integration;
};

const inactivateIntegration = definition.paths["/api/v2/integration/{id}/inactive"].delete.responses[
  "200"
].content["application/json"].examples.integration as {
  value?: Components.Schemas.Integration;
};

const searchIntegrations: { value?: Components.Schemas.PageIntegration } = 
definition.paths["/api/v2/integration/search"].get.responses["200"].content[
  "application/json"
].examples.searchIntegrations;

const attributes = definition.paths["/api/v2/attribute/test"].get.responses[
  "200"
].content["application/json"].examples.items as {
  value?: Array<any>;
}; 

const discoveryInformation = definition.paths["/api/v2/integration/discoveryinformation"].get.responses[
  "200"
].content["application/json"].examples.excluded as {
  value?: {
    existingExcluded?: string[] | null;
    existingIncluded?: string[] | null; 
  } 
}

const samlMetadataIntegration = definition.paths["/api/v2/idp/saml/metadata/{id}"].post.responses[
  "200"
].content["application/json"].examples.integration as {
  value?: Components.Schemas.Integration;
};

type DiscoveryInformationResult = {
  existingIncluded: string[]|null;
  existingExcluded: string[]|null;
};

allIntegrations = [ ...allIntegrations.map((row) => ({
    ...row,
    configurationEntity: {
      entityId: undefined as unknown as string,
      ...row.configurationEntity,
    },
    deploymentPhase: 1,
    organization: {
      ...row?.organization,
      //name: `${row.organization!.name} (julkaistu)`,
    },
  }))
 ]


const defaults = {
  page: 1,
  size: 25,
};

const hasCommon = (a: string[], b: number[]): boolean => {
  if(a === undefined || b === undefined) return false
  return b.some(x => a.includes(String(x)));
};

const getIntegrationDiscoveryInformationValue = (oid:string,id:string,institutionTypes:string[]) => {
  
    var di:DiscoveryInformationResult = {existingIncluded: null, existingExcluded: null}
    // Find all integrations of the given organization
    var integrations: Components.Schemas.Integration[] = allIntegrations.filter(i => String(i.organization?.oid) === oid);

    const allExcluded = new Set<string>();
    const allIncluded = new Set<string>();
    let emptyIncludedFound = false;

    // eslint-disable-next-line no-loops/no-loops
    for (const i of integrations) {
      if (i.active && String(i.id) !== id && i.configurationEntity?.idp != null) {
        if (i.deploymentPhase !== 1) {
          // Filter out non production integrations
          continue;
        }
        if (hasCommon(institutionTypes,i?.configurationEntity?.idp?.institutionTypes||[]) && i.discoveryInformation != null) {
          if(i.discoveryInformation.excludedSchools) {
            // eslint-disable-next-line no-loops/no-loops
            for (const school of i.discoveryInformation.excludedSchools) {
              allExcluded.add(school);
            }
          }
          
          if (i?.discoveryInformation?.schools?.length === 0) {
            emptyIncludedFound = true; // Empty school set, so this integration includes all schools (possible future schools as well).
          }

          if(i.discoveryInformation.schools) {
            // eslint-disable-next-line no-loops/no-loops
            for (const school of i.discoveryInformation.schools) {
              allIncluded.add(school);
            }
          }
          di.existingIncluded=[ ...allIncluded];
        }
      }
    }

    if (allExcluded.size > 0) {
      di.existingExcluded=[...allExcluded];
    }
    if (emptyIncludedFound) {
      allIncluded.clear();
    }
    
    return di;
}

export default {
  inactivateIntegration(request) {
    console.log("inactivateIntegration: ",request.path)
  },
  getIntegrationDiscoveryInformation(request) {    
    discoveryInformation.value = getIntegrationDiscoveryInformationValue(request.query.organizationOid,request.query.id,request.query.institutionType)
  },
  getBlankIntegration(request) {
    if(request?.query?.type&&blankIntegrations.filter(b=>b?.configurationEntity?.idp?.type === request.query.type).length>0) {
      blankIntegration.value = blankIntegrations.filter(b=>b?.configurationEntity?.idp?.type === request.query.type)[0]      
      blankIntegration.value.organization = {}
      blankIntegration.value.organization = organisations
    }
    if(request?.query?.type&&blankIntegrations.filter(b=>b?.configurationEntity?.sp?.type === request.query.type).length>0) {
      blankIntegration.value = blankIntegrations.filter(b=>b?.configurationEntity?.sp?.type === request.query.type)[0]
    }
  },
  testAttributes(request) {
    let attributeResponse:any={};
    let selectArray: Array<string> = request?.query?.select as string[] || [];
    
    let i=0;
    
    selectArray.forEach(element => {
      
      switch(element) { 
        case "opentunti_desku": { 
          attributeResponse.opentunti_desku={}
          attributeResponse.opentunti_desku.role="role"
          attributeResponse.opentunti_desku.class="class"
          attributeResponse.opentunti_desku.classLevel="classLevel"
          attributeResponse.opentunti_desku.oid="oid"
          attributeResponse.opentunti_desku.schoolNumber="school number"
          attributeResponse.opentunti_desku.materialChargeSchool="material charge school"
           
          break; 
        } 
        case "onPremisesExtensionAttributes": { 
          attributeResponse.onPremisesExtensionAttributes={}
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute1=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute2=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute3=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute4=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute5=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute6=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute7=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute8=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute9=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute10=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute11=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute12=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute13=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute14=""
          attributeResponse.onPremisesExtensionAttributes.extensionAttribute15=""
          
          break; 
        } 
        default: { 
          attributeResponse[element]="test_value_"+i;
          
          i++
          break; 
        } 
     } 
      
    });
    attributes.value=attributeResponse;
  },
  testAttributesAuthorization(request) {
    console.log("testAttributesAuthorization: ",request.requestBody)
  },
  updateIntegration(request) {
    const id = Number(request.params.id);
    const index=allIntegrations.map(i=>i.id).indexOf(id);
    if (index !== -1) {
      allIntegrations[index] = request.requestBody;
    }
    request.requestBody?.permissions?.forEach((p: Components.Schemas.IntegrationPermission)=>{
      p.lastUpdatedOn = new Date().toISOString();
    })
    updateIntegration.value = request.requestBody
  },
  createIntegration(request) {
    const id = Math.max(9000000,...allIntegrations.map(i=>i.id!))+1;
    request.requestBody.id=id;
    const index=allIntegrations.map(i=>i.id).indexOf(id);
    if (index !== -1) {
      allIntegrations[index] = request.requestBody;      
    } else {
      allIntegrations.push(request.requestBody)
    }
    request.requestBody?.permissions?.forEach((p: Components.Schemas.IntegrationPermission)=>{
      p.lastUpdatedOn = new Date().toISOString();
    })
    createIntegration.value = request.requestBody
  },
  getIntegration(request) {
    const id = Number(request.params.id);
    integration.value = allIntegrations.find((row) => row.id === id);
    
    if(integration.value !== undefined) {
      integration.value.organization = {}
      integration.value.organization = organisations
    }
    
    if(id===999995&&integration.value?.configurationEntity?.idp){
      integration.value.configurationEntity.idp.logoUrl="https://virkailija.untuvaopintopolku.fi/mpassid/api/v2/integration/discoveryinformation/logo/999995"
      if(integration.value.configurationEntity.idp.type==='azure') {
        const azureIdp:Components.Schemas.Azure = clone(integration.value.configurationEntity.idp)
        azureIdp.signingCertificateValidUntil="2028-11-30"
        azureIdp.encryptionCertificateValidUntil="2028-11-30"
        azureIdp.metadataValidUntil="2028-11-30"
        integration.value.configurationEntity.idp=azureIdp;
      }
      if(integration.value.configurationEntity.idp.type==='gsuite') {
        const gsuiteIdp:Components.Schemas.Gsuite = clone(integration.value.configurationEntity.idp)
        gsuiteIdp.signingCertificateValidUntil="2028-11-30"
        gsuiteIdp.encryptionCertificateValidUntil="2028-11-30"
        gsuiteIdp.metadataValidUntil="2028-11-30"
        gsuiteIdp.logoUrl="https://mpass-proxy.csc.fi/images/buttons/btn-hausjarvi.png"
        gsuiteIdp.metadataUrl="https://mpass-proxy.csc.fi/idp_local_metadata/shib_hausjarvi-metadata.xml"
        integration.value.configurationEntity.idp=gsuiteIdp;
      }
      if(integration.value.configurationEntity.idp.type==='adfs') {
        const gsuiteIdp:Components.Schemas.Gsuite = clone(integration.value.configurationEntity.idp)
        gsuiteIdp.signingCertificateValidUntil="2028-11-30"
        gsuiteIdp.encryptionCertificateValidUntil="2028-11-30"
        gsuiteIdp.metadataValidUntil="2028-11-30"
        gsuiteIdp.logoUrl="https://mpass-proxy.csc.fi/images/buttons/btn-test.png"
        gsuiteIdp.metadataUrl="https://mpass-proxy.csc.fi/idp_local_metadata/shib_test§-metadata.xml"
        integration.value.configurationEntity.idp=gsuiteIdp;
      }
    }
  },
  uploadSAMLMetadata(request) {
    const id = Number(request.params.id);
    samlMetadataIntegration.value = allIntegrations.find((row) => row.id === id);
    
    
  },
  getIntegrationsSpecSearchPageable(request) {
    const page = Number(request.query.page ?? defaults.page);
    const size = Number(request.query.size ?? defaults.size);
    const query = request.query;
    const search = (query.search as string)?.toLowerCase();

    let filteredElements = [...allIntegrations];
    if (search) {
      filteredElements = filteredElements.filter((element) =>
        [
          "configurationEntity.name",
          "organization.oid",
          "organization.name",
          "organization.ytunnus",
        ].some((path) => get(element, path)?.toLowerCase().includes(search))
      );
    }

    if ("deploymentPhase" in query) {
      const deploymentPhases = (query.deploymentPhase as string).split(",").filter(Boolean);

      filteredElements = filteredElements.filter(
        (row) => deploymentPhases.includes(String(row.deploymentPhase!))
      );
    }

    if ("type" in query) {
      const types = (query.type as string).split(",").filter(Boolean);

      filteredElements = filteredElements.filter((row) =>
        types.includes(row.configurationEntity![getRole(row)]!.type!)
      );
    }

    if ("role" in query) {
      const roles = (query.role as string).split(",").filter(Boolean);

      filteredElements = filteredElements.filter((row) =>
        roles.includes(getRole(row))
      );
    }

    if ("sort" in query) {
      const sort = Array.isArray(query.sort) ? query.sort[0] : query.sort;
      const [path, direction] = sort.split(",").slice(0, 2);
      filteredElements  = orderBy(
        filteredElements,
        [path],
        [direction as boolean | "asc" | "desc"]
      ) as Components.Schemas.Integration[];
    }

    const start = page * size;
    const end = start + size;
    const content = filteredElements.slice(start, end);
    const empty = Boolean(filteredElements.length);

    // Update mock data in place
    searchIntegrations.value = {
      totalPages: Math.ceil(filteredElements.length / size),
      totalElements: filteredElements.length,
      size,
      content,
      number: page,
      sort: {
        empty,
        sorted: true,
        unsorted: false,
      },
      pageable: {
        offset: 0,
        sort: {
          empty: false,
          sorted: true,
          unsorted: false,
        },
        pageNumber: page,
        pageSize: size,
        paged: true,
        unpaged: false,
      },
      numberOfElements: content.length,
      first: start === 0,
      last: filteredElements.length <= end,
      empty,
    };
  },
} as RequestLogicHandlers;
