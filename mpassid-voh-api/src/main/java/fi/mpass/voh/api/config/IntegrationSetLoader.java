package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

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
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Component
public class IntegrationSetLoader implements CommandLineRunner {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationSet.class);

    @Value("${application.integration-sets.input}")
    private String integrationSetInput;

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
            this.integrationSetInput = "integration_sets.json";
        }
    }

    /**
     * Loads integration sets from the given, configurable resource (a list of
     * inputs).
     * Assumes to be run before other loaders ordered by @Order annotation.
     */
    @Override
    public void run(String... args) throws Exception {

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        InputStream inputStream;
        File file = ResourceUtils.getFile(integrationSetInput);
        if (file.exists()) {
            logger.info("Reading integration Sets from " + integrationSetInput);
            inputStream = new FileInputStream(file);
        } else {
            // Fallback to classpath resource if the configured input file doesn't exist
            // Allow input file configuration through run arguments
            if (args.length > 0) {
                integrationSetInput = args[0];
            }
            logger.info("Reading integration sets from classpath " + integrationSetInput);
            Resource resource = resourceLoader.getResource("classpath:" + integrationSetInput);
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
                                    "A new integration set organization: " + integrationSet.getOrganization().getOid());
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
