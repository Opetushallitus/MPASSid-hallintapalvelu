package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
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
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Component
public class IntegrationSetLoader implements CommandLineRunner {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationSet.class);

    @Value("#{${application.integration-sets.input}}")
    private List<String> integrationSetInput;

    @Autowired
    IntegrationRepository integrationRepository;

    @Autowired
    ResourceLoader resourceLoader;

    OrganizationService organizationService;

    public IntegrationSetLoader(IntegrationRepository repository, OrganizationService organizationService,
            ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = organizationService;
        this.resourceLoader = loader;
        if (this.integrationSetInput == null) {
            this.integrationSetInput = Arrays.asList("integration_sets.json");
        }
    }

    /**
     * Loads integration sets from the given, configurable resource (a list of
     * inputs).
     * Assumes to be run before other loaders ordered by @Order annotation.
     */
    @Override
    public void run(String... args) throws Exception {

        List<Long> setIds = integrationRepository.getAllSetIds();
        logger.info("Number of existing integration sets: " + setIds.size());

        for (String setInput : this.integrationSetInput) {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            InputStream inputStream;
            File file = ResourceUtils.getFile(setInput);
            if (file.exists()) {
                logger.info("Reading integration Sets from " + setInput);
                inputStream = new FileInputStream(file);
            } else {
                // Fallback to classpath resource if the configured input file doesn't exist
                // Allow input file configuration through run arguments
                if (args.length > 0) {
                    setInput = args[0];
                }
                logger.info("Reading integration sets from classpath " + setInput);
                Resource resource = resourceLoader.getResource("classpath:" + setInput);
                inputStream = resource.getInputStream();
            }

            JsonNode rootNode = (objectMapper.readTree(inputStream)).path("integrationGroups");

            int integrationSetCount = 0;

            if (rootNode.isArray()) {
                for (JsonNode arrayNode : rootNode) {

                    Integration integrationSet = null;
                    try {
                        integrationSet = new ObjectMapper()
                                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                                .readValue(arrayNode.toString(), Integration.class);
                    } catch (Exception e) {
                        logger.error(
                                "Integration set exception: " + e + " continuing to next.");
                        continue;
                    }

                    // an existing integration (active or inactive)
                    if (setIds.contains(integrationSet.getId())) {
                        Optional<Integration> existingIntegration = this.integrationRepository
                                .findByIdAll(integrationSet.getId());

                        if (existingIntegration.isPresent()) {
                            if (!existingIntegration.get().isActive()) {
                                logger.info("Reloading inactive integration " + existingIntegration.get().getId() + ". Reactivating.");
                                existingIntegration.get().setStatus(0);
                            }
                            
                            logger.debug("Comparing existing integration " + existingIntegration.get().getId()
                                    + " version " + existingIntegration.get().getVersion() + " to "
                                    + integrationSet.getId() + " version " + integrationSet.getVersion());

                            DiffResult<Integration> diff = IntegrationDiffBuilder.compareSet(existingIntegration.get(),
                                    integrationSet);

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
                                }
                            } else {
                                logger.info("Comparison failed. Check input data structure and values.");
                            }
                            integrationSet = existingIntegration.get();
                        }
                        setIds.remove(integrationSet.getId());
                    } else {
                        // a new integration set
                        logger.debug("A new integration set #" + integrationSet.getId());
                    }

                    Organization organization = new Organization();
                    if (integrationSet.getOrganization() != null && integrationSet.getOrganization().getOid() != null
                            && integrationSet.getOrganization().getOid().length() > 0) {
                        logger.debug("Organization oid:" + integrationSet.getOrganization().getOid());
                        try {
                            organization = organizationService.getById(integrationSet.getOrganization().getOid());
                        } catch (Exception ex) {
                            // TODO allow fallback to organization service?
                            logger.error("Organization exception: " + ex + " continuing to next integration set.");
                            continue;
                        }
                        if (organization == null) {
                            try {
                                logger.debug(
                                        "A new integration set organization: "
                                                + integrationSet.getOrganization().getOid());
                                organization = organizationService
                                        .retrieveOrganization(integrationSet.getOrganization().getOid());
                            } catch (Exception ex) {
                                logger.error("Organization exception: " + ex + ". Continuing to next integration set.");
                                continue;
                            }
                        }
                    }

                    try {
                        // No cascading, Integration:Organization
                        if (organization != null && organization.getOid() != null) {
                            organization = organizationService.saveOrganization(organization);
                            integrationSet.setOrganization(organization);
                        }
                    } catch (Exception e) {
                        logger.error("Organization Exception: " + e);
                    }

                    try {
                        Integration savedIntegration = integrationRepository.save(integrationSet);
                        integrationSetCount++;
                    } catch (Exception e) {
                        logger.error("Integration Exception: " + e + ". Continuing to next.");
                        continue;
                    }
                }
            }
            logger.info("Loaded/reloaded " + integrationSetCount + " integration sets.");
        }
        logger.info(setIds.size() + " inactivated integrations.");
        for (Long id : setIds) {
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
}
