package fi.mpass.voh.api.integration;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrimaryKeyJoinColumn;

import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.ServiceProvider;

@Audited
@Entity
@JsonInclude(Include.NON_NULL)
public class ConfigurationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
    private long id;

    @OneToOne(optional=false, mappedBy="configurationEntity")
    private Integration integration;

    @JsonManagedReference
    @OneToMany(mappedBy = "configurationEntity", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    @OrderBy("name")
    private Set<Attribute> attributes = new HashSet<Attribute>();

    @OneToOne(mappedBy = "configurationEntity", cascade = CascadeType.ALL)
    @PrimaryKeyJoinColumn
    private IdentityProvider idp;

    @OneToOne(mappedBy = "configurationEntity", cascade = CascadeType.ALL)
    @PrimaryKeyJoinColumn
    private ServiceProvider sp;

    @OneToOne(mappedBy = "configurationEntity", cascade = CascadeType.ALL)
    @PrimaryKeyJoinColumn
    private IntegrationSet set;

    @JsonIgnore
    private String role;

    public ConfigurationEntity() {
        this.attributes = new HashSet<Attribute>();
    }

    public ConfigurationEntity(long id) {
        this.id = id;
        this.attributes = new HashSet<Attribute>();
    }

    public long getId() {
        return this.id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Set<Attribute> getAttributes() {
        return this.attributes;
    }

    public void setAttributes(Set<Attribute> attributes) {
        this.attributes = attributes;
    }

    public IdentityProvider getIdp() {
        return this.idp;
    }

    public void setIdp(IdentityProvider idp) {
        this.idp = idp;
        this.idp.setConfigurationEntity(this);
        this.role = "idp";
    }

    public ServiceProvider getSp() {
        return this.sp;
    }

    public void setSp(ServiceProvider sp) {
        this.sp = sp;
        this.sp.setConfigurationEntity(this);
        this.role = "sp";
    }

    public IntegrationSet getSet() {
        return this.set;
    }

    public void setSet(IntegrationSet set) {
        this.set = set;
        this.set.setConfigurationEntity(this);
        this.role = "set";
    }
}
