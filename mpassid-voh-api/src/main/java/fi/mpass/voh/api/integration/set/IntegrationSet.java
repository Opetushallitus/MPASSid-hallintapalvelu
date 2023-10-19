package fi.mpass.voh.api.integration.set;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.MapsId;
import javax.persistence.OneToOne;

import com.fasterxml.jackson.annotation.JsonIgnore;

import fi.mpass.voh.api.integration.ConfigurationEntity;

import org.hibernate.envers.Audited;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Audited
@Entity
public class IntegrationSet {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationSet.class);

    public enum Type {
        sp, idp;

        public static boolean contains(String type) {
            for (Type t : Type.values()) {
                if (t.name().equals(type)) {
                    return true;
                }
            }
            return false;
        }
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

    private String type;
    private String name;

    public IntegrationSet() {
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
        return this.type;
    }

    public void setType(String type) {
        if (Type.contains(type)) {
            this.type = type;
        }
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

}
