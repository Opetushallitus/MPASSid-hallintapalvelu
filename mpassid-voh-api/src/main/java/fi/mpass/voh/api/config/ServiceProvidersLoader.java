package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import javax.transaction.Transactional;

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
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

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
    @Transactional
    @Override
    public void run(String... args) throws Exception {

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

                    JsonNode groupArrayNode = arrayNode.get("integrationGroups");
                    if (groupArrayNode != null && groupArrayNode.isArray()) {
                        for (JsonNode groupNode : groupArrayNode) {
                            if (groupNode.get("id") != null) {
                                Optional<Integration> integrationSet = integrationRepository
                                        .findByIdAll(groupNode.get("id").asLong());
                                if (integrationSet.isPresent()) {
                                    integrationSet.get().getConfigurationEntity().getSet().setType("sp");
                                    logger.debug("Integration set #" + groupNode.get("id"));
                                    logger.debug("Integration set size: "
                                            + integrationSet.get().getIntegrationSets().size());
                                    integration.addToSet(integrationSet.get());
                                }
                            }
                        }
                    }

                    integration.setOrganization(organization);
                    try {
                        integrationRepository.save(integration);
                        serviceProviderCount++;
                    } catch (Exception e) {
                        logger.error("Integration Exception: " + e + ". Continuing to next.");
                        continue;
                    }
                }
            }
            logger.info("Loaded " + serviceProviderCount + " service providers.");
        }
    }
}
