package fi.mpass.voh.api.config.ui;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

import com.fasterxml.jackson.annotation.JsonIncludeProperties;

@Configuration
@PropertySource(value = "classpath:default_userinterface_configuration.json", factory = JsonPropertySourceFactory.class)
@ConfigurationProperties
@JsonIncludeProperties({ "oid", "type", "name", "mandatory", "deploymentPhase", "validation", "integrationType" })
public class DefaultUserInterfaceConfiguration extends UserInterfaceConfiguration {
}
