package fi.mpass.voh.api.config;

import org.opensaml.core.config.InitializationException;
import org.opensaml.core.config.InitializationService;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenSAMLConfig {

    public OpenSAMLConfig() {
        try {
            InitializationService.initialize();
        } catch (final InitializationException e) {
            throw new RuntimeException("Exception initializing OpenSAML", e);
        }
    }
}
