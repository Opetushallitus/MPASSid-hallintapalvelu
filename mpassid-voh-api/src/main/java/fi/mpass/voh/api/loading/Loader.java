package fi.mpass.voh.api.loading;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.apache.commons.lang3.builder.Diff;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

public class Loader {
    private static final Logger logger = LoggerFactory.getLogger(Loader.class);

    @Value("${application.attribute.credential.name.field:clientId}")
    protected String credentialAttributeNameField = "clientId";
    @Value("${application.attribute.credential.value.field:clientKey}")
    protected String credentialAttributeValueField = "clientKey";

    @Value("${application.metadata.credential.name.field:client_id}")
    protected String credentialMetadataNameField = "client_id";
    @Value("${application.metadata.credential.value.field:client_secret}")
    protected String credentialMetadataValueField = "client_secret";

    @Value("${application.integration.input.max.removal.number}")
    protected Integer maxRemovalNumber;

    IntegrationRepository integrationRepository;
    OrganizationService organizationService;
    CredentialService credentialService;
    ResourceLoader resourceLoader;
    InputStream inputStream;

    public Loader(IntegrationRepository repository, OrganizationService organizationService,
            CredentialService credentialService,
            ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = organizationService;
        this.credentialService = credentialService;
        this.resourceLoader = loader;

        if (this.maxRemovalNumber == null) {
            this.maxRemovalNumber = 10;
        }
    }

    public Integer getMaxRemovalNumber() {
        return maxRemovalNumber;
    }

    public void setMaxRemovalNumber(Integer maxRemovalNumber) {
        this.maxRemovalNumber = maxRemovalNumber;
    }

    protected Map<Integer, List<Long>> processNodes(Loading loading, JsonNode rootNode, boolean precheck) {
        List<Long> processedIntegrationIds = new ArrayList<>();
        int deploymentPhase = -1;
        if (rootNode != null && rootNode.isArray()) {
            for (JsonNode arrayNode : rootNode) {
                Integration integration = null;
                try {
                    ObjectMapper objectMapper = JsonMapper.builder()
                            .addModule(new JavaTimeModule())
                            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                            .build();
                    integration = objectMapper.readValue(arrayNode.toString(), Integration.class);
                } catch (Exception e) {
                    logger.error(
                            "Integration exception: {}. Continuing to next.", e.toString());
                    loading.addError(integration, "Read failed");
                    break;
                }

                if (validIntegration(loading, integration)) {

                    if (deploymentPhase == -1) {
                        deploymentPhase = integration.getDeploymentPhase();
                    }
                    integration = updateSetAssociations(loading, arrayNode, integration);
                    integration = updateExistingIntegration(loading, integration);
                    integration = updateIntegrationOrganization(loading, integration, precheck, false);
                    integration = updateIntegrationTypeSpecificInformation(loading, integration);
                    if (integration != null) {
                        try {
                            if (!precheck) {
                                logger.debug("Saving integration #{}", integration.getId());
                                integrationRepository.save(integration);
                            }
                            processedIntegrationIds.add(integration.getId());
                        } catch (Exception e) {
                            logger.error("Integration #{} save failed. Exception: {}.",
                                    integration.getId(), e.toString());
                            loading.addError(integration, "Save failed");
                        }
                    }
                } else {
                    logger.error("Integration #{} validation failed.", integration.getId());
                    loading.addError(integration, "Validation failed");
                    break;
                }
            }
        } else {
            logger.error("Input failed or does not contain array.");
            loading.addError(Long.valueOf(0), "Input failed or does not contain array");
        }
        HashMap<Integer, List<Long>> map = new HashMap<>();
        map.put(deploymentPhase, processedIntegrationIds);
        return map;
    }

    protected Integration updateIntegrationTypeSpecificInformation(Loading loading, Integration integration) {
        // set EntraId identity provider tenantId according to the tenantId attribute
        if (integration != null && integration.getConfigurationEntity() != null
                && integration.getConfigurationEntity().getAttributes() != null) {
            if (integration.getConfigurationEntity().getIdp() instanceof Azure) {
                Azure idp = (Azure) integration.getConfigurationEntity().getIdp();
                Set<Attribute> attributes = idp.getConfigurationEntity().getAttributes();
                for (Iterator<Attribute> it = attributes.iterator(); it.hasNext();) {
                    Attribute attribute = it.next();
                    if (attribute.getName().equals("tenantId")) {
                        logger.debug("Integration #{} EntraId tenantId: {}", integration.getId(),
                                attribute.getContent());
                        idp.setTenantId(attribute.getContent());
                        integration.getConfigurationEntity().setIdp(idp);
                        break;
                    }
                }
            }
        }
        return integration;
    }

    protected void inactivateIntegrations(Loading loading, List<Long> removedIds) {
        for (Long id : removedIds) {
            Optional<Integration> inactivatedIntegration = this.integrationRepository
                    .findByIdAll(id);
            if (inactivatedIntegration.isPresent()) {
                inactivatedIntegration.get().setStatus(1);
                try {
                    integrationRepository.save(inactivatedIntegration.get());
                    logger.debug("Inactivated integration #{}", inactivatedIntegration.get().getId());
                } catch (Exception e) {
                    logger.error("Integration Exception: {}. Could not inactivate integration #{}", e,
                            inactivatedIntegration.get().getId());
                    loading.addError(inactivatedIntegration.get(), "Inactivation failed");
                }
            }
        }
    }

    protected boolean validIntegration(Loading loading, Integration integration) {
        // validate integration identifier
        if (integration != null) {
            if (integration.getId() == null) {
                logger.error("Integration identifier missing");
                loading.addError(Long.valueOf(0), "Integration identifier missing");
                return false;
            }

            // validate integration organization oid if it exists
            if (integration.getOrganization() != null) {
                if (integration.getOrganization().getOid().length() < 256) {
                    String oidRegex = "[0-2](\\.([0-9]*))+";
                    Pattern p = Pattern.compile(oidRegex);
                    Matcher m = p.matcher(integration.getOrganization().getOid());
                    boolean b = m.matches();
                    if (!b) {
                        logger.error("Integration #{} organization oid is not valid", integration.getId());
                        loading.addError(integration, "Not valid organization oid");
                        return false;
                    }
                } else {
                    logger.error("Integration #{} organization oid maximum length exceeded", integration.getId());
                    loading.addError(integration, "Organization oid maximum length exceeded");
                    return false;
                }
            } // integration without organization allowed
        } else
            return false;
        return true;
    }

    protected Integration updateIntegrationOrganization(Loading loading, Integration integration, boolean precheck,
            boolean refresh) {
        Organization organization = new Organization();
        if (integration.getOrganization() != null && integration.getOrganization().getOid() != null
                && integration.getOrganization().getOid().length() > 0) {
            logger.debug("Integration #{} organization oid: {}. [{},{}]", integration.getId(),
                    integration.getOrganization().getOid(), precheck, refresh);
            if (!refresh) {
                try {
                    organization = organizationService.getById(integration.getOrganization().getOid());
                } catch (Exception ex) {
                    logger.error("Organization cache lookup exception: {}. [{},{}]", ex, precheck, refresh);
                    loading.addError(integration, "Organization cache lookup exception");
                    return null;
                }
            } else {
                organization = null;
            }
            if (organization == null) {
                try {
                    logger.debug(
                            "Retrieving integration #{} organization {}. [{},{}]", integration.getId(),
                            integration.getOrganization().getOid(), precheck, refresh);
                    organization = organizationService
                            .retrieveOrganization(integration.getOrganization().getOid());
                } catch (Exception ex) {
                    logger.error("Organization retrieval exception: {}. [{},{}]", ex, precheck, refresh);
                    loading.addError(integration, "Organization retrieval exception");
                    return null;
                }
            }
        }

        if (!precheck) {
            try {
                // No cascading, Integration:Organization
                if (organization != null && organization.getOid() != null) {
                    organization = organizationService.saveOrganization(organization);
                    integration.setOrganization(organization);
                }
            } catch (Exception e) {
                logger.error("Organization caching exception: {}. [{},{}]", e, precheck, refresh);
                loading.addError(integration, "Organization caching exception");
            }
        }
        return integration;
    }

    protected Integration updateIntegrationOrganization(Loading loading, Integration existingIntegration, String oid,
            boolean precheck, boolean refresh) {
        Organization organization = new Organization();
        if (existingIntegration != null && oid != null && oid.length() > 0) {
            logger.debug("Updating integration #{} to organization oid: {}. [{},{}]", existingIntegration.getId(),
                    oid, precheck, refresh);
            if (!refresh) {
                try {
                    organization = organizationService.getById(oid);
                } catch (Exception ex) {
                    logger.error("Organization cache lookup exception: {}. [{},{}]", ex, precheck, refresh);
                    loading.addError(existingIntegration, "Organization cache lookup exception");
                    return null;
                }
            } else {
                organization = null;
            }
            if (organization == null) {
                try {
                    logger.debug(
                            "Retrieving organization {}. [{},{}]", oid, precheck, refresh);
                    organization = organizationService.retrieveOrganization(oid);
                } catch (Exception ex) {
                    logger.error("Organization retrieval exception: {}. [{},{}]", ex, precheck, refresh);
                    loading.addError(existingIntegration, "Organization retrieval exception");
                    return null;
                }
            }
        }

        if (!precheck) {
            try {
                // No cascading, Integration:Organization
                if (existingIntegration != null && organization != null && organization.getOid() != null) {
                    if (refresh)
                        organization = organizationService.saveOrganization(organization);
                    existingIntegration.setOrganization(organization);
                }
            } catch (Exception e) {
                logger.error("Organization caching exception: {}. [{},{}]", e, precheck, refresh);
                loading.addError(existingIntegration, "Organization caching exception");
            }
        }
        return existingIntegration;
    }

    public Integration updateExistingIntegration(Loading loading, Integration integration) {
        Optional<Integration> existingIntegration = this.integrationRepository
                .findByIdAll(integration.getId());
        // an existing integration (active or inactive)
        if (existingIntegration.isPresent()) {
            if (!existingIntegration.get().isActive()) {
                logger.info("Reloading inactive integration #{}. Reactivating.",
                        existingIntegration.get().getId());
                existingIntegration.get().setStatus(0);
                existingIntegration.get().setLastUpdatedOn(LocalDateTime.now());
            }

            existingIntegration = applyUpdate(loading, integration, existingIntegration);
            integration = existingIntegration.get();
        }

        return integration;
    }

    protected Optional<Integration> applyUpdate(Loading loading, Integration integration,
            Optional<Integration> existingIntegration) {
        return Optional.empty();
    }

    /**
     * 
     * Adds, updates, removes an attribute of the existing integration.
     * 
     * If the attribute name is clientId or clientKey, start credentials management.
     * 
     * @param d                   an attribute difference
     * @param existingIntegration existing integration
     * @return the existing integration with the updated attribute
     */
    protected Integration updateAttribute(Diff<?> d, Integration existingIntegration) {
        String[] diffElements = d.getFieldName().split("\\.");
        // configurationEntity.attributes.<name>
        // configurationEntity.attributes.<name>.type
        // configurationEntity.attributes.<name>.content
        // existing = left = "", input = right != ""
        // 1. a new attribute (with a new value) has been added to the integration
        // context
        if ("".equals(d.getLeft()) && !"".equals(d.getRight())) {
            logger.debug("Attribute add diff: {}", d.getFieldName());
            Set<Attribute> existingAttributes = existingIntegration.getConfigurationEntity().getAttributes();
            // name
            if (diffElements.length == 3) {
                Attribute newAttr = new Attribute();
                newAttr.setConfigurationEntity(existingIntegration.getConfigurationEntity());
                newAttr.setName((String) d.getRight());
                existingAttributes.add(newAttr);
            }
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingAttributes.iterator(); attrIterator.hasNext();) {
                    Attribute attr = attrIterator.next();
                    if (attr.getName().equals(diffElements[2])) {
                        if (diffElements[3].equals("type")) {
                            attr.setType((String) d.getRight());
                        }
                        if (diffElements[3].equals("content")) {
                            attr.setContent((String) d.getRight());
                        }
                    }
                }
            }
        }
        // (existing = left) != (input = right)
        // 2. the value has been changed
        if (!"".equals(d.getLeft()) && !"".equals(d.getRight())
                && !d.getLeft().equals(d.getRight())) {
            logger.debug("Attribute mod diff: {}", d.getFieldName());
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingIntegration.getConfigurationEntity()
                        .getAttributes().iterator(); attrIterator.hasNext();) {
                    Attribute attr = attrIterator.next();
                    if (attr.getName().equals(diffElements[2])) {
                        if (attr.getName().equals(credentialAttributeNameField)) {
                            credentialService.updateOidcCredential(existingIntegration, attr.getName(), d.getRight());
                        }
                        if (attr.getName().equals(credentialAttributeValueField)) {
                            credentialService.updateOidcCredential(existingIntegration, attr.getName(), d.getRight());
                        }
                        if (diffElements[3].equals("type")) {
                            attr.setType((String) d.getRight());
                        }
                        if (diffElements[3].equals("content")) {
                            attr.setContent((String) d.getRight());
                        }
                    }
                }
            }
        }
        // existing = left != "", input = right == ""
        // 3. the existing attribute has been removed from the input in the integration
        // context
        if (!"".equals(d.getLeft()) && "".equals(d.getRight())) {
            logger.debug("Attribute del diff: {}", d.getFieldName());
            for (Iterator<Attribute> attributeIterator = existingIntegration
                    .getConfigurationEntity()
                    .getAttributes().iterator(); attributeIterator.hasNext();) {
                Attribute attr = attributeIterator.next();
                if (attr.getName().equals(diffElements[2])) {
                    attr.setConfigurationEntity(null);
                    attributeIterator.remove();
                }
            }
        }

        return existingIntegration;
    }

    private Integration updateSetAssociations(Loading loading, JsonNode integrationNode, Integration integration) {
        // update the associations of the input integration to integration sets
        JsonNode groupArrayNode = integrationNode.get("integrationGroups");
        if (groupArrayNode != null && groupArrayNode.isArray()) {
            for (JsonNode groupNode : groupArrayNode) {
                if (groupNode.get("id") != null) {
                    Optional<Integration> integrationSet = integrationRepository
                            .findByIdAll(groupNode.get("id").asLong());
                    if (integrationSet.isPresent()) {
                        integrationSet.get().getConfigurationEntity().getSet().setType("sp");
                        integration.addToSet(integrationSet.get());
                        logger.debug("Integration set #{} size: {}", groupNode.get("id"),
                                integrationSet.get().getIntegrationSets().size());
                    } else {
                        logger.error("Integration set #{} not found", groupNode.get("id"));
                        loading.addError(integration,
                                "Integration set #" + groupNode.get("id") + " not found");
                    }
                } else {
                    logger.error("Integration #{}: integration set object identifier not found",
                            integration.getId());
                    loading.addError(integration, "Integration #" + integration.getId()
                            + ": integration set object identifier not found");
                }
            }
        }
        return integration;
    }

    protected boolean duplicates(Loading loading, Map<Integer, List<Long>> preProcessed) {
        // check for duplicate integrations
        int deploymentPhase = (int) preProcessed.keySet().toArray()[0];
        Set<Long> identifiers = new HashSet<>();
        List<Long> duplicates = preProcessed.get(deploymentPhase).stream()
                .filter(i -> !identifiers.add(i))
                .collect(Collectors.toList());
        if (!duplicates.isEmpty()) {
            logger.error("Input contains {} duplicate integrations: {}", duplicates.size(), duplicates);
            loading.addError(Long.valueOf(0),
                    "Input contains " + duplicates.size() + " duplicate integrations: " + duplicates);
            return true;
        }
        return false;
    }
}
