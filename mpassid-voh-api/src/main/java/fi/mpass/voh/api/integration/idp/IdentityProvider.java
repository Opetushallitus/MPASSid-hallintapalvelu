package fi.mpass.voh.api.integration.idp;

import javax.persistence.InheritanceType;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.MapsId;
import javax.persistence.OneToOne;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.sp.ServiceProvider;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;

import javax.persistence.DiscriminatorType;
import javax.persistence.ElementCollection;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import javax.persistence.CascadeType;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.DiscriminatorColumn;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Inheritance;

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

    @Id
    @Column(name = "configuration_entity_id")
    @JsonIgnore
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "configuration_entity_id")
    @JsonIgnore
    private ConfigurationEntity configurationEntity;

    // Instruct Jackson not to deserialize input institution types json,
    // instead handle the conversion through the IntegrationConfig class
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @ElementCollection
    @CollectionTable(name = "identity_provider_institution_types", joinColumns = @JoinColumn(name = "configuration_entity_id"))
    @Column(name = "institution_type")
    // @Schema(ref="https://koski.opintopolku.fi/koski/dokumentaatio/koodisto/oppilaitostyyppi/latest")
    private Set<Integer> institutionTypes = new HashSet<>();

    // Instruct Jackson not to deserialize input allowed service providers json, i.e. Object vs. List,
    // instead handle the conversion through the IntegrationConfig class
    @JsonManagedReference
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @ManyToMany(cascade = { CascadeType.MERGE })
    @JoinTable(name = "allowedServiceProviders", joinColumns = @JoinColumn(name = "idp_ce_id", referencedColumnName = "configuration_entity_id"),
                                                inverseJoinColumns = @JoinColumn(name = "sp_ce_id", referencedColumnName = "configuration_entity_id"))
    private Set<ServiceProvider> allowedServiceProviders = new HashSet<>();

    @Column(name = "type", insertable = false, updatable = false)
    private String type;

    private String idpId;
    private String logoUrl;
    @Column(unique = true)
    private String flowName;

    /* Identity Provider type specific identifiers used for the default sorting/search implementation should be also declared here */
    /* No getter or setter methods declared for these fields, only the corresponding child class contains those methods */
    @Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea32")
    private String entityId;
    private String tenantId;
    @Column(name="wilma_hostname")
    private String hostname;

    @Column(name = "metadata_valid_until", columnDefinition = "DATE")
    private LocalDate metadataValidUntil;

    @Column(name = "signing_certificate_valid_until", columnDefinition = "DATE")
    private LocalDate signingCertificateValidUntil;

    @Column(name = "encryption_certificate_valid_until", columnDefinition = "DATE")
    private LocalDate encryptionCertificateValidUntil;


    public IdentityProvider() { }

    public IdentityProvider(String idpId, String logoUrl, String flowName) {
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
 
    public void addAllowedServiceProvider(ServiceProvider sp) {
        allowedServiceProviders.add(sp);
        sp.getAllowingIdentityProviders().add(this);
    }

    public void removeAllowedServiceProvider(ServiceProvider sp) {
        allowedServiceProviders.remove(sp);
        sp.getAllowingIdentityProviders().remove(this);
    }

    public Set<ServiceProvider> getAllowedServiceProviders() {
        return this.allowedServiceProviders;
    }

    public void setAllowedServiceProviders(Set<ServiceProvider> allowedServiceProviders) {
        for (ServiceProvider sp : allowedServiceProviders) {
            this.addAllowedServiceProvider(sp);
        }
    }
}
