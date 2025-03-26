package fi.mpass.voh.api.loading;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationRepository;
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

@Component
public class IdentityProviderLoader extends Loader {
    private static final Logger logger = LoggerFactory.getLogger(IdentityProviderLoader.class);

    @Value("#{${application.home-organizations.input}}")
    private List<String> homeOrganizationsInput;

    public IdentityProviderLoader(IntegrationRepository repository, OrganizationService organizationService, CredentialService credentialService,
            ResourceLoader loader) {
        super(repository, organizationService, credentialService, loader);
        if (this.homeOrganizationsInput == null) {
            this.homeOrganizationsInput = Arrays.asList("home_organizations.json");
        }
    }

    /**
     * Loads identity provider integrations from the given, configurable resource (a
     * list of inputs).
     */
    public Loading init(Loading loading) {

        loading.setStatus(LoadingStatus.LOADING);

        for (String idpInput : this.homeOrganizationsInput) {
            ObjectMapper objectMapper = JsonMapper.builder()
                    .addModule(new JavaTimeModule())
                    .build();
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            if (inputStream == null) {
                try {
                    File file = ResourceUtils.getFile(idpInput);
                    logger.info("Reading idp integrations from {}", idpInput);
                    inputStream = new FileInputStream(file);
                } catch (FileNotFoundException e) {
                    logger.error("{} not found.", idpInput);
                    loading.addError(Long.valueOf(0), idpInput + " not found");
                    inputStream = null;
                    break;
                }
            }

            JsonNode preRootNode = null;
            JsonNode rootNode = null;
            try {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                inputStream.transferTo(baos);
                InputStream preInputStream = new ByteArrayInputStream(baos.toByteArray());
                InputStream actualInputStream = new ByteArrayInputStream(baos.toByteArray());

                preRootNode = (objectMapper.readTree(preInputStream)).path("identityProviders");
                rootNode = (objectMapper.readTree(actualInputStream)).path("identityProviders");

            } catch (StreamReadException e) {
                logger.error("{} contains invalid content. {}", idpInput, e.getMessage());
                loading.addError(Long.valueOf(0),
                        idpInput + " contains invalid content");
                inputStream = null;
                break;
            } catch (IOException e) {
                logger.error("{} IO exception.", idpInput);
                loading.addError(Long.valueOf(0), idpInput + " IO exception");
            }

            // precheck for, e.g., the number of removed integrations
            Map<Integer, List<Long>> preProcessed = processNodes(loading, preRootNode, true);

            // if preprocessing detects any errors, fail fast
            if (preProcessed.keySet().isEmpty() || loading.getErrors().size() > 0) {
                logger.error("Preprocessing input {} failed.", idpInput);
                inputStream = null;
                break;
            }

            // check for duplicate integrations in the input
            if (duplicates(loading, preProcessed)) {
                inputStream = null;
                break;
            }

            // assuming the input can only contain integrations in one deployment phase
            int deploymentPhase = (int) preProcessed.keySet().toArray()[0];
            List<Long> existingIds = integrationRepository.getAllIdpIdsByDeploymentPhase(deploymentPhase);
            logger.info("Number of existing set integrations in deployment phase {}: {}", deploymentPhase,
                    existingIds.size());

            List<Long> preRemovedIds = new ArrayList<>(existingIds);
            if (preRemovedIds.removeAll(preProcessed.get(deploymentPhase))) {
                logger.info("Prechecking {} inactivated integrations.", preRemovedIds.size());
                if (preRemovedIds.size() > this.maxRemovalNumber) {
                    logger.error("Maximum number of removals ({}) exceeded. Skipping input from {}",
                            this.maxRemovalNumber, idpInput);
                    loading.addError(Long.valueOf(0),
                            "Maximum number of removals exceeded. Skipping input.");
                    inputStream = null;
                    break;
                }
            }

            Map<Integer, List<Long>> processed = processNodes(loading, rootNode, false);

            logger.info("Loaded/reloaded {} integrations in deployment phase {}", processed.get(deploymentPhase).size(),
                    deploymentPhase);
            inputStream = null;

            List<Long> removedIds = new ArrayList<>(existingIds);
            if (removedIds.removeAll(processed.get(deploymentPhase))) {
                logger.info("{} inactivated integrations in deployment phase {}", removedIds.size(), deploymentPhase);
                inactivateIntegrations(loading, removedIds);
            }
        }

        if (loading.getErrors().isEmpty()) {
            loading.setStatus(LoadingStatus.SUCCEEDED);
        } else {
            loading.setStatus(LoadingStatus.FAILED);
        }

        return loading;
    }

    @Override
    protected boolean validIntegration(Loading loading, Integration integration) {
        // validate integration identifier
        if (integration != null) {
            if (integration.getId() == null) {
                logger.error("Integration identifier missing");
                loading.addError(Long.valueOf(0), "Integration identifier missing");
                return false;
            }

            // validate integration organization oid, it must exist
            if (integration.getOrganization() != null) {
                if (integration.getOrganization().getOid().length() < 256) {
                    String oidRegex = "[0-2](\\.([0-9]*))+";
                    Pattern p = Pattern.compile(oidRegex);
                    Matcher m = p.matcher(integration.getOrganization().getOid());
                    boolean b = m.matches();
                    if (!b) {
                        logger.error("Integration #{} organization oid is not valid", integration.getId());
                        loading.addError(integration, "Not valid organization oid");
                        return false;
                    }
                } else {
                    logger.error("Integration #{} organization oid maximum length exceeded", integration.getId());
                    loading.addError(integration, "Organization oid maximum length exceeded");
                    return false;
                }
            } else {
                logger.error("Integration #{} organization does not exist", integration.getId());
                loading.addError(integration, "Organization does not exist");
                return false;
            }
        } else
            return false;
        return true;
    }

    @Override
    protected Optional<Integration> applyUpdate(Loading loading, Integration integration,
            Optional<Integration> existingIntegration) {

        logger.debug("Comparing existing integration #{} version {} to #{} version {}",
                existingIntegration.get().getId(), existingIntegration.get().getVersion(),
                integration.getId(), integration.getVersion());
        DiffResult<Integration> diff = IntegrationDiffBuilder.compareIdp(existingIntegration.get(),
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
                                ((Azure) idp).setMetadataUrlAndValidUntilDates((String) d.getRight());
                            }
                            if (idp instanceof Adfs) {
                                ((Adfs) idp).setMetadataAndParse((String) d.getRight());
                            }
                            if (idp instanceof Gsuite) {
                                ((Gsuite) idp).setMetadataUrlAndValidUntilDates((String) d.getRight());
                            }
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.tenantId")
                                && (idp instanceof Opinsys)) {
                            ((Opinsys) idp).setTenantId((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.hostname")
                                && (idp instanceof Wilma)) {
                            ((Wilma) idp).setHostname((String) d.getRight());
                        }
                        if (d.getFieldName().contains("configurationEntity.idp.institutionTypes")
                                && (d.getRight() instanceof Set)) {
                            idp.setInstitutionTypes((Set<Integer>) d.getRight());
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
                                /* existingIntegration.get().getOrganization().setOid((String) d.getRight()); */
                                updateIntegrationOrganization(loading, existingIntegration.get(), (String) d.getRight(),
                                        false, true);
                            } else {
                                Organization org = new Organization("", (String) d.getRight());
                                existingIntegration.get().setOrganization(org);
                                updateIntegrationOrganization(loading, existingIntegration.get(), (String) d.getRight(),
                                        false, true);
                            }
                        }
                        if (d.getFieldName().contains("deploymentPhase")) {
                            existingIntegration.get().setDeploymentPhase((Integer) d.getRight());
                        }
                    }
                } catch (Exception e) {
                    logger.error(
                            "Error in updating integration #{}: {}", existingIntegration.get().getId(), e.toString());
                    loading.addError(existingIntegration.get(), "Update failed");
                }
                existingIntegration.get().setLastUpdatedOn(LocalDateTime.now());
            }
        } else {
            logger.error("Comparison failed. Check input data structure and values.");
            loading.addError(integration, "Comparison failed");
        }
        return existingIntegration;
    }

    public void setInput(String location) throws IOException {
        this.homeOrganizationsInput = new ArrayList<>();
        this.homeOrganizationsInput.add(location);
        Resource resource = resourceLoader.getResource("classpath:" + location);
        this.inputStream = resource.getInputStream();
    }
}
