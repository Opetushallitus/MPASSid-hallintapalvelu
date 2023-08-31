package fi.mpass.voh.api.integration.idp;

import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Audited
@Entity
@DiscriminatorValue("wilma")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Wilma extends IdentityProvider {

    @Column(name="wilma_hostname")
    String hostname;

    public Wilma() {};

    public Wilma(String hostname) {
        this.hostname = hostname;
    }
    
    public Wilma(String idpId, String logoUrl, String flowName) {
        super(idpId, logoUrl, flowName);
    }

    public String getHostname() {
        return hostname;
    }

    public void setHostname(String hostname) {
        this.hostname = hostname;
    }

}
