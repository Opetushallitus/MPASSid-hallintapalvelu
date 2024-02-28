package fi.mpass.voh.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;

import fi.mpass.voh.api.loading.Loading;
import fi.mpass.voh.api.loading.LoadingService;
import fi.mpass.voh.api.loading.LoadingStatus;
import fi.mpass.voh.api.loading.LoadingType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Order(value = Ordered.LOWEST_PRECEDENCE)
@Component
public class IntegrationsLoader implements CommandLineRunner {
        private static final Logger logger = LoggerFactory.getLogger(IntegrationsLoader.class);

        private static final String LOADING_STATUS = "Loading status";
        private static final String INTEGRATION = "Integration";

        @Value("${application.integration.loading.startup:false}")
        private boolean loadingFromFilesystem;

        LoadingService loadingService;

        public IntegrationsLoader(LoadingService loadingService) {
                this.loadingService = loadingService;
        }

        @Override
        public void run(String... args) throws Exception {
                if (loadingFromFilesystem) {
                        Loading loading = new Loading();
                        loading.setStatus(LoadingStatus.STARTED);
                        loading.setType(LoadingType.ALL);
                        loadingService.start(loading);
                        logger.info("{} {}", LOADING_STATUS, loading.getStatus());
                        if (!loading.getErrors().isEmpty()) {
                                loading.getErrors()
                                                .forEach((id, status) -> logger.error("{} #{}: {}", INTEGRATION, id,
                                                                status));
                        }
                } else {
                        logger.info("Integrations loading from the filesystem during application start-up is disabled");
                }
        }
}