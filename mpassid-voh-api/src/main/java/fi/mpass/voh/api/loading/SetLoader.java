package fi.mpass.voh.api.loading;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

@Component
public class SetLoader {
    private static final Logger logger = LoggerFactory.getLogger(SetLoader.class);

    @Value("#{${application.integration-sets.input}}")
    private List<String> integrationSetInput;

    @Value("${application.integration-sets.input.max.removal.number}")
    private Integer maxRemovalNumber;

    IntegrationRepository integrationRepository;
    OrganizationService organizationService;
    ResourceLoader resourceLoader;
    InputStream inputStream;

    public SetLoader(IntegrationRepository repository, OrganizationService organizationService,
            ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = organizationService;
        this.resourceLoader = loader;
        if (this.integrationSetInput == null) {
            this.integrationSetInput = Arrays.asList("set/integration_sets.json");
        }
        if (this.maxRemovalNumber == null) {
            this.maxRemovalNumber = 10;
        }
    }

    /**
     * Loads integration sets from the given, configurable resource (a list of
     * inputs).
     */
    public Loading init(Loading loading) {

        loading.setStatus(LoadingStatus.LOADING);

        for (String setInput : this.integrationSetInput) {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            if (inputStream == null) {
                try {
                    File file = ResourceUtils.getFile(setInput);
                    logger.info("Reading integrations from {}", setInput);
                    inputStream = new FileInputStream(file);
                } catch (FileNotFoundException e) {
                    logger.error("{} not found.", setInput);
                    loading.addIntegrationLoadingStatus(new Integration(Long.valueOf(0)), setInput + " not found");
                    inputStream = null;
                    continue;
                }
            }

            JsonNode preRootNode = null;
            JsonNode rootNode = null;
            try {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                inputStream.transferTo(baos);
                InputStream preInputStream = new ByteArrayInputStream(baos.toByteArray());
                InputStream actualInputStream = new ByteArrayInputStream(baos.toByteArray());

                preRootNode = (objectMapper.readTree(preInputStream)).path("integrationGroups");
                rootNode = (objectMapper.readTree(actualInputStream)).path("integrationGroups");
                /*
                 * preRootNode = (objectMapper.readTree(preInputStream));
                 * rootNode = (objectMapper.readTree(actualInputStream));
                 */

            } catch (StreamReadException e) {
                logger.error("{} contains invalid content.", setInput);
                loading.addIntegrationLoadingStatus(Long.valueOf(0),
                        setInput + " contains invalid content");
            } catch (IOException e) {
                logger.error("{} IO exception.", setInput);
                loading.addIntegrationLoadingStatus(Long.valueOf(0), setInput + " IO exception");
            }

            // precheck for, e.g., the number of removed integrations
            Loading preLoading = new Loading();
            Map<Integer, List<Long>> preProcessed = processNodes(preLoading, preRootNode, true);

            if (preProcessed.keySet().isEmpty()) {
                logger.error("Preprocessing input {} failed.", setInput);
                continue;
            }

            int deploymentPhase = (int) preProcessed.keySet().toArray()[0];
            List<Long> existingIds = integrationRepository.getAllSetIdsByDeploymentPhase(deploymentPhase);
            logger.info("Number of existing set integrations in deployment phase {}: {}", deploymentPhase,
                    existingIds.size());

            List<Long> preRemovedIds = new ArrayList<>(existingIds);
            if (preRemovedIds.removeAll(preProcessed.get(deploymentPhase))) {
                logger.info("Prechecking {} inactivated integrations.", preRemovedIds.size());
                if (preRemovedIds.size() > this.maxRemovalNumber) {
                    logger.error("Maximum number of removals ({}) exceeded. Skipping input from {}",
                            this.maxRemovalNumber, setInput);
                    loading.addIntegrationLoadingStatus(Long.valueOf(0),
                            "Maximum number of removals exceeded. Skipping input.");
                    continue;
                }
            }

            Map<Integer, List<Long>> processed = processNodes(loading, rootNode, false);

            logger.info("Loaded/reloaded {} integrations in deployment phase {}", processed.size(), deploymentPhase);
            inputStream = null;

            List<Long> removedIds = new ArrayList<>(existingIds);
            if (removedIds.removeAll(processed.get(deploymentPhase))) {
                logger.info("{} inactivated integrations in deployment phase {}", removedIds.size(), deploymentPhase);
                inactivateIntegrations(loading, removedIds);
            }
        }

        if (loading.getIntegrationStatus().isEmpty()) {
            loading.setStatus(LoadingStatus.SUCCEEDED);
        } else {
            loading.setStatus(LoadingStatus.FAILED);
        }

        return loading;
    }

    private void inactivateIntegrations(Loading loading, List<Long> removedIds) {
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
                    loading.addIntegrationLoadingStatus(inactivatedIntegration.get(), "Inactivation failed");
                }
            }
        }
    }

    /*
     * Filters out other integrations than the specified by the deploymentPhase
     * argument.
     * If precheck is enabled/true, updates are not persistent.
     */
    private List<Long> processNodes(Loading loading, JsonNode rootNode, boolean precheck, int deploymentPhase) {
        List<Long> processedIntegrationIds = new ArrayList<>();
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

                // if (integration.getDeploymentPhase() == deploymentPhase) {
                integration = updateExistingIntegration(loading, integration);
                integration = updateIntegrationOrganization(loading, integration, precheck);
                if (integration != null) {
                    try {
                        if (!precheck)
                            integrationRepository.save(integration);
                        processedIntegrationIds.add(integration.getId());
                    } catch (Exception e) {
                        logger.error("Integration Exception: {}. Continuing to next.", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Save failed");
                    }
                }
                /*
                 * } else {
                 * logger.info("Incorrect deployment phase for integration #{}",
                 * integration.getId());
                 * loading.addIntegrationLoadingStatus(integration,
                 * "Incorrect deployment phase");
                 * }
                 */
            }
        } else {
            logger.error("Input does not contain array.");
            loading.addIntegrationLoadingStatus(Long.valueOf(0), "Input does not contain array");
        }
        return processedIntegrationIds;
    }

    /*
     * Returns a map associating deploymentPhase and a respective list of processed
     * integration identifiers.
     * The deploymentPhase is inferred from the first integration from the input.
     * If precheck is enabled/true, updates are not persistent.
     */
    private Map<Integer, List<Long>> processNodes(Loading loading, JsonNode rootNode, boolean precheck) {
        List<Long> processedIntegrationIds = new ArrayList<>();
        int deploymentPhase = -1;
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

                if (deploymentPhase == -1) {
                    deploymentPhase = integration.getDeploymentPhase();
                }
                integration = updateExistingIntegration(loading, integration);
                integration = updateIntegrationOrganization(loading, integration, precheck);
                if (integration != null) {
                    try {
                        if (!precheck)
                            integrationRepository.save(integration);
                        processedIntegrationIds.add(integration.getId());
                    } catch (Exception e) {
                        logger.error("Integration Exception: {}. Continuing to next.", e.toString());
                        loading.addIntegrationLoadingStatus(integration, "Save failed");
                    }
                }
            }
        } else {
            logger.error("Input does not contain array.");
            loading.addIntegrationLoadingStatus(Long.valueOf(0), "Input does not contain array");
        }
        HashMap<Integer, List<Long>> map = new HashMap<>();
        map.put(deploymentPhase, processedIntegrationIds);
        return map;
    }

    private Integration updateIntegrationOrganization(Loading loading, Integration integration, boolean precheck) {
        Organization organization = new Organization();
        if (integration.getOrganization() != null && integration.getOrganization().getOid() != null
                && integration.getOrganization().getOid().length() > 0) {
            logger.debug("Integration #{} organization oid: {}", integration.getId(),
                    integration.getOrganization().getOid());
            try {
                organization = organizationService.getById(integration.getOrganization().getOid());
            } catch (Exception ex) {
                logger.error(
                        "Organization cache lookup exception: {}. Continuing to next integration.",
                        ex.toString());
                loading.addIntegrationLoadingStatus(integration, "Organization cache lookup exception");
                return null;
            }
            if (organization == null) {
                try {
                    logger.debug(
                            "A new integration #{} organization: {}", integration.getId(),
                            integration.getOrganization().getOid());
                    organization = organizationService
                            .retrieveOrganization(integration.getOrganization().getOid());
                } catch (Exception ex) {
                    logger.error("Organization retrieval exception: {}. Continuing to next.",
                            ex.toString());
                    loading.addIntegrationLoadingStatus(integration, "Organization retrieval exception");
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
                logger.error("Organization Exception: {}", e.toString());
                loading.addIntegrationLoadingStatus(integration, "Organization caching exception");
            }
        }
        return integration;
    }

    /*
     * Updates an existing integration. Passes through a new integration.
     */
    private Integration updateExistingIntegration(Loading loading, Integration integration) {
        Optional<Integration> existingIntegration = this.integrationRepository
                .findByIdAll(integration.getId());
        // an existing integration (active or inactive)
        if (existingIntegration.isPresent()) {
            if (!existingIntegration.get().isActive()) {
                logger.info("Reloading inactive integration #{}. Reactivating.",
                        existingIntegration.get().getId());
                existingIntegration.get().setStatus(0);
            }

            existingIntegration = applyUpdate(loading, integration, existingIntegration);
            integration = existingIntegration.get();
        }

        return integration;
    }

    private Optional<Integration> applyUpdate(Loading loading, Integration integration,
            Optional<Integration> existingIntegration) {

        logger.debug("Comparing existing integration #{} version {} to #{} version {}",
                existingIntegration.get().getId(), existingIntegration.get().getVersion(),
                integration.getId(), integration.getVersion());
        DiffResult<Integration> diff = IntegrationDiffBuilder.compareSet(existingIntegration.get(),
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
                        if (d.getFieldName().contains("configurationEntity.set.name")) {
                            existingIntegration.get().getConfigurationEntity().getSet()
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
        if (d.getLeft().equals("") && !d.getRight().equals("")) {
            logger.debug("Attribute add diff: " + d.getFieldName());
            Set<Attribute> existingAttributes = existingIntegration.getConfigurationEntity().getAttributes();
            // name
            if (diffElements.length == 3) {
                Attribute newAttr = new Attribute();
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
        this.integrationSetInput = new ArrayList<>();
        this.integrationSetInput.add(location);
        Resource resource = resourceLoader.getResource("classpath:" + location);
        this.inputStream = resource.getInputStream();
    }

    public Integer getMaxRemovalNumber() {
        return maxRemovalNumber;
    }

    public void setMaxRemovalNumber(Integer maxRemovalNumber) {
        this.maxRemovalNumber = maxRemovalNumber;
    }
}
