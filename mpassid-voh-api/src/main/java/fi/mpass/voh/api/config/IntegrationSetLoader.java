package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Arrays;
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
        logger.debug("Number of existing integration sets: " + setIds.size());

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

                    // an existing integration
                    if (setIds.contains(integrationSet.getId())) {
                        Optional<Integration> existingIntegration = this.integrationRepository
                                .findByIdAll(integrationSet.getId());

                        if (existingIntegration.isPresent()) {
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
                                    String[] diffElements = d.getFieldName().split("\\.");
                                    if (d.getFieldName().contains("configurationEntity.attributes.")) {

                                        // existing = left = "", input = right != ""
                                        // 1. a new attribute (with a new value) has been added to the integration
                                        // context
                                        if (d.getLeft().equals("") && !d.getRight().equals("")) {
                                            logger.debug("Add diff: " + d.getFieldName());
                                            Set<Attribute> existingAttributes = existingIntegration.get()
                                                    .getConfigurationEntity().getAttributes();
                                            // TODO verify the i+1 and i+2 fieldNames
                                            // type, name, content
                                            Attribute newAttr = new Attribute(diffs.get(i + 1).getRight().toString(),
                                                    diffs.get(i).getRight().toString(),
                                                    diffs.get(i + 2).getRight().toString());
                                            existingAttributes.add(newAttr);
                                            i = i + 2;
                                            continue;
                                        }
                                        // (existing = left) != (input = right)
                                        // 2. the value has been changed
                                        if (!d.getLeft().equals("") && !d.getRight().equals("")
                                                && !d.getLeft().equals(d.getRight())) {
                                            // get the attr from the set by name (id exists?)
                                            for (Attribute a : existingIntegration.get().getConfigurationEntity()
                                                    .getAttributes()) {
                                                // attribute name
                                                if (diffElements.length>1 && a.getName().equals(diffElements[2])) {
                                                    // TODO verify diff fieldName matches attribute name -> attribute
                                                    // content
                                                    // update existing integration attribute content with input
                                                    a.setContent(d.getRight().toString());
                                                    // remove from set, add to set
                                                    existingIntegration.get().getConfigurationEntity().getAttributes()
                                                            .remove(a);
                                                    existingIntegration.get().getConfigurationEntity().getAttributes()
                                                            .add(a);
                                                }
                                            }

                                            i = i + 2;
                                            continue;
                                        }
                                        // existing = left != "", input = right == ""
                                        // 3. the existing attribute has been removed from the input in the integration
                                        // context
                                        if (!d.getLeft().equals("") && d.getRight().equals("")) {
                                            for (Attribute a : existingIntegration.get().getConfigurationEntity()
                                                    .getAttributes()) {
                                                // attribute name
                                                if (a.getName().equals(diffElements[2])) {
                                                    existingIntegration.get().getConfigurationEntity().getAttributes()
                                                            .remove(a);
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                logger.debug("Comparison failed. Check input data structure and values.");
                            }
                        }
                        setIds.remove(integrationSet.getId());
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
                        organization = organizationService.saveOrganization(organization);
                    } catch (Exception e) {
                        logger.error("Organization Exception: " + e);
                    }

                    try {
                        integrationRepository.save(integrationSet);
                        integrationSetCount++;
                    } catch (Exception e) {
                        logger.error("Integration Exception: " + e + ". Continuing to next.");
                        continue;
                    }
                }
            }
            logger.info("Loaded " + integrationSetCount + " integration sets.");
        }
    }
}
