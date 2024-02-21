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
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.sp.SamlServiceProvider;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class ServiceProviderLoader {
    private static final Logger logger = LoggerFactory.getLogger(ServiceProviderLoader.class);

    @Value("#{${application.service-providers.input}}")
    private List<String> serviceProvidersInput;

    IntegrationRepository integrationRepository;
    OrganizationService organizationService;
    ResourceLoader resourceLoader;
    InputStream inputStream;

    public ServiceProviderLoader(IntegrationRepository repository, OrganizationService organizationService,
            ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = organizationService;
        this.resourceLoader = loader;
        if (this.serviceProvidersInput == null) {
            this.serviceProvidersInput = Arrays.asList("services.json");
        }
    }

    /**
     * Loads ServiceProviders from the given, configurable resource (a list of
     * inputs).
     */
    public Loading init(Loading loading) {

        loading.setStatus(LoadingStatus.LOADING);

        List<Long> spIds = integrationRepository.getAllSpIds();
        logger.info("Number of existing sp integrations: {}", spIds.size());

        for (String spInput : this.serviceProvidersInput) {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            if (inputStream == null) {
                try {
                    File file = ResourceUtils.getFile(spInput);
                    logger.info("Reading sp integrations from {}", spInput);
                    inputStream = new FileInputStream(file);
                } catch (FileNotFoundException e) {
                    logger.error("{} not found.", spInput);
                    loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), spInput + " not found");
                    inputStream = null;
                    continue;
                }
            }

            JsonNode rootNode = null;
            try {
                rootNode = (objectMapper.readTree(inputStream)).path("services");
            } catch (StreamReadException e) {
                logger.error("{} contains invalid content.", spInput);
                loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)),
                        spInput + " contains invalid content");
            } catch (IOException e) {
                logger.error("{} IO exception.", spInput);
                loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), spInput + " IO exception");
            }

            int serviceProviderCount = 0;

            if (rootNode != null && rootNode.isArray()) {
                for (JsonNode arrayNode : rootNode) {
                    Integration integration = null;
                    try {
                        integration = new ObjectMapper()
                                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                                .readValue(arrayNode.toString(), Integration.class);
                    } catch (Exception e) {
                        logger.error(
                                "Integration exception: {}. Continuing to next.", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Read failed");
                        continue;
                    }

                    // update the associations of the input integration to integration sets
                    JsonNode groupArrayNode = arrayNode.get("integrationGroups");
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
                                    loading.addIntegrationLoadingStatus(integration,
                                            "Integration set #{}" + groupNode.get("id") + " not found");
                                }
                            } else {
                                logger.error("Integration #{}: integration set object identifier not found",
                                        integration.getId());
                                loading.addIntegrationLoadingStatus(integration, "Integration #" + integration.getId()
                                        + ": integration set object identifier not found");
                            }
                        }
                    }

                    // an existing integration (active or inactive)
                    if (spIds.contains(integration.getId())) {
                        Optional<Integration> existingIntegration;
                        try {
                            existingIntegration = this.integrationRepository
                                    .findByIdAll(integration.getId());
                        } catch (Exception e) {
                            logger.error("Error in finding existing integration #{}. Exception {}", integration.getId(),
                                    e.toString());
                            continue;
                        }

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
                        spIds.remove(integration.getId());
                    } else {
                        // a new sp integration
                        logger.debug("A new sp integration #{}", integration.getId());
                    }

                    Organization organization = new Organization();
                    if (integration.getOrganization().getOid() != null
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
                    try {
                        integrationRepository.save(integration);
                        for (Integration set : integration.getIntegrationSets()) {
                            integrationRepository.save(set);
                        }
                        serviceProviderCount++;
                    } catch (Exception e) {
                        logger.error("Integration Exception: {}. Continuing to next.", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Save failed");
                    }
                }
            } else {
                logger.error("{} does not contain array.", spInput);
                loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)),
                        spInput + " does not contain array");
            }
            logger.info("Loaded/reloaded {} integrations.", serviceProviderCount);
            inputStream = null;
        }
        
        logger.info("{} inactivated integrations.", spIds.size());
        for (Long id : spIds) {
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

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareSp(existingIntegration.get(),
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
                        if (d.getFieldName().contains("configurationEntity.sp.name")) {
                            existingIntegration.get().getConfigurationEntity().getSp()
                                    .setName(d.getRight().toString());
                        }
                        if (d.getFieldName().contains("organization.oid")) {
                            if (existingIntegration.get().getOrganization() != null) {
                                existingIntegration.get().getOrganization()
                                        .setOid(d.getRight().toString());
                            } else {
                                Organization org = new Organization("", d.getRight().toString());
                                existingIntegration.get().setOrganization(org);
                            }
                        }
                        if (d.getFieldName().contains("configurationEntity.sp.entityId")) {
                            ((SamlServiceProvider) existingIntegration.get()
                                    .getConfigurationEntity()
                                    .getSp()).setEntityId(d.getRight().toString());
                        }
                        if (d.getFieldName().contains("configurationEntity.sp.clientId")) {
                            ((OidcServiceProvider) existingIntegration.get()
                                    .getConfigurationEntity()
                                    .getSp()).setClientId(d.getRight().toString());
                        }
                        if (d.getFieldName().contains("configurationEntity.sp.metadata")) {
                            existingIntegration = Optional
                                    .of(updateMetadata(d, existingIntegration.get()));
                        }
                        if (d.getFieldName().contains("integrationSets")) {
                            logger.debug("Integration set diff");
                            List<Integration> removedSets = existingIntegration.get()
                                    .removeFromSets();
                            for (Integration set : removedSets) {
                                logger.debug("Unassociated set " + set.getId());
                                integrationRepository.save(set);
                            }
                            for (Integration set : integration.getIntegrationSets()) {
                                existingIntegration.get().addToSet(set);
                            }
                        }
                        if (d.getFieldName().contains("deploymentPhase")) {
                            existingIntegration.get().setDeploymentPhase((Integer) d.getRight());
                        }
                    }
                } catch (Exception e) {
                    logger.error(
                            "Error in updating integration #" + existingIntegration.get().getId()
                                    + ": " + e);
                    loading.addIntegrationLoadingStatus(existingIntegration.get(), "Update failed");
                }
            }
        } else {
            logger.debug("Comparison failed. Check input data structure and values.");
            loading.addIntegrationLoadingStatus(integration, "Comparison failed");
        }
        return existingIntegration;
    }

    private Integration updateMetadata(Diff<?> d, Integration existingIntegration) {
        String[] diffElements = d.getFieldName().split("\\.");
        if (d.getLeft().equals("") && !d.getRight().equals("")) {
            logger.debug("Metadata add diff: " + d.getFieldName());
            if (diffElements[3].length() > 0) {
                Map<String, Object> metadata = existingIntegration.getConfigurationEntity().getSp().getMetadata();
                metadata.put(diffElements[3], d.getRight());
                existingIntegration.getConfigurationEntity().getSp().setMetadata(metadata);
            }
        }
        if (!d.getLeft().equals("") && d.getRight() != null && !d.getRight().equals("")
                && !d.getLeft().equals(d.getRight())) {
            logger.debug("Metadata mod diff: " + d.getFieldName());
            if (diffElements[3].length() > 0) {
                Map<String, Object> metadata = existingIntegration.getConfigurationEntity().getSp().getMetadata();
                metadata.put(diffElements[3], d.getRight());
                existingIntegration.getConfigurationEntity().getSp().setMetadata(metadata);
            }
        }
        if (!d.getLeft().equals("") && (d.getRight() == null || (d.getRight() != null && d.getRight().equals("")))) {
            logger.debug("Metadata del diff: " + d.getFieldName());
            if (diffElements[3].length() > 0) {
                Map<String, Object> metadata = existingIntegration.getConfigurationEntity().getSp().getMetadata();
                metadata.remove(diffElements[3]);
                existingIntegration.getConfigurationEntity().getSp().setMetadata(metadata);
            }
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
        if (d.getLeft().equals("") && !d.getRight().equals("")) {
            logger.debug("Add diff: " + d.getFieldName());
            Set<Attribute> existingAttributes = existingIntegration.getConfigurationEntity().getAttributes();
            // name
            if (diffElements.length == 3) {
                Attribute newAttr = new Attribute();
                newAttr.setConfigurationEntity(existingIntegration.getConfigurationEntity());
                newAttr.setName(d.getRight().toString());
                existingAttributes.add(newAttr);
            }
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingAttributes.iterator(); attrIterator.hasNext();) {
                    Attribute attr = attrIterator.next();
                    if (attr.getName().equals(diffElements[2])) {
                        if (diffElements[3].equals("type")) {
                            attr.setType(d.getRight().toString());
                        }
                        if (diffElements[3].equals("content")) {
                            attr.setContent(d.getRight().toString());
                        }
                    }
                }
            }
        }
        // (existing = left) != (input = right)
        // 2. the value has been changed
        if (!d.getLeft().equals("") && !d.getRight().equals("")
                && !d.getLeft().equals(d.getRight())) {
            logger.debug("Attribute mod diff: " + d.getFieldName());
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingIntegration.getConfigurationEntity()
                        .getAttributes().iterator(); attrIterator.hasNext();) {
                    Attribute attr = attrIterator.next();
                    if (attr.getName().equals(diffElements[2])) {
                        if (diffElements[3].equals("type")) {
                            attr.setType(d.getRight().toString());
                        }
                        if (diffElements[3].equals("content")) {
                            attr.setContent(d.getRight().toString());
                        }
                        // update the attribute set
                        existingIntegration.getConfigurationEntity().getAttributes()
                                .remove(attr);
                        existingIntegration.getConfigurationEntity().getAttributes()
                                .add(attr);
                    }
                }
            }
        }
        // existing = left != "", input = right == ""
        // 3. the existing attribute has been removed from the input in the integration
        // context
        if (!d.getLeft().equals("") && d.getRight().equals("")) {
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
        this.serviceProvidersInput = new ArrayList<>();
        this.serviceProvidersInput.add(location);
        Resource resource = resourceLoader.getResource("classpath:" + location);
        this.inputStream = resource.getInputStream();
    }
}
