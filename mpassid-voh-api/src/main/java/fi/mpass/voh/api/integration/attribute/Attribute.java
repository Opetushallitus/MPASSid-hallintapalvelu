package fi.mpass.voh.api.integration.attribute;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import io.swagger.v3.oas.annotations.media.Schema;

@Audited
@Entity
public class Attribute {

    @JsonIgnore
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @JsonIgnore
    private String oid;
    @Schema(type = "string", allowableValues = { "data", "user" })
    private String type;
    private String name;
    private String content;
    @JsonIgnore
    private String description;

    @JsonBackReference
    @ManyToOne
    @JoinColumn(name = "configuration_entity_id", referencedColumnName = "id")
    private ConfigurationEntity configurationEntity;

    public Attribute() {}

    public Attribute(String oid, String type, String name, String content, String description) {
        this.oid = oid;
        this.type = type;
        this.name = name;
        this.content = content;
        this.description = description;
    }

    public Attribute(String type, String name, String content) {
        this.oid = "";
        this.type = type;
        this.name = name;
        this.content = content;
        this.description = "";
    }

    public long getId() {
        return this.id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getOid() {
        return this.oid;
    }

    public void setOid(String oid) {
        this.oid = oid;
    }

    public String getType() {
        return this.type;
    }

    public void setType(String type) {
        this.type = "";
        // also specified in the Schema annotation above
        if (type.equals("data") || type.equals("user")) {
            this.type = type;
        }
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContent() {
        return this.content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getDescription() {
        return this.description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ConfigurationEntity getConfigurationEntity() {
        return this.configurationEntity;
    }

    public void setConfigurationEntity(ConfigurationEntity configurationEntity) {
        this.configurationEntity = configurationEntity;
    }

    @Override
    public String toString() {
        if (this.name != null) {
            return this.name;
        } else {
            return Long.toString(this.id);
        }
    }
}
