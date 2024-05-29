package fi.mpass.voh.api.integration.attribute;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException.BadRequest;
import org.springframework.web.client.HttpClientErrorException.Unauthorized;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;

import fi.mpass.voh.api.exception.EntityNotFoundException;

@Component
public class AttributeValidator {
    private static final Logger logger = LoggerFactory.getLogger(AttributeValidator.class);

    private String loginBaseUrl;
    private String graphBaseUrl;
    private String authzPath;
    private String authzScope;
    private String usersPath;

    private final RestClient restClient;

    public AttributeValidator(
            @Value("${application.attribute.validator.entraid.login.baseurl}") final String loginBaseUrl,
            @Value("${application.attribute.validator.entraid.graph.baseurl}") final String graphBaseUrl,
            @Value("${application.attribute.validator.entraid.authz.path}") final String authzPath,
            @Value("${application.attribute.validator.entraid.authz.scope}") final String authzScope,
            @Value("${application.attribute.validator.entraid.users.path}") final String usersPath) {
        this.loginBaseUrl = loginBaseUrl;
        this.graphBaseUrl = graphBaseUrl;
        this.authzPath = authzPath;
        this.authzScope = authzScope;
        this.usersPath = usersPath;

        restClient = RestClient.builder().requestFactory(new HttpComponentsClientHttpRequestFactory())
                .build();
    }

    public Map<String, Object> getUserEntity(String accessToken, String principalName,
            List<String> selectedAttributes) {

        String selectedAttrs = "";
        for (int i = 0; i < selectedAttributes.size(); i++) {
            // selectedAttrs = selectedAttrs + URLEncoder.encode(selectedAttributes.get(i),
            // StandardCharsets.UTF_8);
            selectedAttrs = selectedAttrs + selectedAttributes.get(i);
            if (i < selectedAttributes.size() - 1) {
                selectedAttrs = selectedAttrs + ",";
            }
        }

        logger.debug("$select: {}", selectedAttrs);

        UserEntity response = null;
        try {
            response = restClient.get()
                    .uri(graphBaseUrl + usersPath.replaceAll("/+$", "") + "/" + principalName + "?$select="
                            + selectedAttrs)
                    .header("Authorization", "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(UserEntity.class);
        } catch (BadRequest badRequest) {
            logger.error("HTTP client bad request error: ", badRequest);
            throw new EntityNotFoundException("Bad request");
        } catch (Unauthorized unauthorized) {
            logger.error("HTTP client unauthorized error: ", unauthorized);
            throw new EntityNotFoundException("Unauthorized");
        } catch (Exception e) {
            logger.error("HTTP client error: ", e);
            throw new EntityNotFoundException("User entity or attributes not found");
        }

        if (response != null)
            return response.getFields();

        return new LinkedHashMap<>();
    }

    // retrieve access token (parameters: user input client_id, client_secret,
    // integration tenant_id)
    // TODO https://github.com/spring-projects/spring-security/issues/13588
    public String getToken(String clientId, String clientSecret, String tenantid) {

        TokenRequestBody request = new TokenRequestBody(clientId, clientSecret, "client_credentials", authzScope);

        logger.debug("{} {} {}", tenantid, authzPath, request);

        TokenResponseBody response = restClient.post()
                .uri(loginBaseUrl + tenantid + "/" + authzPath.replaceAll("^/+", ""))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(request.toMap())
                .retrieve()
                .body(TokenResponseBody.class);

        if (response != null) {
            logger.debug("{}", response);
            return response.getAccessToken();
        }

        return "";
    }

    private class TokenRequestBody {

        @JsonProperty("client_id")
        String clientId;
        @JsonProperty("client_secret")
        String clientSecret;
        @JsonProperty("grant_type")
        String grantType;
        @JsonProperty("scope")
        String scope;

        public TokenRequestBody(String clientId, String clientSecret, String grantType, String scope) {
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.grantType = grantType;
            this.scope = scope;
        }

        public String getClientId() {
            return clientId;
        }

        public String getClientSecret() {
            return clientSecret;
        }

        public String getGrantType() {
            return grantType;
        }

        public void setGrantType(String grantType) {
            this.grantType = grantType;
        }

        public String getScope() {
            return scope;
        }

        public void setScope(String scope) {
            this.scope = scope;
        }

        @Override
        public String toString() {
            return "client_id=" + clientId + "&grant_type=" + grantType + "&scope=" + scope;
        }

        public MultiValueMap<String, String> toMap() {
            MultiValueMap<String, String> map = new LinkedMultiValueMap();
            map.add("client_id", clientId);
            map.add("client_secret", clientSecret);
            map.add("scope", scope);
            map.add("grant_type", grantType);
            return map;
        }
    }

    private static class TokenResponseBody {

        @JsonProperty("token_type")
        String tokenType;
        @JsonProperty("expires_in")
        String expiresIn;
        @JsonProperty("ext_expires_in")
        String extExpiresIn;
        @JsonProperty("access_token")
        String accessToken;

        public TokenResponseBody() {
        }

        public String getTokenType() {
            return tokenType;
        }

        public void setTokenType(String tokenType) {
            this.tokenType = tokenType;
        }

        public String getExpiresIn() {
            return expiresIn;
        }

        public void setExpiresIn(String expiresIn) {
            this.expiresIn = expiresIn;
        }

        public String getExtExpiresIn() {
            return extExpiresIn;
        }

        public void setExtExpiresIn(String extExpiresIn) {
            this.extExpiresIn = extExpiresIn;
        }

        public String getAccessToken() {
            return accessToken;
        }

        public void setAccessToken(String accessToken) {
            this.accessToken = accessToken;
        }

        @Override
        public String toString() {
            return "TokenResponseBody [tokenType=" + tokenType + ", expiresIn=" + expiresIn + ", extExpiresIn="
                    + extExpiresIn + ", accessToken=" + accessToken + "]";
        }
    }

    private static class UserEntity {
        Map<String, Object> fields = new LinkedHashMap<>();

        @JsonAnySetter
        void setField(String key, Object value) {
            fields.put(key, value);
        }

        public Map<String, Object> getFields() {
            return fields;
        }
    }

}
