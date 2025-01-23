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

    private String metadataBaseUrlUi;
    private String metadataBaseUrl;
    private String metadataBasePath;
    private String redirectUriReference;
    private String redirectUriReferenceValue;
    private String redirectUriValue1;
    private String redirectUriValue2;

    @ConstructorBinding
    public IntegrationServiceConfiguration(String adminOrganizationOid, Long defaultTestServiceIntegrationId,
            String imageBaseUrlUi,
            String imageBaseUrl, String imageBasePath, String metadataBaseUrlUi, String metadataBaseUrl, String metadataBasePath, String redirectUriReference, String redirectUriReferenceValue,
            String redirectUriValue1, String redirectUriValue2) {
        this.adminOrganizationOid = adminOrganizationOid;
        this.defaultTestServiceIntegrationId = defaultTestServiceIntegrationId;
        this.imageBaseUrlUi = imageBaseUrlUi;
        this.imageBaseUrl = imageBaseUrl;
        this.imageBasePath = imageBasePath;
        this.metadataBaseUrlUi = metadataBaseUrlUi;
        this.metadataBaseUrl = metadataBaseUrl;
        this.metadataBasePath = metadataBasePath;
        this.redirectUriReference = redirectUriReference;
        this.redirectUriReferenceValue = redirectUriReferenceValue;
        this.redirectUriValue1 = redirectUriValue1;
        this.redirectUriValue2 = redirectUriValue2;
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
    public String getMetadataBaseUrlUi() {
        return metadataBaseUrlUi;
    }
    public void setMetadataBaseUrlUi(String metadataBaseUrlUi) {
        this.metadataBaseUrlUi = metadataBaseUrlUi;
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

    public String getRedirectUriReference() {
        return redirectUriReference;
    }

    public void setRedirectUriReference(String redirectUriReference) {
        this.redirectUriReference = redirectUriReference;
    }

    public String getRedirectUriReferenceValue() {
        return redirectUriReferenceValue;
    }

    public void setRedirectUriReferenceValue(String redirectUriReferenceValue) {
        this.redirectUriReferenceValue = redirectUriReferenceValue;
    }

    public String getRedirectUriValue1() {
        return redirectUriValue1;
    }

    public void setRedirectUriValue1(String redirectUriValue1) {
        this.redirectUriValue1 = redirectUriValue1;
    }

    public String getRedirectUriValue2() {
        return redirectUriValue2;
    }

    public void setRedirectUriValue2(String redirectUriValue2) {
        this.redirectUriValue2 = redirectUriValue2;
    }
}
