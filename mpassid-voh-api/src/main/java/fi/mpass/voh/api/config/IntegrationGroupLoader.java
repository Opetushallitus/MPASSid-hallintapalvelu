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

import fi.mpass.voh.api.integration.IntegrationGroup;
import fi.mpass.voh.api.integration.IntegrationGroupRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Component
public class IntegrationGroupLoader implements CommandLineRunner {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationGroupLoader.class);

    @Value("${application.integration-groups.input}")
    private String integrationGroupInput;

    @Autowired
    IntegrationGroupRepository integrationGroupRepository;

    @Autowired
    ResourceLoader resourceLoader;

    public IntegrationGroupLoader(IntegrationGroupRepository repository, ResourceLoader loader) {
        this.integrationGroupRepository = repository;
        this.resourceLoader = loader;
        if (this.integrationGroupInput == null) {
            this.integrationGroupInput = "integration_groups.json";
        }
    }

    /**
     * Loads integration groups from the given, configurable resource (a list of
     * inputs).
     * Assumes to be run before other loaders ordered by @Order annotation.
     */
    @Override
    public void run(String... args) throws Exception {

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        InputStream inputStream;
        File file = ResourceUtils.getFile(integrationGroupInput);
        if (file.exists()) {
            logger.info("Reading integration groups from " + integrationGroupInput);
            inputStream = new FileInputStream(file);
        } else {
            // Fallback to classpath resource if the configured input file doesn't exist
            // Allow input file configuration through run arguments
            if (args.length > 0) {
                integrationGroupInput = args[0];
            }
            logger.info("Reading integration groups from classpath " + integrationGroupInput);
            Resource resource = resourceLoader.getResource("classpath:" + integrationGroupInput);
            inputStream = resource.getInputStream();
        }

        JsonNode rootNode = (objectMapper.readTree(inputStream)).path("integrationGroups");

        int integrationGroupCount = 0;

        if (rootNode.isArray()) {
            for (JsonNode arrayNode : rootNode) {

                IntegrationGroup integrationGroup = null;
                try {
                    integrationGroup = new ObjectMapper()
                            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                            .readValue(arrayNode.toString(), IntegrationGroup.class);
                } catch (Exception e) {
                    logger.error(
                            "IntegrationGroup exception: " + e + " continuing to next.");
                    continue;
                }

                try {
                    integrationGroupRepository.save(integrationGroup);
                    integrationGroupCount++;
                } catch (Exception e) {
                    logger.error("IntegrationGroup Exception: " + e + ". Continuing to next.");
                    continue;
                }
            }
        }
        logger.info("Loaded " + integrationGroupCount + " integration groups.");
    }
}
