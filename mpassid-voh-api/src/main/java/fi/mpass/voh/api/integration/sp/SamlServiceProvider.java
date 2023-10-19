package fi.mpass.voh.api.integration.sp;

import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
@Audited
@Entity
@DiscriminatorValue("saml")
@JsonIgnoreProperties(ignoreUnknown = true)
public class SamlServiceProvider extends ServiceProvider {

    @Column(unique=true)
    private String entityId;

    public SamlServiceProvider() {};

    public SamlServiceProvider(String entityId) {
        this.entityId = entityId;
    };

    public String getEntityId() {
        return this.entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

}