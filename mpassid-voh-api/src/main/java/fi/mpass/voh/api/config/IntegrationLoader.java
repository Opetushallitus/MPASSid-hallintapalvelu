package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import fi.mpass.voh.api.integration.sp.ServiceProviderRepository;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationPermission;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Order(value = Ordered.LOWEST_PRECEDENCE)
@Component
public class IntegrationLoader implements CommandLineRunner {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationLoader.class);

    @Value("#{${application.home-organizations.input}}")
    private List<String> homeOrganizationsInput;

    IntegrationRepository integrationRepository;

    ServiceProviderRepository serviceProviderRepository;

    OrganizationService organizationService;

    ResourceLoader resourceLoader;

    public IntegrationLoader(IntegrationRepository repository, OrganizationService service,
            ServiceProviderRepository spRepository, ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = service;
        this.serviceProviderRepository = spRepository;
        this.resourceLoader = loader;
        if (this.homeOrganizationsInput == null) {
            this.homeOrganizationsInput = Arrays.asList("home_organizations.json");
        }
    }

    @Override
    public void run(String... args) throws Exception {

        List<Long> idpIds = this.integrationRepository.getAllIdpIds();

        for (String idpInput : this.homeOrganizationsInput) {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            InputStream inputStream;
            File file = ResourceUtils.getFile(idpInput);
            if (file.exists()) {
                logger.info("Reading home organizations from " + idpInput);
                inputStream = new FileInputStream(file);
            } else {
                // Fallback to classpath resource if the configured input file doesn't exist
                // Allow input file configuration through run arguments
                if (args.length > 0) {
                    idpInput = args[0];
                }
                logger.info("Reading home organizations from classpath " + idpInput);
                Resource resource = resourceLoader.getResource("classpath:" + idpInput);
                inputStream = resource.getInputStream();
            }
            JsonNode rootNode = (objectMapper.readTree(inputStream)).path("identityProviders");

            int integrationCount = 0;

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

                    // CASE an existing integration
                    // TODO if integration (id) is found from the repository,
                    // check if it has permissions, if so, copy the permissions to the loaded
                    // integration
                    // remove the existing integration id from the id list (***)
                    // continue as usual
                    if (idpIds.contains(integration.getId())) {
                        List<IntegrationPermission> permissions = integration.getPermissions();
                        if (permissions.size() > 0) {
                            logger.debug("Loaded integration " + integration.getId()
                                    + " with permissions! Permissions might be not effective.");
                        }
                        Optional<Integration> existingIntegration = this.integrationRepository
                                .findById(integration.getId());
                        if (existingIntegration.isPresent()) {
                            List<IntegrationPermission> existingPermissions = existingIntegration.get()
                                    .getPermissions();
                            if (existingPermissions.size() > 0) {
                                integration.setPermissions(existingPermissions);
                            }
                        }
                        idpIds.remove(integration.getId());
                    }

                    // CASE a new integration
                    // if the integration (id) is NOT found from the repository,
                    // continue as usual

                    Organization organization = new Organization();
                    if (integration.getOrganization().getOid() != null
                            && integration.getOrganization().getOid().length() > 0) {
                        logger.debug("Organization oid:" + integration.getOrganization().getOid());
                        try {
                            organization = organizationService.getById(integration.getOrganization().getOid());
                        } catch (Exception ex) {
                            // TODO allow fallback to organization service?
                            logger.error("Organization exception: " + ex + " continuing to next integration.");
                            continue;
                        }
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

                    // check if existing permissions were found
                    if (integration.getPermissions().size() == 0) {
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
                                            logger.debug("Allowed SAML SP: " + samlSp.toString());
                                            Set<Integration> integrationSet = samlSp.getIntegrationSets();
                                            // assuming that an SP can belong to only one set
                                            if (!integrationSet.isEmpty()) {
                                                Integration setIntegration = integrationSet.iterator().next();
                                                logger.debug("Set: " + setIntegration.getId());
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
                                            logger.debug("Allowed OIDC RP: " + oidcRp.toString());
                                            // i.addAllowed(oidcRp);
                                            Set<Integration> integrationSet = oidcRp.getIntegrationSets();
                                            // assuming that an RP can belong to only one set
                                            if (!integrationSet.isEmpty()) {
                                                Integration setIntegration = integrationSet.iterator().next();
                                                logger.debug("Set: " + setIntegration.getId());
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
                        logger.error("Integration Exception: " + e + ". Continuing to next.");
                        continue;
                    }
                }
            }
            logger.info("Loaded " + integrationCount + " home organizations.");

            // TODO iterate all the remaining integration ids
            // set the deploymentPhase of the remaining integrations to -1 (inactive)
            for (Long i : idpIds) {
                logger.debug("Integration " + i + " not found in loaded integrations. It will be set inactive.");
                Optional<Integration> inactive = this.integrationRepository.findById(i);
                if (inactive.isPresent()) {
                    inactive.get().setDeploymentPhase(-1);
                    this.integrationRepository.save(inactive.get());
                }
            }
        }
    }
}