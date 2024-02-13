package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
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

@Profile("!default")
@Order(2)
@Component
public class ServiceProvidersLoader implements CommandLineRunner {
    private final static Logger logger = LoggerFactory.getLogger(ServiceProvidersLoader.class);

    @Value("#{${application.service-providers.input}}")
    private List<String> serviceProvidersInput;

    @Autowired
    IntegrationRepository integrationRepository;

    @Autowired
    OrganizationService organizationService;

    @Autowired
    ResourceLoader resourceLoader;

    public ServiceProvidersLoader(IntegrationRepository repository, OrganizationService service,
            ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = service;
        this.resourceLoader = loader;
        if (this.serviceProvidersInput == null) {
            this.serviceProvidersInput = Arrays.asList("services.json");
        }
    }

    /**
     * Loads ServiceProviders from the given, configurable resource (a list of
     * inputs).
     * Assumes to be run before IntegrationLoader ordered by @Order annotation.
     */
    @Override
    public void run(String... args) throws Exception {

        List<Long> spIds = integrationRepository.getAllSpIds();
        logger.info("Number of existing sp integrations: " + spIds.size());

        for (String spInput : this.serviceProvidersInput) {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            InputStream inputStream;
            File file = ResourceUtils.getFile(spInput);
            if (file.exists()) {
                logger.info("Reading service providers from " + spInput);
                inputStream = new FileInputStream(file);
            } else {
                // Fallback to classpath resource if the configured input file doesn't exist
                // Allow input file configuration through run arguments
                if (args.length > 0) {
                    spInput = args[0];
                }
                logger.info("Reading service providers from classpath " + spInput);
                Resource resource = resourceLoader.getResource("classpath:" + spInput);
                inputStream = resource.getInputStream();
            }

            JsonNode rootNode = (objectMapper.readTree(inputStream)).path("services");

            int serviceProviderCount = 0;

            if (rootNode.isArray()) {
                for (JsonNode arrayNode : rootNode) {
                    Integration integration = null;
                    try {
                        integration = new ObjectMapper()
                                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                                .readValue(arrayNode.toString(), Integration.class);
                    } catch (Exception e) {
                        logger.error(
                                "Integration exception: " + e + " continuing to next.");
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
                                    logger.debug("Integration set #" + groupNode.get("id"));
                                    integration.addToSet(integrationSet.get());
                                    logger.debug("Integration set size: "
                                            + integrationSet.get().getIntegrationSets().size());
                                }
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
                            logger.error("Error in finding existing integration " + integration.getId() + ". Exception "
                                    + e);
                            continue;
                        }

                        if (existingIntegration.isPresent()) {
                            if (!existingIntegration.get().isActive()) {
                                logger.info("Reloading inactive integration " + existingIntegration.get().getId()
                                        + ". Reactivating.");
                                existingIntegration.get().setStatus(0);
                            }
                            logger.debug("Comparing existing integration " + existingIntegration.get().getId()
                                    + " version " + existingIntegration.get().getVersion() + " to "
                                    + integration.getId() + " version " + integration.getVersion());

                            DiffResult<Integration> diff = IntegrationDiffBuilder.compareSp(existingIntegration.get(),
                                    integration);

                            if (diff != null) {
                                List<Diff<?>> diffs = diff.getDiffs();
                                for (int i = 0; i < diff.getNumberOfDiffs(); i++) {
                                    Diff<?> d = diffs.get(i);
                                    logger.debug(d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
                                    if (d.getFieldName().contains("configurationEntity.attributes.")) {
                                        existingIntegration = Optional
                                                .of(updateAttribute(d, existingIntegration.get()));
                                    } else {
                                        // differences in the integration fields
                                        logger.debug("Integration field diff: " + d.getFieldName());
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
                                            ((SamlServiceProvider) existingIntegration.get().getConfigurationEntity()
                                                    .getSp()).setEntityId(d.getRight().toString());
                                        }
                                        if (d.getFieldName().contains("configurationEntity.sp.clientId")) {
                                            ((OidcServiceProvider) existingIntegration.get().getConfigurationEntity()
                                                    .getSp()).setClientId(d.getRight().toString());
                                        }
                                        if (d.getFieldName().contains("configurationEntity.sp.metadata")) {
                                            existingIntegration = Optional
                                                    .of(updateMetadata(d, existingIntegration.get()));
                                        }
                                        if (d.getFieldName().contains("integrationSets")) {
                                            logger.debug("Integration set diff");
                                            List<Integration> removedSets = existingIntegration.get().removeFromSets();
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
                                }
                            } else {
                                logger.debug("Comparison failed. Check input data structure and values.");
                            }
                            integration = existingIntegration.get();
                        }
                        spIds.remove(integration.getId());
                    } else {
                        // a new sp integration
                        logger.debug("A new sp integration #" + integration.getId());
                    }

                    Organization organization = new Organization();
                    if (integration.getOrganization().getOid() != null
                            && integration.getOrganization().getOid().length() > 0) {
                        logger.debug("Organization oid:" + integration.getOrganization().getOid());
                        organization = organizationService.getById(integration.getOrganization().getOid());
                        if (organization == null) {
                            try {
                                logger.debug(
                                        "A new Integration organization: " + integration.getOrganization().getOid());
                                organization = organizationService
                                        .retrieveOrganization(integration.getOrganization().getOid());
                            } catch (Exception ex) {
                                logger.error("Organization exception: " + ex + ". Continuing to next.");
                                continue;
                            }
                        }
                    }

                    try {
                        // No cascading, Integration:Organization
                        organization = organizationService.saveOrganization(organization);
                    } catch (Exception e) {
                        logger.error("Organization Exception: " + e);
                    }

                    integration.setOrganization(organization);
                    try {
                        integrationRepository.save(integration);
                            for (Integration set : integration.getIntegrationSets()) {
                                integrationRepository.save(set);
                            }
                        serviceProviderCount++;
                    } catch (Exception e) {
                        logger.error("Integration Exception: " + e + ". Continuing to next.");
                        continue;
                    }
                }
            }
            logger.info("Loaded/reloaded " + serviceProviderCount + " service providers.");
        }
        logger.info(spIds.size() + " inactivated integrations.");
        for (Long id : spIds) {
            Optional<Integration> inactivatedIntegration = this.integrationRepository
                    .findByIdAll(id);
            if (inactivatedIntegration.isPresent()) {
                inactivatedIntegration.get().setStatus(1);
                try {
                    integrationRepository.save(inactivatedIntegration.get());
                } catch (Exception e) {
                    logger.error("Integration Exception: " + e + ". Could not inactivate integration #"
                            + inactivatedIntegration.get().getId());
                    continue;
                }
            }
        }
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
}
