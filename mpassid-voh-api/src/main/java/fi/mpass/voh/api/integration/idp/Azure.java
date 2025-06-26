package fi.mpass.voh.api.integration.idp;

import java.io.InputStream;
import java.time.LocalDate;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;

@Audited
@Entity
@DiscriminatorValue("azure")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Azure extends IdentityProvider {

    //@Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea32")
    //private String entityId;

    private String metadataUrl;

    public Azure() {
        super();
    }

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
    }

    public void setMetadataAndParse(String metadataUrl) {
        this.metadataUrl = metadataUrl;
        SamlMetadataProvider metadataProvider = new SamlMetadataProvider(metadataUrl);
        setMetadataValidUntil(metadataProvider.getMetadataValidUntil());
        setSigningCertificateValidUntil(metadataProvider.getSigningCertificateValidUntil());
        setEncryptionCertificateValidUntil(metadataProvider.getEncryptionCertificateValidUntil());
        setEntityId(metadataProvider.getEntityId());
    }

    public void setMetadataAndParse(InputStream inputStream) {
        SamlMetadataProvider metadataProvider = new SamlMetadataProvider(inputStream);
        setMetadataValidUntil(metadataProvider.getMetadataValidUntil());
        setSigningCertificateValidUntil(metadataProvider.getSigningCertificateValidUntil());
        setEncryptionCertificateValidUntil(metadataProvider.getEncryptionCertificateValidUntil());
        setEntityId(metadataProvider.getEntityId());
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

    public LocalDate getSigningCertificateValidUntil() {
        return this.signingCertificateValidUntil;
    }

    public LocalDate getEncryptionCertificateValidUntil() {
        return this.encryptionCertificateValidUntil;
    }

    public String getTenantId() {
        return this.tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }
}
