package fi.mpass.voh.api.loading;

import java.util.Map;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.exception.LoadingException;
import fi.mpass.voh.api.integration.Integration;

@Service
public class LoadingService {
    private static final Logger logger = LoggerFactory.getLogger(LoadingService.class);

    private final LoadingRepository loadingRepository;
    private final IdentityProviderLoader identityProviderLoader;
    private final SetLoader setLoader;
    private final ServiceProviderLoader serviceProviderLoader;
    private static Lock lock = new ReentrantLock();

    public LoadingService(LoadingRepository loadingRepository, IdentityProviderLoader identityProviderLoader,
            SetLoader integrationSetLoader,
            ServiceProviderLoader serviceProviderLoader) {
        this.loadingRepository = loadingRepository;
        this.identityProviderLoader = identityProviderLoader;
        this.setLoader = integrationSetLoader;
        this.serviceProviderLoader = serviceProviderLoader;
    }

    public Loading getLoadingStatus() {
        return loadingRepository.findFirstByOrderByTimeDesc();
    }

    public Loading start(@Valid Loading loading) {
        lock.lock();
        try {
            if (loading != null && loading.getType() != null && loading.getStatus() != null) {
                if (loading.getStatus() == LoadingStatus.STARTED) {
                    logger.info("Started {} loading", loading.getType());
                    loading.setStatus(LoadingStatus.LOADING);
                    loadingRepository.save(loading);
                    switch (loading.getType()) {
                        case IDP:
                            loading = identityProviderLoader.init(loading);
                            break;
                        case SP:
                            loading = serviceProviderLoader.init(loading);
                            break;
                        case SET:
                            loading = setLoader.init(loading);
                            break;
                        case ALL:
                            loading = setLoader.init(loading);
                            if (loading.getErrors().size() == 0) {
                                loading = serviceProviderLoader.init(loading);
                            }
                            if (loading.getErrors().size() == 0) {
                                loading = identityProviderLoader.init(loading);
                            }
                    }
                    loadingRepository.save(loading);
                    if (loading.getStatus() == LoadingStatus.FAILED) {
                        throw new LoadingException(mapToString(loading.getErrors()));
                    }
                }
            }
        } finally {
            lock.unlock();
        }
        return loading;
    }

    private String mapToString(Map<Long, String> map) {
        StringBuilder mapAsString = new StringBuilder("");
        for (Map.Entry<Long, String> entry : map.entrySet()) {
            mapAsString.append("Integration #" + entry.getKey() + ": " + entry.getValue() + ";");
        }
        return mapAsString.toString();
    }

    public Integration loadOne(Integration integration) {
        Loading loading = new Loading();
        lock.lock();
        try {
            if (integration != null) {
                if (integration.getConfigurationEntity() != null &&
                        integration.getConfigurationEntity().getIdp() != null) {
                    logger.info("Started {} loading", integration.getConfigurationEntity().getIdp().getType());
                    loading.setStatus(LoadingStatus.LOADING);
                    integration = identityProviderLoader.updateExistingIntegration(loading, integration);
                    integration = identityProviderLoader.updateIntegrationTypeSpecificInformation(loading, integration);
                }

                if (integration.getConfigurationEntity() != null &&
                        integration.getConfigurationEntity().getSp() != null) {
                    logger.info("Started {} loading", integration.getConfigurationEntity().getSp().getType());
                    loading.setStatus(LoadingStatus.LOADING);
                    integration = serviceProviderLoader.updateExistingIntegration(loading, integration);
                }

                loadingRepository.save(loading);
                if (loading.getStatus() == LoadingStatus.FAILED) {
                    throw new LoadingException(mapToString(loading.getErrors()));
                }
            }
        } finally {
            lock.unlock();
        }
        return integration;
    }
}
