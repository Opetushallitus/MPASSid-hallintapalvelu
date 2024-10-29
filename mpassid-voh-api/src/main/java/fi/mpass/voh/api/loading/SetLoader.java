package fi.mpass.voh.api.loading;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.ResourceUtils;

import com.fasterxml.jackson.core.exc.StreamReadException;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;

@Component
public class SetLoader extends Loader {
    private static final Logger logger = LoggerFactory.getLogger(SetLoader.class);

    @Value("#{${application.integration-sets.input}}")
    private List<String> integrationSetInput;

    public SetLoader(IntegrationRepository repository, OrganizationService organizationService,
            CredentialService credentialService,
            ResourceLoader loader) {
        super(repository, organizationService, credentialService, loader);
        if (this.integrationSetInput == null) {
            this.integrationSetInput = Arrays.asList("set/integration_sets.json");
        }
    }

    /**
     * Loads integration sets from the given, configurable resource (a list of
     * inputs).
     */
    public Loading init(Loading loading) {

        loading.setStatus(LoadingStatus.LOADING);

        for (String setInput : this.integrationSetInput) {
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            if (inputStream == null) {
                try {
                    File file = ResourceUtils.getFile(setInput);
                    logger.info("Reading set integrations from {}", setInput);
                    inputStream = new FileInputStream(file);
                } catch (FileNotFoundException e) {
                    logger.error("{} not found.", setInput);
                    loading.addError(Long.valueOf(0), setInput + " not found");
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

                preRootNode = (objectMapper.readTree(preInputStream)).path("integrationGroups");
                rootNode = (objectMapper.readTree(actualInputStream)).path("integrationGroups");

            } catch (StreamReadException e) {
                logger.error("{} contains invalid content. {}", setInput, e.getMessage());
                loading.addError(Long.valueOf(0),
                        setInput + " contains invalid content");
                inputStream = null;
                break;
            } catch (IOException e) {
                logger.error("{} IO exception.", setInput);
                loading.addError(Long.valueOf(0), setInput + " IO exception");
            }

            // precheck for, e.g., the number of removed integrations
            Map<Integer, List<Long>> preProcessed = processNodes(loading, preRootNode, true);

            // if preprocessing detects any errors, fail fast
            if (preProcessed.keySet().isEmpty() || loading.getErrors().size() > 0) {
                logger.error("Preprocessing input {} failed.", setInput);
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
            List<Long> existingIds = integrationRepository.getAllSetIdsByDeploymentPhase(deploymentPhase);
            logger.info("Number of existing set integrations in deployment phase {}: {}", deploymentPhase,
                    existingIds.size());

            List<Long> preRemovedIds = new ArrayList<>(existingIds);
            if (preRemovedIds.removeAll(preProcessed.get(deploymentPhase))) {
                logger.info("Prechecking {} inactivated integrations.", preRemovedIds.size());
                if (preRemovedIds.size() > this.maxRemovalNumber) {
                    logger.error("Maximum number of removals ({}) exceeded. Skipping input from {}",
                            this.maxRemovalNumber, setInput);
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
    protected Optional<Integration> applyUpdate(Loading loading, Integration integration,
            Optional<Integration> existingIntegration) {

        logger.debug("Comparing existing integration #{} version {} to #{} version {}",
                existingIntegration.get().getId(), existingIntegration.get().getVersion(),
                integration.getId(), integration.getVersion());
        DiffResult<Integration> diff = IntegrationDiffBuilder.compareSet(existingIntegration.get(),
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
                        if (d.getFieldName().contains("configurationEntity.set.name")) {
                            existingIntegration.get().getConfigurationEntity().getSet()
                                    .setName(d.getRight().toString());
                        }
                        if (d.getFieldName().contains("organization.oid")) {
                            if (existingIntegration.get().getOrganization() != null) {
                                /*
                                 * existingIntegration.get().getOrganization().setOid(d.getRight().toString());
                                 */
                                updateIntegrationOrganization(loading, existingIntegration.get(), (String) d.getRight(),
                                        false, true);
                            } else {
                                Organization org = new Organization("", d.getRight().toString());
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
            }
        } else {
            logger.error("Comparison failed. Check input data structure and values.");
            loading.addError(integration, "Comparison failed");
        }
        return existingIntegration;
    }

    public void setInput(String location) throws IOException {
        this.integrationSetInput = new ArrayList<>();
        this.integrationSetInput.add(location);
        Resource resource = resourceLoader.getResource("classpath:" + location);
        this.inputStream = resource.getInputStream();
    }
}
