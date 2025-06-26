package fi.mpass.voh.api.integration.idp;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;

@Audited
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type", discriminatorType = DiscriminatorType.STRING)
@Schema(subTypes = { Adfs.class, Azure.class, Gsuite.class, Opinsys.class, Wilma.class }, discriminatorMapping = {
        @DiscriminatorMapping(value = "adfs", schema = Adfs.class),
        @DiscriminatorMapping(value = "azure", schema = Azure.class),
        @DiscriminatorMapping(value = "gsuite", schema = Gsuite.class),
        @DiscriminatorMapping(value = "opinsys", schema = Opinsys.class),
        @DiscriminatorMapping(value = "wilma", schema = Wilma.class) })
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({ @Type(value = Azure.class, name = "azure"), @Type(value = Opinsys.class, name = "opinsys"),
        @Type(value = Wilma.class, name = "wilma"), @Type(value = Adfs.class, name = "adfs"),
        @Type(value = Gsuite.class, name = "gsuite") })
@JsonInclude(Include.NON_NULL)
public abstract class IdentityProvider {

    public enum Type {
        adfs, azure, gsuite, opinsys, wilma
    }

    @Id
    @Column(name = "configuration_entity_id")
    @JsonIgnore
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "configuration_entity_id")
    @JsonIgnore
    private ConfigurationEntity configurationEntity;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "identity_provider_institution_types", joinColumns = @JoinColumn(name = "configuration_entity_id"))
    @Column(name = "institution_type")
    // TODO koodisto-api
    // @Schema(ref="https://koski.opintopolku.fi/koski/dokumentaatio/koodisto/oppilaitostyyppi/latest")
    private Set<Integer> institutionTypes = new HashSet<>();

    @Column(name = "type", insertable = false, updatable = false)
    private String type;

    private String idpId;
    private String logoUrl;
    // @Column(unique = true)
    private String flowName;

    /*
     * Identity Provider type specific identifiers used for the default
     * sorting/search implementation should be declared here
     */
    /*
     * No getter or setter methods declared for these fields, only the corresponding
     * child class contains those methods
     */
    //@Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea32")
    protected String entityId;
    protected String tenantId;
    @Schema(description = "Kirjautumisosoite")
    @Column(name="wilma_hostname")
    protected String hostname;

    @Column(name = "metadata_valid_until", columnDefinition = "DATE")
    protected LocalDate metadataValidUntil;

    @Column(name = "signing_certificate_valid_until", columnDefinition = "DATE")
    protected LocalDate signingCertificateValidUntil;

    @Column(name = "encryption_certificate_valid_until", columnDefinition = "DATE")
    protected LocalDate encryptionCertificateValidUntil;

    protected IdentityProvider() {
    }

    protected IdentityProvider(String idpId, String logoUrl, String flowName) {
        this.idpId = idpId;
        this.logoUrl = logoUrl;
        this.flowName = flowName;
    }

    public String getIdpId() {
        return this.idpId;
    }

    public void setIdpId(String idpId) {
        this.idpId = idpId;
    }

    public Set<Integer> getInstitutionTypes() {
        return this.institutionTypes;
    }

    public void setInstitutionTypes(Set<Integer> institutionTypes) {
        this.institutionTypes = institutionTypes;
    }

    public String getLogoUrl() {
        return this.logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getFlowName() {
        return this.flowName;
    }

    public void setFlowName(String flowName) {
        this.flowName = flowName;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ConfigurationEntity getConfigurationEntity() {
        return this.configurationEntity;
    }

    public void setConfigurationEntity(ConfigurationEntity configurationEntity) {
        this.configurationEntity = configurationEntity;
    }

    public String getType() {
        if (this.type != null) {
            return this.type;
        }
        return this.getClass().getSimpleName().toLowerCase();
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

    public void setSigningCertificateValidUntil(LocalDate signingCertificateValidUntil) {
        this.signingCertificateValidUntil = signingCertificateValidUntil;
    }

    public LocalDate getEncryptionCertificateValidUntil() {
        return this.encryptionCertificateValidUntil;
    }

    public void setEncryptionCertificateValidUntil(LocalDate encryptionCertificateValidUntil) {
        this.encryptionCertificateValidUntil = encryptionCertificateValidUntil;
    }
}
