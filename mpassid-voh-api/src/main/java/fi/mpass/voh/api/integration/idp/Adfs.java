package fi.mpass.voh.api.integration.idp;

import java.time.LocalDate;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;

@Audited
@Entity
@DiscriminatorValue("adfs")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Adfs extends IdentityProvider {

    //@Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea33")
    //private String entityId;

    private String metadataUrl;

    private LocalDate metadataValidUntil;
    private LocalDate signingCertificateValidUntil;
    private LocalDate encryptionCertificateValidUntil;

    public Adfs() {
        super();
    }

    public Adfs(String idpId, String logoUrl, String flowName) {
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