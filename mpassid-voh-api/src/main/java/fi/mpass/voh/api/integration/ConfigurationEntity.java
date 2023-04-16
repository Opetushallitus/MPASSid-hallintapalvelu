package fi.mpass.voh.api.integration;

import java.util.Set;

import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.PrimaryKeyJoinColumn;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.sp.ServiceProvider;

@Entity
@JsonInclude(Include.NON_NULL)
public class ConfigurationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
    private long id;

    @JsonManagedReference
    @OneToMany(mappedBy="configurationEntity", cascade = CascadeType.ALL)
    private Set<Attribute> attributes;
    
    @OneToOne(mappedBy = "configurationEntity", cascade = CascadeType.ALL)
    @PrimaryKeyJoinColumn
    private IdentityProvider idp;

    @OneToOne(mappedBy = "configurationEntity", cascade = CascadeType.ALL)
    @PrimaryKeyJoinColumn
    private ServiceProvider sp;

    @JsonIgnore
    private String role;

    public ConfigurationEntity() { }

    public ConfigurationEntity(long id) {
        this.id = id;
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
}
