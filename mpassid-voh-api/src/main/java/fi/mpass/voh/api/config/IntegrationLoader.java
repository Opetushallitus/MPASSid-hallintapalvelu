package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.Map.Entry;

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

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.idp.Adfs;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.integration.idp.Gsuite;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.SamlServiceProvider;
import fi.mpass.voh.api.integration.sp.ServiceProvider;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Order(value = Ordered.LOWEST_PRECEDENCE)
@Component
public class IntegrationLoader implements CommandLineRunner {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationLoader.class);

    @Value("${application.home-organizations.input}")
    private String homeOrganizationsInput;

    IntegrationRepository integrationRepository;

    OrganizationService organizationService;

    ResourceLoader resourceLoader;

    public IntegrationLoader(IntegrationRepository repository, OrganizationService service, ResourceLoader loader) {
        this.integrationRepository = repository;
        this.organizationService = service;
        this.resourceLoader = loader;
        if (this.homeOrganizationsInput == null) {
            this.homeOrganizationsInput = "home_organizations.json";
        }
    }

    private Set<Attribute> jsonObjectNodeToAttributeSet(String type, JsonNode attributesNode, ConfigurationEntity ce) {
        Set<Attribute> attributes = new HashSet<Attribute>() {
            {
                if (attributesNode.isObject()) {
                    Iterator<Entry<String, JsonNode>> fields = attributesNode.fields();
                    fields.forEachRemaining(field -> {
                        Attribute attribute = new Attribute("", type, field.getKey(),
                                field.getValue().asText(), "");
                        attribute.setConfigurationEntity(ce);
                        add(attribute);
                    });
                }
            }
        };
        return attributes;
    }

    private Set<ServiceProvider> createAllowedServices(IntegrationRepository repository, JsonNode allowedServicesNode,
            IdentityProvider allowingIdentityProvider) {

        Set<ServiceProvider> allowedServices = new HashSet<>();
        if (allowedServicesNode != null && allowedServicesNode.isArray()) {
            for (JsonNode id : allowedServicesNode) {
                logger.debug("Allowed SP id: " + id.asText());

                ConfigurationEntity ce = new ConfigurationEntity();
                if (id.asText().contains("clientId")) {
                    Integration i = repository.findByConfigurationEntitySpClientId(id.asText());
                    if (i == null) {
                        OidcServiceProvider serviceProvider = new OidcServiceProvider();
                        serviceProvider.setConfigurationEntity(ce);
                        ce.setSp(serviceProvider);
                        serviceProvider.setClientId(id.asText());
                        serviceProvider.addAllowingIdentityProvider(allowingIdentityProvider);
                        allowedServices.add(serviceProvider);
                    } else
                        continue;
                } else {
                    Integration i = repository.findByConfigurationEntitySpEntityId(id.asText());
                    if (i == null) {
                        SamlServiceProvider serviceProvider = new SamlServiceProvider();
                        serviceProvider.setConfigurationEntity(ce);
                        ce.setSp(serviceProvider);
                        serviceProvider.setEntityId(id.asText());
                        serviceProvider.addAllowingIdentityProvider(allowingIdentityProvider);
                        allowedServices.add(serviceProvider);
                    } else
                        continue;
                }
                Integration integrationSp = new Integration();
                integrationSp.setConfigurationEntity(ce);
                repository.saveAndFlush(integrationSp);
            }
        }
        return allowedServices;
    }

    @Override
    public void run(String... args) throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        InputStream inputStream;
        File file = ResourceUtils.getFile(homeOrganizationsInput);
        if (file.exists()) {
            logger.info("Reading home organizations from " + homeOrganizationsInput);
            inputStream = new FileInputStream(file);
        } else {
            // Fallback to classpath resource if the configured input file doesn't exist
            // Allow input file configuration through run arguments
            if (args.length > 0) {
                homeOrganizationsInput = args[0];
            }
            logger.info("Reading home organizations from classpath " + homeOrganizationsInput);
            Resource resource = resourceLoader.getResource("classpath:" + homeOrganizationsInput);
            inputStream = resource.getInputStream();
        }
        JsonNode rootNode = (objectMapper.readTree(inputStream)).path("identityProviders");

        int integrationCount = 0;

        if (rootNode.isArray()) {
            for (JsonNode arrayNode : rootNode) {
                if (!arrayNode.has("oid"))
                    continue;

                logger.info("Loading Integration, flowname: " + arrayNode.get("flowName").asText());

                Integration integration = new Integration();

                Organization organization = null;
                try {
                    organization = organizationService.getById(arrayNode.get("oid").asText());
                } catch (Exception ex) {
                    logger.error("Organization exception: " + ex + " continuing to next integration.");
                    continue;
                }
                if (organization == null) {
                    organization = organizationService.retrieveOrganization(arrayNode.get("oid").asText());
                    organizationService.saveOrganization(organization);
                }
                integration.setOrganization(organization);

                Set<Integer> institutionTypes = new HashSet<>();
                JsonNode institutionTypesNode = arrayNode.get("institutionTypes");
                if (institutionTypesNode.isArray()) {
                    for (JsonNode institutionType : institutionTypesNode) {
                        String[] typesArray = institutionType.asText().split("_", 2);
                        if (typesArray.length > 1) {
                            institutionTypes.add(Integer.parseInt(typesArray[1]));
                        }
                    }
                }

                JsonNode discoNode = arrayNode.get("discoveryInformation");
                DiscoveryInformation discoveryInformation = new ObjectMapper().readValue(discoNode.toString(),
                        DiscoveryInformation.class);
                discoveryInformation.setIntegration(integration);
                integration.setDiscoveryInformation(discoveryInformation);

                String typeField = arrayNode.get("type").asText();

                try {
                    if ("opinsys".equals(typeField)) {
                        ConfigurationEntity ce = new ConfigurationEntity();
                        Opinsys opinsys = new ObjectMapper().readValue(arrayNode.toString(), Opinsys.class);

                        JsonNode dataAttributesNode = arrayNode.get("dataAttributes");
                        Set<Attribute> attributes = jsonObjectNodeToAttributeSet("data", dataAttributesNode, ce);
                        for (Iterator<Attribute> it = attributes.iterator(); it.hasNext();) {
                            Attribute f = it.next();
                            if (f.getName().equals("tenantId")) {
                                opinsys.setTenantId(f.getContent());
                                break;
                            }
                        }

                        logger.debug("Opinsys data attribute set size:" + attributes.size() + " attributes: "
                                + attributes.toString());

                        opinsys.setInstitutionTypes(institutionTypes);
                        ce.setAttributes(attributes);
                        ce.setIdp(opinsys);
                        integration.setConfigurationEntity(ce);
                        integrationRepository.save(integration);
                    }
                    if ("wilma".equals(typeField)) {
                        ConfigurationEntity ce = new ConfigurationEntity();
                        Wilma wilma = new ObjectMapper().readValue(arrayNode.toString(), Wilma.class);

                        JsonNode dataAttributesNode = arrayNode.get("dataAttributes");
                        Set<Attribute> attributes = jsonObjectNodeToAttributeSet("data", dataAttributesNode, ce);
                        for (Iterator<Attribute> it = attributes.iterator(); it.hasNext();) {
                            Attribute f = it.next();
                            if (f.getName().equals("hostname")) {
                                wilma.setHostname(f.getContent());
                                break;
                            }
                        }

                        logger.debug("Wilma data attribute set size:" + attributes.size() + " attributes: "
                                + attributes.toString());

                        wilma.setInstitutionTypes(institutionTypes);
                        ce.setAttributes(attributes);
                        ce.setIdp(wilma);
                        integration.setConfigurationEntity(ce);
                        integrationRepository.save(integration);
                    }
                    if ("azure".equals(typeField)) {
                        ConfigurationEntity ce = new ConfigurationEntity();
                        Azure azure = new ObjectMapper().readValue(arrayNode.toString(), Azure.class);

                        JsonNode dataAttributesNode = arrayNode.get("dataAttributes");
                        Set<Attribute> dataAttributes;
                        if (dataAttributesNode != null) {
                            dataAttributes = jsonObjectNodeToAttributeSet("data", dataAttributesNode, ce);
                            logger.debug(
                                    "Azure data attribute set size:" + dataAttributes.size() + " attributes: "
                                            + dataAttributes.toString());
                        } else {
                            logger.debug("Azure dataAttributes json node to Attribute set conversion failed");
                            dataAttributes = new HashSet<>();
                        }

                        JsonNode userAttributesNode = arrayNode.get("userAttributes");
                        Set<Attribute> userAttributes;
                        if (userAttributesNode != null) {
                            userAttributes = jsonObjectNodeToAttributeSet("user", userAttributesNode, ce);
                            logger.debug(
                                    "Azure user attribute set size:" + userAttributes.size() + " attributes: "
                                            + userAttributes.toString());
                        } else {
                            logger.debug("Azure userAttributes json node to Attribute set conversion failed");
                            userAttributes = new HashSet<>();
                        }
                        Set<Attribute> attributes = new HashSet<Attribute>();
                        attributes.addAll(dataAttributes);
                        attributes.addAll(userAttributes);

                        azure.setInstitutionTypes(institutionTypes);
                        JsonNode allowedServicesNode = arrayNode.get("allowedServices");
                        azure.setAllowedServiceProviders(
                                createAllowedServices(integrationRepository, allowedServicesNode, azure));
                        ce.setAttributes(attributes);
                        ce.setIdp(azure);
                        integration.setConfigurationEntity(ce);
                        integrationRepository.save(integration);
                    }
                    if ("gsuite".equals(typeField)) {
                        ConfigurationEntity ce = new ConfigurationEntity();
                        Gsuite gsuite = new ObjectMapper().readValue(arrayNode.toString(), Gsuite.class);

                        JsonNode attributesNode = arrayNode.get("userAttributes");
                        Set<Attribute> attributes;
                        if (attributesNode != null) {
                            attributes = jsonObjectNodeToAttributeSet("user", attributesNode, ce);
                            logger.debug("Gsuite user attribute set size:" + attributes.size() + " attributes: "
                                    + attributes.toString());
                        } else {
                            logger.debug("Gsuite userAttributes json node to Attribute set conversion failed");
                            attributes = new HashSet<>();
                        }

                        gsuite.setInstitutionTypes(institutionTypes);
                        JsonNode allowedServicesNode = arrayNode.get("allowedServices");
                        gsuite.setAllowedServiceProviders(
                                createAllowedServices(integrationRepository, allowedServicesNode, gsuite));
                        ce.setAttributes(attributes);
                        ce.setIdp(gsuite);
                        integration.setConfigurationEntity(ce);
                        integrationRepository.save(integration);
                    }
                    if ("adfs".equals(typeField)) {
                        ConfigurationEntity ce = new ConfigurationEntity();
                        Adfs adfs = new ObjectMapper().readValue(arrayNode.toString(), Adfs.class);

                        JsonNode attributesNode = arrayNode.get("userAttributes");
                        Set<Attribute> attributes;
                        if (attributesNode != null) {
                            attributes = jsonObjectNodeToAttributeSet("user", attributesNode, ce);
                            logger.debug("Adfs user attribute set size:" + attributes.size() + " attributes: "
                                    + attributes.toString());
                        } else {
                            logger.debug("Adfs userAttributes json node to Attribute set conversion failed");
                            attributes = new HashSet<>();
                        }
                        adfs.setInstitutionTypes(institutionTypes);
                        ce.setAttributes(attributes);
                        ce.setIdp(adfs);
                        integration.setConfigurationEntity(ce);
                        integrationRepository.save(integration);
                    }
                    integrationCount++;
                } catch (Exception ex) {
                    logger.error("Exception " + ex);
                }
            }
        }
        logger.info("Loaded " + integrationCount + " home organizations.");
    }
}
