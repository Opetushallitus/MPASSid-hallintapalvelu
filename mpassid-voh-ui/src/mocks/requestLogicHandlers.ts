import type { Components } from "@/api";
import { getRole } from "@/routes/home/IntegrationsTable";
import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";
import { get, orderBy } from "lodash";
import definition from "../../schemas/schema.json";
import exampleData from "../../schemas/response.json";
import blankData from "../../schemas/blankIdpIntegration.json"

export { definition };

/*
let allIntegrations = definition.paths["/api/v1/integration/list"].get
  .responses["200"].content["application/json"].examples.integrations
  .value as Components.Schemas.Integration[];
*/
let allIntegrations = exampleData as unknown as Components.Schemas.Integration[];
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

const inactiveIntegration = definition.paths["/api/v2/integration/{id}/inactive"].delete.responses[
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
].content["application/json"].examples as {
  value?: Components.Schemas.DiscoveryInformationDTO
}

allIntegrations = Array(1).fill(allIntegrations).flat();

allIntegrations.push(
  ...allIntegrations.map((row) => ({
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
);

const defaults = {
  page: 1,
  size: 25,
};

export default {
  getIntegrationDiscoveryInformation(request) {
    console.log("getIntegrationDiscoveryInformation: ",request);
    if(discoveryInformation.value) {
      discoveryInformation.value.existingExcluded = [
        "1.2.246.562.10.93864526376"
      ]
    }
    console.log("getIntegrationDiscoveryInformation (discoveryInformation): ",discoveryInformation);
  },
  getBlankIntegration(request) {
    if(request?.query?.type&&blankIntegrations.filter(b=>b?.configurationEntity?.idp?.type === request.query.type).length>0) {
      blankIntegration.value = blankIntegrations.filter(b=>b?.configurationEntity?.idp?.type === request.query.type)[0]
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
    const id = 999995;
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
      filteredElements = orderBy(
        filteredElements,
        [path],
        [direction as boolean | "asc" | "desc"]
      );
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
