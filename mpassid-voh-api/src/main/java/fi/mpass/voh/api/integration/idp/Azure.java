package fi.mpass.voh.api.integration.idp;

import java.time.LocalDate;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;
import io.swagger.v3.oas.annotations.media.Schema;

@Entity
@DiscriminatorValue("azure")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Azure extends IdentityProvider {

    @Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea32")
    private String entityId;

    private String metadataUrl;

    private LocalDate metadataValidUntil;
    private LocalDate signingCertificateValidUntil;
    private LocalDate encryptionCertificateValidUntil;

    public Azure() {
        super();
    };

    public Azure(String entityId) {
        super();
        this.entityId = entityId;
    }

    public Azure(String idpId, String logoUrl, String flowName) {
        super(idpId, logoUrl, flowName);
    }

    public String getEntityId() {
        return this.entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getMetadataUrl() {
        return metadataUrl;
    }

    public void setMetadataUrl(String metadataUrl) {
        this.metadataUrl = metadataUrl;
        SamlMetadataProvider metadataProvider = new SamlMetadataProvider(metadataUrl);
        this.metadataValidUntil = metadataProvider.getMetadataValidUntil();
        this.signingCertificateValidUntil = metadataProvider.getSigningCertificateValidUntil();
        this.encryptionCertificateValidUntil = metadataProvider.getEncryptionCertificateValidUntil();
    }

    public LocalDate getMetadataValidUntil() {
        return this.metadataValidUntil;
    }

    public LocalDate getSigningCertificateValidUntil() {
        return this.signingCertificateValidUntil;
    }

    public LocalDate getEncryptionCertificateValidUntil() {
        return this.encryptionCertificateValidUntil;
    }
}
