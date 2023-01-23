package fi.mpass.voh.api.integration.idp;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@DiscriminatorValue("opinsys")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Opinsys extends IdentityProvider {

    private String tenantId;

    public Opinsys() {};

    public Opinsys(String tenantId) {
        this.tenantId = tenantId;
    };

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
