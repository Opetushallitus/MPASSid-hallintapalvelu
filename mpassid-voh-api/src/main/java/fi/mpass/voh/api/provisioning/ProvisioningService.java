package fi.mpass.voh.api.provisioning;

import java.time.LocalDateTime;
import java.time.ZoneId;
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

    public Provisioning updateProvisioning() {
        LocalDateTime localTime = LocalDateTime.now(ZoneId.of("Europe/Helsinki"));

        Provisioning provision = provisionRepository.findById(1L).orElse(new Provisioning());
        provision.setLastTime(localTime);
        provisionRepository.save(provision);

        return provision;
    }

    public ConfigurationStatus getConfigurationStatus() {

        // lookup integration changes since provision.getLastUpdateTime
        Optional<Provisioning> provision = provisionRepository.findById(1L);
        if (provision.isPresent()) {
            List<Integration> integrationsSince = integrationService
                    .getIntegrationsSince(provision.get().getLastTime());
            boolean changes = !integrationsSince.isEmpty();
            logger.debug("Number of changed integrations: " + integrationsSince.size() + " since " + provision.get().getLastTime());
            if (changes) {
                Collections.sort(integrationsSince, (o1, o2) -> o1.getLastUpdatedOn().compareTo(o2.getLastUpdatedOn()));
                logger.debug("Oldest changed integration dated on " + integrationsSince.get(0).getLastUpdatedOn() + " since " + provision.get().getLastTime());
                return new ConfigurationStatus(changes, integrationsSince.get(0).getLastUpdatedOn());
            } else {
                logger.debug("Oldest changed integration dated on " + integrationsSince.get(0).getLastUpdatedOn() + " since " + provision.get().getLastTime());
                return new ConfigurationStatus(changes, integrationsSince.get(0).getLastUpdatedOn());
            }
        }
        return new ConfigurationStatus(false, null);
    }
}
