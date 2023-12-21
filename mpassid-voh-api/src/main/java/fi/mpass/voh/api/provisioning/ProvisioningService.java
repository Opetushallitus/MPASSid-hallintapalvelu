package fi.mpass.voh.api.provisioning;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.Integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ProvisioningService {
    private final static Logger logger = LoggerFactory.getLogger(ProvisioningService.class);

    private final ProvisioningRepository provisionRepository;
    private final IntegrationService integrationService;

    public ProvisioningService(ProvisioningRepository provisionRepository, IntegrationService integrationService) {
        this.provisionRepository = provisionRepository;
        this.integrationService = integrationService;
    }

    public Provisioning updateProvisioning(Provisioning provisioning) {
        LocalDateTime localTime = LocalDateTime.now(ZoneId.of("Europe/Helsinki"));
        if (provisioning != null) {
            Optional<Provisioning> provision = provisionRepository
                    .findByDeploymentPhase(provisioning.getDeploymentPhase());
            if (!provision.isPresent()) {
                logger.info("Updating provisioning for deployment phase " + provisioning.getDeploymentPhase());
                provision = Optional.of(new Provisioning(provisioning.getDeploymentPhase()));
            }
            if (provisioning.getLastTime() != null) {
                provision.get().setLastTime(provisioning.getLastTime());
            } else {
                provision.get().setLastTime(localTime);
            }
            return provisionRepository.saveAndFlush(provision.get());
        }
        return provisioning;
    }

    public ConfigurationStatus getConfigurationStatus() {

        // lookup integration changes since provision.getLastUpdateTime
        Optional<Provisioning> provision = provisionRepository.findByDeploymentPhase(1);
        if (provision.isPresent()) {
            List<Integration> integrationsSince = integrationService
                    .getIntegrationsSince(provision.get().getLastTime());
            boolean changes = !integrationsSince.isEmpty();
            logger.info("Number of changed integrations: " + integrationsSince.size() + " since "
                    + provision.get().getLastTime());
            if (changes) {
                Collections.sort(integrationsSince, (o1, o2) -> o1.getLastUpdatedOn().compareTo(o2.getLastUpdatedOn()));
                logger.info("Oldest changed integration dated on " + integrationsSince.get(0).getLastUpdatedOn()
                        + " since " + provision.get().getLastTime());
                return new ConfigurationStatus(changes, integrationsSince.get(0).getLastUpdatedOn());
            } else {
                logger.info("No changes since " + provision.get().getLastTime());
                return new ConfigurationStatus(changes, null);
            }
        } else {
            logger.error("No provision information available.");
        }
        return new ConfigurationStatus(false, null);
    }

    public List<ConfigurationStatus> getConfigurationStatuses() {

        List<ConfigurationStatus> statuses = new ArrayList<ConfigurationStatus>();

        // deploymentPhase: 0 testing, 1 production, 2 preproduction, 3 reserved
        for (int i = 0; i < 3; i++) {
            // lookup integration changes since provision.getLastUpdateTime
            Optional<Provisioning> provision = provisionRepository.findByDeploymentPhase(i);
            if (provision.isPresent()) {
                List<Integration> integrationsSince = integrationService
                        .getIntegrationsByPermissionUpdateTimeSince(provision.get().getLastTime(), i);
                boolean changes = !integrationsSince.isEmpty();
                logger.info("Number of changed integration permissions: " + integrationsSince.size() + " since "
                        + provision.get().getLastTime() + " in deployment phase " + i);
                if (changes) {
                    // sort the integration's permissions by the last update time
                    // the first is the oldest
                    for (Integration integration : integrationsSince) {
                        integration.sortPermissionsByLastUpdatedOn();
                    }
                    // should not end up here if no changes to permissions, yet check
                    // permissions existence (index exception)
                    try {
                        Collections.sort(integrationsSince,
                                (o1, o2) -> o1.getPermissions().get(0).getLastUpdatedOn()
                                        .compareTo(o2.getPermissions().get(0).getLastUpdatedOn()));
                    } catch (Exception e) {
                        logger.error("Error in getting the oldest integration by permission last update time.");
                        continue;
                    }
                    logger.info("Oldest changed integration (by permission last update time) dated on "
                            + integrationsSince.get(0).getPermissions().get(0).getLastUpdatedOn()
                            + " since " + provision.get().getLastTime() + " in deployment phase " + i);
                    statuses.add(new ConfigurationStatus(changes,
                            integrationsSince.get(0).getPermissions().get(0).getLastUpdatedOn(), i));
                } else {
                    logger.info("No changes (by permission last update time) since  " + provision.get().getLastTime()
                            + " in deployment phase " + i);
                    statuses.add(new ConfigurationStatus(changes, null, i));
                }
            } else {
                logger.info("No provision information available for deployment phase " + i);
            }
        }
        return statuses;
    }
}
