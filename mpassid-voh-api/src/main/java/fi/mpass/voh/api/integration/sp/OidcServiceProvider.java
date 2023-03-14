package fi.mpass.voh.api.integration.sp;

import javax.persistence.Column;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@DiscriminatorValue("oidc")
@JsonIgnoreProperties(ignoreUnknown = true)
public class OidcServiceProvider extends ServiceProvider {

    private String clientSecret;
    @Column(unique=true)
    private String clientId;

    public OidcServiceProvider() {};

    public OidcServiceProvider(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return this.clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getClientId() {
        return this.clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

}