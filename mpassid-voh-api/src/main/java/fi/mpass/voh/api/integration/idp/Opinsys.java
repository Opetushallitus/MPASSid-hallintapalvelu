package fi.mpass.voh.api.integration.idp;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Audited
@Entity
@DiscriminatorValue("opinsys")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Opinsys extends IdentityProvider {

    //private String tenantId;

    public Opinsys() {}

    public Opinsys(String tenantId) {
        this.tenantId = tenantId;
    }

    public Opinsys(String idpId, String logoUrl, String flowName) {
        super(idpId, logoUrl, flowName);
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }
}
