package fi.mpass.voh.api.loading;

import javax.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class LoadingService {
    private static final Logger logger = LoggerFactory.getLogger(LoadingService.class);

    private final LoadingRepository loadingRepository;
    private final IdentityProviderLoader integrationLoader;
    private final SetLoader integrationSetLoader;
    private final ServiceProviderLoader serviceProviderLoader;

    public LoadingService(LoadingRepository loadingRepository, IdentityProviderLoader identityProviderLoader,
            SetLoader integrationSetLoader,
            ServiceProviderLoader serviceProviderLoader) {
        this.loadingRepository = loadingRepository;
        this.integrationLoader = identityProviderLoader;
        this.integrationSetLoader = integrationSetLoader;
        this.serviceProviderLoader = serviceProviderLoader;
    }

    public Loading getLoadingStatus() {
        return loadingRepository.findFirstByOrderByTimeDesc();
    }

    public Loading start(@Valid Loading loading) {
        logger.info("Started loading");

        if (loading != null && loading.getType() != null && loading.getStatus() != null) {
            if (loading.getStatus() == LoadingStatus.STARTED) {
                loading.setStatus(LoadingStatus.LOADING);
                loadingRepository.save(loading);
                switch (loading.getType()) {
                    case IDP:
                        loading = integrationLoader.init(loading);
                        break;
                    case SP:
                        loading = serviceProviderLoader.init(loading);
                        break;
                    case SET:
                        loading = integrationSetLoader.init(loading);
                        break;
                    case ALL:
                        loading = integrationSetLoader.init(loading);
                        loading = serviceProviderLoader.init(loading);
                        loading = integrationLoader.init(loading);
                }
                loadingRepository.save(loading);
            }
        }
        return loading;
    }

}
