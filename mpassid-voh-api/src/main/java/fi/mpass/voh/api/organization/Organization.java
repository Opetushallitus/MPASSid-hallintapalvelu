package fi.mpass.voh.api.organization;

import java.util.List;
import java.util.Map;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Transient;

import com.fasterxml.jackson.annotation.JsonProperty;

import org.hibernate.annotations.Immutable;

@Entity
@Immutable
public class Organization {

    @Id
    private String oid;
    private String name;
    @JsonProperty("ytunnus")
    private String businessId;
    @Transient
    private List<SubOrganization> children;

    public Organization() { }

    public Organization(String name, String oid) {
        this.name = name;
        this.oid = oid;
    }

    @JsonProperty("nimi")
    private void unpackNested(Map<String, Object> name) {
        this.name = (String) name.get("fi");
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getBusinessId() {
        return this.businessId;
    }

    public void setBusinessId(String businessId) {
        this.businessId = businessId;
    }

    public String getOid() {
        return this.oid;
    }

    public void setOid(String oid) {
        this.oid = oid;
    }

    public List<SubOrganization> getChildren() {
        return children;
    }
    
    public void setChildren(List<SubOrganization> children) {
        this.children = children;
    }
    
    @Override
    public String toString() {
        return "{" +
                " name='" + getName() + "'" +
                ", oid='" + getOid() + "'" +
                ", children: " + getChildren() +
                "}";
    }
}
