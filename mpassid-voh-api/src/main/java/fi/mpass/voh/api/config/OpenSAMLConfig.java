package fi.mpass.voh.api.config;

import org.opensaml.core.config.InitializationException;
import org.opensaml.core.config.InitializationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenSAMLConfig {
    private static final Logger logger = LoggerFactory.getLogger(OpenSAMLConfig.class);

    public OpenSAMLConfig() {
        try {
            InitializationService.initialize();
        } catch (final InitializationException e) {
            logger.error(e.getMessage());
            throw new RuntimeException("Exception initializing OpenSAML", e);
        }
    }
}
