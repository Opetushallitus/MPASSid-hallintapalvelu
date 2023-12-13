package fi.mpass.voh.api.organization;

import java.util.Map;

import javax.persistence.Entity;
import javax.persistence.Id;

import com.fasterxml.jackson.annotation.JsonProperty;

import org.hibernate.annotations.Immutable;

@Entity
@Immutable
public class Organization {

    @Id
    private String oid;
    private String name;

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
                ", oid='" + getOid() + "'" +
                "}";
    }
}
