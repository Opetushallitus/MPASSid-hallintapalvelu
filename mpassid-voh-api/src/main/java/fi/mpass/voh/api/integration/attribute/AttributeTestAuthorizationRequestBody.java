package fi.mpass.voh.api.integration.attribute;

public class AttributeTestAuthorizationRequestBody {

    private Long id;
    private String clientId;
    private String clientSecret;
     
    public AttributeTestAuthorizationRequestBody(Long id, String clientId, String clientSecret) {
        this.id = id;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public String getClientId() {
        return clientId;
    }
    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
    public String getClientSecret() {
        return clientSecret;
    }
    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }
}
