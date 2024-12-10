package fi.mpass.voh.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties(prefix = "application.integrationservice")
@Validated
public class IntegrationServiceConfiguration {

    private String adminOrganizationOid;
    private Long defaultTestServiceIntegrationId;

    private String imageBaseUrlUi;
    private String imageBaseUrl;
    @NotBlank
    private String imageBasePath;

    private String metadataBaseUrl;
    private String metadataBasePath;

    @ConstructorBinding
    public IntegrationServiceConfiguration(String adminOrganizationOid, Long defaultTestServiceIntegrationId, String imageBaseUrlUi,
            String imageBaseUrl, String imageBasePath, String metadataBaseUrl, String metadataBasePath) {
        this.adminOrganizationOid = adminOrganizationOid;
        this.defaultTestServiceIntegrationId = defaultTestServiceIntegrationId;
        this.imageBaseUrlUi = imageBaseUrlUi;
        this.imageBaseUrl = imageBaseUrl;
        this.imageBasePath = imageBasePath;
        this.metadataBaseUrl = metadataBaseUrl;
        this.metadataBasePath = metadataBasePath;
    }

    public IntegrationServiceConfiguration() {
    }

    public String getAdminOrganizationOid() {
        return adminOrganizationOid;
    }
    public void setAdminOrganizationOid(String adminOrganizationOid) {
        this.adminOrganizationOid = adminOrganizationOid;
    }
    public Long getDefaultTestServiceIntegrationId() {
        return defaultTestServiceIntegrationId;
    }
    public void setDefaultTestServiceIntegrationId(Long defaultTestServiceIntegrationId) {
        this.defaultTestServiceIntegrationId = defaultTestServiceIntegrationId;
    }
    public String getImageBaseUrlUi() {
        return imageBaseUrlUi;
    }
    public void setImageBaseUrlUi(String imageBaseUrlUi) {
        this.imageBaseUrlUi = imageBaseUrlUi;
    }
    public String getImageBaseUrl() {
        return imageBaseUrl;
    }
    public void setImageBaseUrl(String imageBaseUrl) {
        this.imageBaseUrl = imageBaseUrl;
    }
    public String getImageBasePath() {
        return imageBasePath;
    }
    public void setImageBasePath(String imageBasePath) {
        this.imageBasePath = imageBasePath;
    }
    public String getMetadataBaseUrl() {
        return metadataBaseUrl;
    }
    public void setMetadataBaseUrl(String metadataBaseUrl) {
        this.metadataBaseUrl = metadataBaseUrl;
    }
    public String getMetadataBasePath() {
        return metadataBasePath;
    }
    public void setMetadataBasePath(String metadataBasePath) {
        this.metadataBasePath = metadataBasePath;
    }
}
