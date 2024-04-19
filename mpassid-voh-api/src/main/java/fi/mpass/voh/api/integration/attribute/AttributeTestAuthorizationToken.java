package fi.mpass.voh.api.integration.attribute;

import java.time.LocalDateTime;

public class AttributeTestAuthorizationToken {
    private String token;
    private LocalDateTime createdOn;

    public String getToken() {
        return token;
    }
    public void setToken(String token) {
        this.token = token;
    }
    public LocalDateTime getCreatedOn() {
        return createdOn;
    }
    public void setCreatedOn(LocalDateTime createdOn) {
        this.createdOn = createdOn;
    }
}
