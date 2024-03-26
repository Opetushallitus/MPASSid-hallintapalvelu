package fi.mpass.voh.api.integration.sp;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;

import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Audited
@Entity
@DiscriminatorValue("oidc")
@JsonIgnoreProperties(ignoreUnknown = true)
public class OidcServiceProvider extends ServiceProvider {

    public OidcServiceProvider() {}

    public OidcServiceProvider(String clientId) {
        this.clientId = clientId;
    }

    public String getClientId() {
        return this.clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

}