package fi.mpass.voh.api.integration.idp;

import java.io.InputStream;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;

@Audited
@Entity
@DiscriminatorValue("gsuite")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Gsuite extends IdentityProvider {

    // @Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea34")
    // private String entityId;

    private String metadataUrl;

    @Column(name = "metadata_valid_until")
    private LocalDate metadataValidUntil;
    private LocalDate signingCertificateValidUntil;
    private LocalDate encryptionCertificateValidUntil;

    public Gsuite() {
    }

    public Gsuite(String idpId, String logoUrl, String flowName) {
        super(idpId, logoUrl, flowName);
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getMetadataUrl() {
        return metadataUrl;
    }

    public void setMetadataUrl(String metadataUrl) {
        this.metadataUrl = metadataUrl;
    }

    public void setMetadataUrlAndValidUntilDates(String metadataUrl) {
        this.metadataUrl = metadataUrl;
        SamlMetadataProvider metadataProvider = new SamlMetadataProvider(metadataUrl);
        this.metadataValidUntil = metadataProvider.getMetadataValidUntil();
        this.signingCertificateValidUntil = metadataProvider.getSigningCertificateValidUntil();
        this.encryptionCertificateValidUntil = metadataProvider.getEncryptionCertificateValidUntil();
    }

    public void setMetadataUrlAndValidUntilDates(InputStream inputStream) {
        SamlMetadataProvider metadataProvider = new SamlMetadataProvider(inputStream);
        this.metadataValidUntil = metadataProvider.getMetadataValidUntil();
        this.signingCertificateValidUntil = metadataProvider.getSigningCertificateValidUntil();
        this.encryptionCertificateValidUntil = metadataProvider.getEncryptionCertificateValidUntil();
    }

    public LocalDate getMetadataValidUntil() {
        return this.metadataValidUntil;
    }

    public void setMetadataValidUntil(LocalDate metadataValidUntil) {
        this.metadataValidUntil = metadataValidUntil;
    }

    public LocalDate getSigningCertificateValidUntil() {
        return this.signingCertificateValidUntil;
    }

    public LocalDate getEncryptionCertificateValidUntil() {
        return this.encryptionCertificateValidUntil;
    }
}
