package fi.mpass.voh.api.loading;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationPermission;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.Adfs;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.integration.idp.Gsuite;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class IdentityProviderLoader {
    private static final Logger logger = LoggerFactory.getLogger(IdentityProviderLoader.class);

    @Value("#{${application.home-organizations.input}}")
    private List<String> homeOrganizationsInput;

    IntegrationRepository integrationRepository;
    OrganizationService organizationService;
    ResourceLoader resourceLoader;
    InputStream inputStream;

    public IdentityProviderLoader(IntegrationRepository repository, OrganizationService organizationService,
            ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = organizationService;
        this.resourceLoader = loader;
        if (this.homeOrganizationsInput == null) {
            this.homeOrganizationsInput = Arrays.asList("home_organizations.json");
        }
    }

    public Loading init(Loading loading) {

        loading.setStatus(LoadingStatus.LOADING);

        List<Long> idpIds = this.integrationRepository.getAllIdpIds();
        logger.info("Number of existing idp integrations: {}", idpIds.size());

        for (String idpInput : this.homeOrganizationsInput) {
            ObjectMapper objectMapper = JsonMapper.builder()
                    .addModule(new JavaTimeModule())
                    .build();
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            if (inputStream == null) {
                try {
                    File file = ResourceUtils.getFile(idpInput);
                    logger.info("Reading idp integrations from {}", idpInput);
                    inputStream = new FileInputStream(file);
                } catch (FileNotFoundException e) {
                    logger.error("{} not found.", idpInput);
                    loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), idpInput + " not found");
                    inputStream = null;
                    continue;
                }
            }

            JsonNode rootNode = null;
            try {
                rootNode = (objectMapper.readTree(inputStream)).path("identityProviders");
            } catch (StreamReadException e) {
                logger.error("{} contains invalid content.", idpInput);
                loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), idpInput + " contains invalid content");
            } catch (IOException e) {
                logger.error("{} IO exception.", idpInput);
                loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), idpInput + " IO exception");
            }

            int integrationCount = 0;

            if (rootNode != null && rootNode.isArray()) {
                for (JsonNode arrayNode : rootNode) {
                    Integration integration = null;
                    try {
                        integration = objectMapper.readValue(arrayNode.toString(), Integration.class);
                    } catch (Exception e) {
                        logger.error("Integration exception: {}. Continuing to next.", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Read failed");

                        continue;
                    }

                    // an existing integration (active or inactive)
                    if (idpIds.contains(integration.getId())) {
                        List<IntegrationPermission> permissions = integration.getPermissions();
                        if (!permissions.isEmpty()) {
                            logger.info("Loaded integration #{} with permissions! Permissions might be not effective.",
                                    integration.getId());
                        }
                        Optional<Integration> existingIntegration = this.integrationRepository
                                .findByIdIdpAll(integration.getId());
                        if (existingIntegration.isPresent()) {
                            if (!existingIntegration.get().isActive()) {
                                logger.info("Reloading inactive integration #{}. Reactivating.",
                                        existingIntegration.get().getId());
                                existingIntegration.get().setStatus(0);
                            }

                            logger.debug("Comparing existing integration #{} version {} to #{} version {}",
                                    existingIntegration.get().getId(), existingIntegration.get().getVersion(),
                                    integration.getId(), integration.getVersion());

                            existingIntegration = applyUpdate(loading, integration, existingIntegration);
                            integration = existingIntegration.get();
                        }
                        idpIds.remove(integration.getId());
                    } else {
                        // a new idp integration
                        logger.debug("A new idp integration #{}", integration.getId());
                    }

                    Organization organization = new Organization();
                    if (integration.getOrganization() != null && integration.getOrganization().getOid() != null
                            && integration.getOrganization().getOid().length() > 0) {
                        logger.debug("Organization oid: {}", integration.getOrganization().getOid());
                        try {
                            organization = organizationService.getById(integration.getOrganization().getOid());
                        } catch (Exception ex) {
                            logger.error(
                                    "Organization cache lookup exception: {}. Continuing to next integration.",
                                    ex.toString());
                            loading.addIntegrationLoadingStatus(integration, "Organization cache lookup exception");
                            continue;
                        }
                        if (organization == null) {
                            try {
                                logger.debug(
                                        "A new integration organization: {}", integration.getOrganization().getOid());
                                organization = organizationService
                                        .retrieveOrganization(integration.getOrganization().getOid());
                            } catch (Exception ex) {
                                logger.error("Organization retrieval exception: {}. Continuing to next.",
                                        ex.toString());
                                loading.addIntegrationLoadingStatus(integration, "Organization retrieval exception");
                                continue;
                            }
                        }
                    }

                    try {
                        // No cascading, Integration:Organization
                        organization = organizationService.saveOrganization(organization);
                    } catch (Exception e) {
                        logger.error("Organization Exception: {}", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Organization caching exception");
                    }
                    integration.setOrganization(organization);

                    // check if existing permissions were found
                    if (integration.getPermissions().isEmpty()) {
                        IdentityProvider idp = integration.getConfigurationEntity().getIdp();
                        if (idp != null) {
                            JsonNode allowedNode = arrayNode.get("configurationEntity").get("idp")
                                    .get("allowedServiceProviders");
                            if (allowedNode != null) {
                                final Integration i = integration;
                                allowedNode.forEach(c -> {
                                    if (c.get("entityId") != null) {
                                        // find the corresponding integration set and make that set the allowed
                                        // integration
                                        Integration samlSp = integrationRepository
                                                .findByConfigurationEntitySpEntityId(c.get("entityId").asText());
                                        if (samlSp != null) {
                                            logger.debug("Allowed SAML SP: {}", samlSp);
                                            Set<Integration> integrationSet = samlSp.getIntegrationSets();
                                            // assuming that an SP can belong to only one set
                                            if (!integrationSet.isEmpty()) {
                                                Integration setIntegration = integrationSet.iterator().next();
                                                logger.debug("Set #{}", setIntegration.getId());
                                                i.addPermissionTo(setIntegration);
                                            }
                                        }
                                    }
                                    if (c.get("clientId") != null) {
                                        // find the corresponding integration set and make that set the allowed
                                        // integration
                                        Integration oidcRp = integrationRepository
                                                .findByConfigurationEntitySpClientId(c.get("clientId").asText());
                                        if (oidcRp != null) {
                                            logger.debug("Allowed OIDC RP: {}", oidcRp);
                                            Set<Integration> integrationSet = oidcRp.getIntegrationSets();
                                            // assuming that an RP can belong to only one set
                                            if (!integrationSet.isEmpty()) {
                                                Integration setIntegration = integrationSet.iterator().next();
                                                logger.debug("Set #{}", setIntegration.getId());
                                                i.addPermissionTo(setIntegration);
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }

                    try {
                        integrationRepository.save(integration);
                        integrationCount++;
                    } catch (Exception e) {
                        logger.error("Integration Exception: {}. Continuing to next.", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Save failed");
                    }
                }
            } else {
                logger.error("{} does not contain array.", idpInput);
                loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), idpInput + " does not contain array");
            }
            logger.info("Loaded/reloaded {} integrations.", integrationCount);
            inputStream = null;
        }

        logger.info("{} inactivated integrations.", idpIds.size());
        for (Long id : idpIds) {
            Optional<Integration> inactivatedIntegration = this.integrationRepository
                    .findByIdAll(id);
            if (inactivatedIntegration.isPresent()) {
                inactivatedIntegration.get().setStatus(1);
                try {
                    integrationRepository.save(inactivatedIntegration.get());
                } catch (Exception e) {
                    logger.error("Integration Exception: {}. Could not inactivate integration #{}", e,
                            inactivatedIntegration.get().getId());
                    loading.addIntegrationLoadingStatus(inactivatedIntegration.get(), "Inactivation failed");
                }
            }
        }

        if (loading.getIntegrationStatus().isEmpty()) {
            loading.setStatus(LoadingStatus.SUCCEEDED);
        } else {
            loading.setStatus(LoadingStatus.FAILED);
        }

        return loading;
    }

    private Optional<Integration> applyUpdate(Loading loading, Integration integration,
            Optional<Integration> existingIntegration) {

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareIdp(existingIntegration.get(),
                integration);

        if (diff != null) {
            List<Diff<?>> diffs = diff.getDiffs();
            for (int i = 0; i < diff.getNumberOfDiffs(); i++) {
                Diff<?> d = diffs.get(i);
                logger.debug("Integration #{} {}: {} != {}", existingIntegration.get().getId(),
                        d.getFieldName(), d.getLeft(), d.getRight());
                try {
                    if (d.getFieldName().contains("configurationEntity.attributes.")) {
                        existingIntegration = Optional
                                .of(updateAttribute(d, existingIntegration.get()));
                    } else {
                        // differences in the integration fields
                        IdentityProvider idp = existingIntegration.get().getConfigurationEntity()
                                .getIdp();
                        if (d.getFieldName().contains("configurationEntity.idp.flowName")) {
                            idp.setFlowName((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.idpId")) {
                            idp.setIdpId((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.logoUrl")) {
                            idp.setLogoUrl((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.entityId")) {
                            if (idp instanceof Azure) {
                                ((Azure) idp).setEntityId((String) d.getRight());
                            }
                            if (idp instanceof Adfs) {
                                ((Adfs) idp).setEntityId((String) d.getRight());
                            }
                            if (idp instanceof Gsuite) {
                                ((Gsuite) idp).setEntityId((String) d.getRight());
                            }
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.metadataUrl")) {
                            if (idp instanceof Azure) {
                                ((Azure) idp).setMetadataUrl((String) d.getRight());
                            }
                            if (idp instanceof Adfs) {
                                ((Adfs) idp).setMetadataUrl((String) d.getRight());
                            }
                            if (idp instanceof Gsuite) {
                                ((Gsuite) idp).setMetadataUrl((String) d.getRight());
                            }
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.tenantId")
                                && (idp instanceof Opinsys)) {
                            ((Opinsys) idp).setTenantId((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.hostname")
                                && (idp instanceof Wilma)) {
                            ((Wilma) idp).setHostname((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.institutionTypes")
                                && (d.getRight() instanceof Set)) {
                            idp.setInstitutionTypes((Set<Integer>) d.getRight());
                        }

                        if (d.getFieldName().contains("discoveryInformation.title")) {
                            existingIntegration.get().getDiscoveryInformation()
                                    .setTitle((String) d.getRight());
                        }
                        if (d.getFieldName().contains("discoveryInformation.customDisplayName")) {
                            existingIntegration.get().getDiscoveryInformation()
                                    .setCustomDisplayName((String) d.getRight());
                        }
                        if (d.getFieldName().contains("discoveryInformation.showSchools")) {
                            existingIntegration.get().getDiscoveryInformation()
                                    .setShowSchools((boolean) d.getRight());
                        }
                        if (d.getFieldName().contains("discoveryInformation.schools")) {
                            logger.debug("diff in discoveryInformation.schools: " + d.getRight());
                            if (d.getRight() instanceof Set) {
                                existingIntegration.get().getDiscoveryInformation()
                                        .setSchools((Set<String>) d.getRight());
                            }
                        }
                        if (d.getFieldName().contains("discoveryInformation.excludedSchools")) {
                            logger.debug(
                                    "diff in discoveryInformation.excludedSchools: "
                                            + d.getRight());
                            existingIntegration.get().getDiscoveryInformation()
                                    .setExcludedSchools((Set<String>) d.getRight());
                        }

                        if (d.getFieldName().contains("organization.oid")) {
                            if (existingIntegration.get().getOrganization() != null) {
                                existingIntegration.get().getOrganization()
                                        .setOid((String) d.getRight());
                            } else {
                                Organization org = new Organization("", (String) d.getRight());
                                existingIntegration.get().setOrganization(org);
                            }
                        }
                        if (d.getFieldName().contains("deploymentPhase")) {
                            existingIntegration.get().setDeploymentPhase((Integer) d.getRight());
                        }
                    }
                } catch (Exception e) {
                    logger.error(
                            "Error in updating integration #{}: {}", existingIntegration.get().getId(), e.toString());
                    loading.addIntegrationLoadingStatus(existingIntegration.get(), "Update failed");
                }
            }
        } else {
            logger.error("Comparison failed. Check input data structure and values.");
            loading.addIntegrationLoadingStatus(integration, "Comparison failed");
        }
        return existingIntegration;
    }

    private Integration updateAttribute(Diff<?> d, Integration existingIntegration) {
        String[] diffElements = d.getFieldName().split("\\.");
        // configurationEntity.attributes.<name>
        // configurationEntity.attributes.<name>.type
        // configurationEntity.attributes.<name>.content
        // existing = left = "", input = right != ""
        // 1. a new attribute (with a new value) has been added to the integration
        // context
        if ("".equals(d.getLeft()) && !"".equals(d.getRight())) {
            logger.debug("Attribute add diff: " + d.getFieldName());
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
            logger.debug("Attribute mod diff: " + d.getFieldName());
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingIntegration.getConfigurationEntity()
                        .getAttributes().iterator(); attrIterator.hasNext();) {
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
        // existing = left != "", input = right == ""
        // 3. the existing attribute has been removed from the input in the integration
        // context
        if (!"".equals(d.getLeft()) && "".equals(d.getRight())) {
            logger.debug("Attribute del diff: " + d.getFieldName());
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

    public void setInput(String location) throws IOException {
        this.homeOrganizationsInput = new ArrayList<>();
        this.homeOrganizationsInput.add(location);
        Resource resource = resourceLoader.getResource("classpath:" + location);
        this.inputStream = resource.getInputStream();
    }
}