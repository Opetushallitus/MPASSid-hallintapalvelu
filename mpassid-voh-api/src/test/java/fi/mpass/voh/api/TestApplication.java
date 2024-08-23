package fi.mpass.voh.api;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.test.context.TestPropertySource;

import fi.mpass.voh.api.config.IntegrationServiceConfiguration;

@SpringBootApplication
@EnableConfigurationProperties(value = IntegrationServiceConfiguration.class)
@TestPropertySource("classpath:application.properties")
public class TestApplication {
}