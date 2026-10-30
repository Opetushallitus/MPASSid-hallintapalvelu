import { type Components } from '@/api';
import { getRole } from "@/routes/home/IntegrationsTable";
import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";
import { clone, get, orderBy } from "lodash";
import { createLogger } from "@/utils/devLog";
import definition from "../../schemas/schema.json";
import exampleData from "../../schemas/response.json"
import blankData from "../../schemas/blankIdpIntegration.json"
import exampleOrganisations from "../../schemas/organizations.json"

const debugLog = createLogger("DEBUG");


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

const searchIntegrations: { value?: Components.Schemas.PageIntegration } = 
definition.paths["/api/v2/integration/search"].get.responses["200"].content[
  "application/json"
].examples.searchIntegrations;

/** A (possibly nested) value in the mocked attribute test response. */
type AttributeTestValue = string | { [key: string]: AttributeTestValue };

const attributes = definition.paths["/api/v2/attribute/test"].get.responses[
  "200"
].content["application/json"].examples.items as {
  // The schema example is an empty list; testAttributes replaces it with the response object.
  value?: unknown[] | { [name: string]: AttributeTestValue };
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

// The mock "database" lives in this page's memory, so a full page load (an
// address typed into the URL bar, F5) used to reset it. It is kept in
// sessionStorage: it survives reloads in the same tab, a new tab starts from
// the example data (and so does every Playwright test - each gets a fresh
// browser context).
const STORAGE_KEY = "mpassid-mock-integrations";

const loadIntegrations = (): Components.Schemas.Integration[] | undefined => {
  try {
    const stored = globalThis.sessionStorage?.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
  }
};

/** Call after every change to allIntegrations. */
const saveIntegrations = () => {
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(allIntegrations));
  } catch (error) {
    debugLog("saveIntegrations (sessionStorage)", error);
  }
};

allIntegrations = loadIntegrations() ?? [ ...allIntegrations.map((row) => ({
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

// E2E-testien virhesimulointi: koska tämä (openapi-backend-integrationin)
// requestLogicHandler-hook tukee {status,mock}-paluuarvoa (ks.
// vendor/@visma/msw-openapi-backend-integration/lib/main.js:13-25) mutta
// mikään olemassa oleva handler ei koskaan käytä sitä, e2e-testeillä ei ole
// muuten deterministististä tapaa saada tallennus epäonnistumaan - sama
// ongelma kuin id===999995:n käyttö getIntegration()-handlerissa (rivi 259)
// erikoisdatan palauttamiseen, vain virhevastauksille. Näitä tunnisteita ei
// käytetä sovelluksen tuotantokoodissa, ainoastaan e2e-testien datassa
// (ks. e2e/save-error.spec.ts, e2e/azure-attribute-test.spec.ts).
const E2E_TRIGGER_409 = "__e2e_trigger_409__";
const E2E_TRIGGER_GENERIC_ERROR = "__e2e_trigger_500__";
const E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE = "__e2e_trigger_403__";
// testAttributesAuthorization: HTTP 200 with false (not authorized, e.g. the
// integration is not saved yet) - a different branch from the 403 above.
const E2E_TRIGGER_ATTRIBUTE_TEST_UNAUTHORIZED = "__e2e_trigger_unauthorized__";
// testAttributes: an unknown principal (404) -> "Tuntematon tilaaja".
const E2E_TRIGGER_UNKNOWN_PRINCIPAL = "__e2e_unknown_principal__";

// E2E-testien koukut koulutietojen haulle (getIntegrationDiscoveryInformation).
// MSW:n handlerit ajetaan sivun omassa JS-kontekstissa, joten testi asettaa ne
// localStorageen (page.evaluate) - page.route() ei näe MSW:n vastauksia.
// Ks. e2e/school-selection-extra.spec.ts.
//  - E2E_DISCOVERY_FAIL = "1": vastaa 500.
//  - E2E_DISCOVERY_DELAY_SINGLE_TYPE_MS = "<ms>": viivästää vastausta
//    pyynnöille, joissa on täsmälleen yksi oppilaitostyyppi (kilpailutilanne).
export const E2E_DISCOVERY_FAIL = "e2e-discovery-fail";
export const E2E_DISCOVERY_DELAY_SINGLE_TYPE_MS = "e2e-discovery-delay-single-type-ms";

const readE2eFlag = (key: string): string | null => {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

// E2E-koukku koodistohaulle (getKoodisByKoodisto), sama localStorage-
// mekanismi kuin yllä: page.route() ei näe pyyntöä, kun MSW:n service worker
// ohjaa sivua (esim. uudelleenlatauksen jälkeen). Ks.
// e2e/integration-detail-view.spec.ts (ErrorFallback).
//  - E2E_KOODISTO_FAIL = "1": vastaa 500. Muuten mockin oletusvastaus.
export const E2E_KOODISTO_FAIL = "e2e-koodisto-fail";

export const koodistoRequestLogicHandlers: RequestLogicHandlers = {
  getKoodisByKoodisto() {
    if (readE2eFlag(E2E_KOODISTO_FAIL) === "1") {
      return { status: 500, mock: {} };
    }
  },
};

/**
 * A save response's organisation, like the backend's: only the stored
 * organisation (oid, name, ytunnus). The backend adds the schools
 * (children) only to GET responses (IntegrationService.getSpecIntegrationById
 * fetches them from the organisaatio service; they are never stored).
 */
const saveResponse = (integration: Components.Schemas.Integration): Components.Schemas.Integration => {
  if (!integration?.organization) {
    return integration;
  }
  const { children: _children, ...organization } = integration.organization;
  return { ...integration, organization };
};

const triggerIntegrationSaveError = (body: Components.Schemas.Integration) => {
  const marker =
    body?.discoveryInformation?.customDisplayName ||
    body?.configurationEntity?.sp?.name ||
    "";
  if (marker === E2E_TRIGGER_409) {
    return {
      status: 409,
      mock: { message: "E2E-testin simuloima 409-konflikti" },
    };
  }
  if (marker === E2E_TRIGGER_GENERIC_ERROR) {
    return { status: 500, mock: {} };
  }
  return undefined;
};

// index.tsx:350's client_secret reminder (`!client_secret.includes("***")`)
// assumes a real backend only ever reveals the raw secret once, on the
// exchange that first generates it - the reminder condition is checked
// against `newIntegration` (the CLIENT's own live editing state), which is
// only ever repopulated from a *fresh* fetch (e.g. re-opening an integration
// for edit from its view page), never from the immediate save response
// itself. So masking has to happen on create too, not just update - it's
// what a later, independent fetch of this same integration will see.
const maskClientSecret = (body: Components.Schemas.Integration) => {
  // client_secret is a single string value; the schema types metadata values as objects.
  const metadata = body?.configurationEntity?.sp?.metadata as { client_secret?: string } | undefined;
  if (metadata?.client_secret) {
    metadata.client_secret = "***"
  }
};

const hasCommon = (a: string[], b: number[]): boolean => {
  if(a === undefined || b === undefined) return false
  return b.some(x => a.includes(String(x)));
};

const getIntegrationDiscoveryInformationValue = (oid:string,id:string,institutionTypes:string[]) => {
  
    const di:DiscoveryInformationResult = {existingIncluded: null, existingExcluded: null}
    // Find all integrations of the given organization
    const integrations: Components.Schemas.Integration[] = allIntegrations.filter(i => String(i.organization?.oid) === oid);

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
      //allIncluded.clear();
    }
    
    return di;
}

export default {
  inactivateIntegration(request) {
    debugLog("inactivateIntegration",request.path)
  },
  getIntegrationDiscoveryInformation(request) {    
    if (readE2eFlag(E2E_DISCOVERY_FAIL) === "1") {
      return { status: 500, mock: {} };
    }
    const value = getIntegrationDiscoveryInformationValue(request.query.organizationOid,request.query.id,request.query.institutionType)
    discoveryInformation.value = value
    const delay = Number(readE2eFlag(E2E_DISCOVERY_DELAY_SINGLE_TYPE_MS)) || 0;
    const institutionTypes = ([] as unknown[]).concat(request.query.institutionType ?? []);
    if (delay > 0 && institutionTypes.length === 1) {
      // Captured `value`, not discoveryInformation.value: a later, faster
      // request may overwrite the shared example before this one resolves.
      return new Promise((resolve) =>
        setTimeout(() => resolve({ status: 200, mock: value }), delay)
      );
    }
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
    if (request?.query?.principal === E2E_TRIGGER_UNKNOWN_PRINCIPAL) {
      return { status: 404, mock: {} };
    }
    const attributeResponse: { [name: string]: AttributeTestValue } = {};
    const selectArray: Array<string> = request?.query?.select as string[] || [];
    
    let i=0;
    
    selectArray.forEach(element => {
      
      switch(element) { 
        case "opentunti_desku": { 
          attributeResponse.opentunti_desku={
            role: "role",
            class: "class",
            classLevel: "classLevel",
            oid: "oid",
            schoolNumber: "school number",
            materialChargeSchool: "material charge school",
          }
           
          break; 
        } 
        case "onPremisesExtensionAttributes": { 
          attributeResponse.onPremisesExtensionAttributes=Object.fromEntries(
            Array.from({ length: 15 }, (_, n) => [`extensionAttribute${n + 1}`, ""])
          )
          
          break; 
        } 
        case "deepTestAttributes": { 
          // AttributeTest.tsx reads an attribute's content as a path into
          // this response, but only the path's root is sent in `select`
          // (getAttributeList), so the mock cannot tell how deep a path the
          // caller has configured. This root therefore serves a fixed deep
          // structure that exercises the recursive lookup: set an
          // attribute's content to "deepTestAttributes.level2.level3" for a
          // 3-level path, "deepTestAttributes.level2.level3Object.level4"
          // for a 4-level one, or "deepTestAttributes.level2" to see an
          // intermediate object rendered as JSON.
          attributeResponse.deepTestAttributes={
            level2: {
              level3: "test_value_depth_3",
              level3Object: { level4: "test_value_depth_4" },
            },
          }
          
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
    debugLog("testAttributesAuthorization",request.requestBody)
    if (request.requestBody?.clientId === E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE) {
      return { status: 403, mock: {} };
    }
    if (request.requestBody?.clientId === E2E_TRIGGER_ATTRIBUTE_TEST_UNAUTHORIZED) {
      return { status: 200, mock: false };
    }
    // Like the backend: true when authorized.
    return { status: 200, mock: true };
  },
  updateIntegration(request) {
    const errorResponse = triggerIntegrationSaveError(request.requestBody);
    if (errorResponse) return errorResponse;
    const id = Number(request.params.id);
    const index=allIntegrations.map(i=>i.id).indexOf(id);
    maskClientSecret(request.requestBody);
    if (index !== -1) {
      allIntegrations[index] = request.requestBody;
    }
    request.requestBody?.permissions?.forEach((p: Components.Schemas.IntegrationPermission)=>{
      p.lastUpdatedOn = new Date().toISOString();
    })
    saveIntegrations()
    updateIntegration.value = saveResponse(request.requestBody)
  },
  createIntegration(request) {
    const errorResponse = triggerIntegrationSaveError(request.requestBody);
    if (errorResponse) return errorResponse;
    const id = Math.max(9000000,...allIntegrations.map(i=>i.id!))+1;
    request.requestBody.id=id;
    const index=allIntegrations.map(i=>i.id).indexOf(id);
    // Masking here (not just on update) matters because index.tsx:350's
    // reminder check reads `newIntegration` - the client's own live editing
    // state, generated locally and never rewritten from this call's own
    // response - so masking the create response doesn't affect whether the
    // reminder shows the FIRST time. It's what a LATER, independent look at
    // this integration (e.g. reopening it for edit from its view page) sees
    // stored server-side, which is what makes a second save correctly not
    // show the reminder again.
    maskClientSecret(request.requestBody);
    if (index !== -1) {
      allIntegrations[index] = request.requestBody;
    } else {
      allIntegrations.push(request.requestBody)
    }
    request.requestBody?.permissions?.forEach((p: Components.Schemas.IntegrationPermission)=>{
      p.lastUpdatedOn = new Date().toISOString();
    })
    saveIntegrations()
    createIntegration.value = saveResponse(request.requestBody)
  },
  getIntegration(request) {
    const id = Number(request.params.id);
    integration.value = allIntegrations.find((row) => row.id === id);

    if (integration.value === undefined) {
      // Without this, IntegrationTab/index.tsx's error?.response?.status===404
      // branch (the "Integraatiota {id} ei löydy" message) never fires - the
      // mock previously always answered 200 with an empty body, leaving the
      // page stuck on its loading spinner forever for an unknown id. See
      // e2e/integration-detail-view.spec.ts's 404 test.
      return { status: 404, mock: {} };
    }

    // The fixture organization (with its schools) for integrations of the
    // fixture organization or without one. An integration stored with
    // another organization keeps it (e2e: an organization the mock user may
    // only view, integration-selection.spec.ts).
    const storedOid = integration.value.organization?.oid
    if (storedOid === undefined || storedOid === organisations.oid) {
      integration.value.organization = organisations
    }

    if(id===999995&&integration.value?.configurationEntity?.idp){
      integration.value.configurationEntity.idp.logoUrl="https://virkailija.testiopintopolku.fi/mpassid/api/v2/integration/discoveryinformation/logo/999995"
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
        gsuiteIdp.logoUrl="https://mpass-proxy.csc.fi/images/buttons/btn-mansikkala.png"
        gsuiteIdp.metadataUrl="https://mpass-proxy.csc.fi/idp_local_metadata/shib_mansikkala-metadata.xml"
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
  uploadLogo(request) {
    const id = Number(request.params.id);
    const found = allIntegrations.find((row) => row.id === id);
    if (found?.configurationEntity?.idp) {
      found.configurationEntity.idp.logoUrl = `https://virkailija.untuvaopintopolku.fi/mpassid/api/v2/integration/discoveryinformation/logo/${id}`;
      saveIntegrations()
    }
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
