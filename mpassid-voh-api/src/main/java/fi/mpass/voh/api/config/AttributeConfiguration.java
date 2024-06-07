package fi.mpass.voh.api.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.web.context.WebApplicationContext;

import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.attribute.AttributeTestAuthorizationToken;

@Configuration
@PropertySource("classpath:integration_attributes.properties")
@ConfigurationProperties("integration")
public class AttributeConfiguration {

    private List<Attribute> attributes = new ArrayList<>();

    public List<Attribute> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<Attribute> attributes) {
        this.attributes = attributes;
    }

    @Bean
    @Scope(value = WebApplicationContext.SCOPE_SESSION, proxyMode = ScopedProxyMode.TARGET_CLASS)
    public AttributeTestAuthorizationToken token() {
        return new AttributeTestAuthorizationToken();
    }
}
