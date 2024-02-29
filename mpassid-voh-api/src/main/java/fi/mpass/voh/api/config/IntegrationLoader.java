package fi.mpass.voh.api.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

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
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationPermission;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.Adfs;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.integration.idp.Gsuite;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
//@Order(value = Ordered.LOWEST_PRECEDENCE)
//@Component
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
        logger.info("Number of existing idp integrations: " + idpIds.size());

        for (String idpInput : this.homeOrganizationsInput) {
            ObjectMapper objectMapper = JsonMapper.builder()
                    .addModule(new JavaTimeModule())
                    .build();
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
                        integration = objectMapper.readValue(arrayNode.toString(), Integration.class);
                    } catch (Exception e) {
                        logger.error(
                                "Integration exception: " + e + " continuing to next.");
                        continue;
                    }

                    // an existing integration (active or inactive)
                    if (idpIds.contains(integration.getId())) {
                        List<IntegrationPermission> permissions = integration.getPermissions();
                        if (permissions.size() > 0) {
                            logger.info("Loaded integration " + integration.getId()
                                    + " with permissions! Permissions might be not effective.");
                        }
                        Optional<Integration> existingIntegration = this.integrationRepository
                                .findByIdIdpAll(integration.getId());
                        if (existingIntegration.isPresent()) {
                            if (!existingIntegration.get().isActive()) {
                                logger.info("Reloading inactive integration " + existingIntegration.get().getId()
                                        + ". Reactivating.");
                                existingIntegration.get().setStatus(0);
                            }

                            logger.debug("Comparing existing integration " + existingIntegration.get().getId()
                                    + " version " + existingIntegration.get().getVersion() + " to "
                                    + integration.getId() + " version " + integration.getVersion());

                            DiffResult<Integration> diff = IntegrationDiffBuilder.compareIdp(existingIntegration.get(),
                                    integration);

                            if (diff != null) {
                                List<Diff<?>> diffs = diff.getDiffs();
                                for (int i = 0; i < diff.getNumberOfDiffs(); i++) {
                                    Diff<?> d = diffs.get(i);
                                    logger.debug("Integration #" + existingIntegration.get().getId() + " "
                                            + d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
                                    try {
                                        if (d.getFieldName().contains("configurationEntity.attributes.")) {
                                            existingIntegration = Optional
                                                    .of(updateAttribute(d, existingIntegration.get()));
                                        } else {
                                            // differences in the integration fields
                                            IdentityProvider idp = existingIntegration.get().getConfigurationEntity()
                                                    .getIdp();
                                            if (d.getFieldName().contains("configurationEntity.idp.flowName")) {
                                                idp.setFlowName((String) d.getRight());
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.idpId")) {
                                                idp.setIdpId((String) d.getRight());
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.logoUrl")) {
                                                idp.setLogoUrl((String) d.getRight());
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.entityId")) {
                                                if (idp instanceof Azure) {
                                                    ((Azure) idp).setEntityId((String) d.getRight());
                                                }
                                                if (idp instanceof Adfs) {
                                                    ((Adfs) idp).setEntityId((String) d.getRight());
                                                }
                                                if (idp instanceof Gsuite) {
                                                    ((Gsuite) idp).setEntityId((String) d.getRight());
                                                }
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.metadataUrl")) {
                                                if (idp instanceof Azure) {
                                                    ((Azure) idp).setMetadataUrl((String) d.getRight());
                                                }
                                                if (idp instanceof Adfs) {
                                                    ((Adfs) idp).setMetadataUrl((String) d.getRight());
                                                }
                                                if (idp instanceof Gsuite) {
                                                    ((Gsuite) idp).setMetadataUrl((String) d.getRight());
                                                }
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.tenantId")) {
                                                if (idp instanceof Opinsys) {
                                                    ((Opinsys) idp).setTenantId((String) d.getRight());
                                                }
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.hostname")) {
                                                if (idp instanceof Wilma) {
                                                    ((Wilma) idp).setHostname((String) d.getRight());
                                                }
                                            }
                                            if (d.getFieldName().contains("configurationEntity.idp.institutionTypes")) {
                                                if (d.getRight() instanceof Set) {
                                                    idp.setInstitutionTypes((Set<Integer>) d.getRight());
                                                }
                                            }

                                            if (d.getFieldName().contains("discoveryInformation.title")) {
                                                existingIntegration.get().getDiscoveryInformation()
                                                        .setTitle((String) d.getRight());
                                            }
                                            if (d.getFieldName().contains("discoveryInformation.customDisplayName")) {
                                                existingIntegration.get().getDiscoveryInformation()
                                                        .setCustomDisplayName((String) d.getRight());
                                            }
                                            if (d.getFieldName().contains("discoveryInformation.showSchools")) {
                                                existingIntegration.get().getDiscoveryInformation()
                                                        .setShowSchools((boolean) d.getRight());
                                            }
                                            if (d.getFieldName().contains("discoveryInformation.schools")) {
                                                logger.debug("diff in discoveryInformation.schools: " + d.getRight());
                                                if (d.getRight() instanceof Set) {
                                                    existingIntegration.get().getDiscoveryInformation()
                                                            .setSchools((Set<String>) d.getRight());
                                                }
                                            }
                                            if (d.getFieldName().contains("discoveryInformation.excludedSchools")) {
                                                logger.debug(
                                                        "diff in discoveryInformation.excludedSchools: "
                                                                + d.getRight());
                                                existingIntegration.get().getDiscoveryInformation()
                                                        .setExcludedSchools((Set<String>) d.getRight());
                                            }

                                            if (d.getFieldName().contains("organization.oid")) {
                                                if (existingIntegration.get().getOrganization() != null) {
                                                    existingIntegration.get().getOrganization()
                                                            .setOid((String) d.getRight());
                                                } else {
                                                    Organization org = new Organization("", (String) d.getRight());
                                                    existingIntegration.get().setOrganization(org);
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
                                    }
                                }
                            } else {
                                logger.error("Comparison failed. Check input data structure and values.");
                            }
                            integration = existingIntegration.get();
                        }
                        idpIds.remove(integration.getId());
                    } else {
                        // a new idp integration
                        logger.debug("A new idp integration #" + integration.getId());
                    }

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
            logger.info("Loaded/reloaded " + integrationCount + " home organizations.");
        }
        logger.info(idpIds.size() + " inactivated integrations.");
        for (Long id : idpIds) {
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
        if ("".equals(d.getLeft()) && !"".equals(d.getRight())) {
            logger.debug("Attribute add diff: " + d.getFieldName());
            Set<Attribute> existingAttributes = existingIntegration.getConfigurationEntity().getAttributes();
            // name
            if (diffElements.length == 3) {
                Attribute newAttr = new Attribute();
                newAttr.setConfigurationEntity(existingIntegration.getConfigurationEntity());
                newAttr.setName((String) d.getRight());
                existingAttributes.add(newAttr);
            }
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingAttributes.iterator(); attrIterator.hasNext();) {
                    Attribute attr = attrIterator.next();
                    if (attr.getName().equals(diffElements[2])) {
                        if (diffElements[3].equals("type")) {
                            attr.setType((String) d.getRight());
                        }
                        if (diffElements[3].equals("content")) {
                            attr.setContent((String) d.getRight());
                        }
                    }
                }
            }
        }
        // (existing = left) != (input = right)
        // 2. the value has been changed
        if (!"".equals(d.getLeft()) && !"".equals(d.getRight())
                && !d.getLeft().equals(d.getRight())) {
            logger.debug("Attribute mod diff: " + d.getFieldName());
            if (diffElements.length == 4) {
                for (Iterator<Attribute> attrIterator = existingIntegration.getConfigurationEntity()
                        .getAttributes().iterator(); attrIterator.hasNext();) {
                    Attribute attr = attrIterator.next();
                    if (attr.getName().equals(diffElements[2])) {
                        if (diffElements[3].equals("type")) {
                            attr.setType((String) d.getRight());
                        }
                        if (diffElements[3].equals("content")) {
                            attr.setContent((String) d.getRight());
                        }
                    }
                }
            }
        }
        // existing = left != "", input = right == ""
        // 3. the existing attribute has been removed from the input in the integration
        // context
        if (!"".equals(d.getLeft()) && "".equals(d.getRight())) {
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