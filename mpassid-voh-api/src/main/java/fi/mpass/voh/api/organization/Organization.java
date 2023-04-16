package fi.mpass.voh.api.organization;

import java.util.Map;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

import com.fasterxml.jackson.annotation.JsonProperty;

import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table
public class Organization {

    @Id
    private String oid;
    private String name;
    @JsonProperty("ytunnus")
    private String businessId;

    public Organization() { }

    public Organization(String name, String businessId, String oid) {
        this.name = name;
        this.businessId = businessId;
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

    @Override
    public String toString() {
        return "{" +
                " name='" + getName() + "'" +
                ", businessId='" + getBusinessId() + "'" +
                ", oid='" + getOid() + "'" +
                "}";
    }
}
