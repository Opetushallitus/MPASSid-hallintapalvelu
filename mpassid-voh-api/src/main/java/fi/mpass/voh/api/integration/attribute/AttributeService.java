package fi.mpass.voh.api.integration.attribute;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.config.AttributeConfiguration;
import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationService;

@Service
public class AttributeService {
    private static final Logger logger = LoggerFactory.getLogger(AttributeService.class);

    private final AttributeConfiguration attributeConfiguration;
    private final AttributeValidator attributeValidator;
    private final IntegrationService integrationService;
    private AttributeTestAuthorizationToken token;

    public AttributeService(AttributeConfiguration attributeConfiguration,
            AttributeValidator attributeValidator, IntegrationService integrationService,
            AttributeTestAuthorizationToken token) {
        this.attributeConfiguration = attributeConfiguration;
        this.attributeValidator = attributeValidator;
        this.integrationService = integrationService;
        this.token = token;
    }

    public List<String> getConfiguredAttributeNames() {
        logger.debug("Number of configured attributes: {}", attributeConfiguration.getAttributes().size());
        List<String> names = new ArrayList<>();
        for (Attribute attribute : this.attributeConfiguration.getAttributes()) {
            names.add(attribute.getName());
        }
        return names;
    }

    public List<Attribute> getConfiguredAttributes() {
        return this.attributeConfiguration.getAttributes();
    }

    public Map<String, Object> testAttributes(String principalName, List<String> selectedAttributes) {
        Map<String, Object> selectedAttributeValues = this.attributeValidator.getUserEntity(token.getToken(),
                principalName, selectedAttributes);
        if (selectedAttributeValues != null) {
            return attributeValidator.getUserEntity(this.token.getToken(), principalName, selectedAttributes);
        }

        return new LinkedHashMap<>();
    }

    public boolean testAttributesAuthorization(AttributeTestAuthorizationRequestBody requestBody) {
        if (requestBody.getId() != null && requestBody.getClientId() != null && requestBody.getClientSecret() != null) {
            try {
                return testAttributesAuthorizationWithId(requestBody);
            } catch (Exception e) {
                logger.debug(e.getMessage());
                throw new EntityNotFoundException("Authorization not successful");
            }
        } else if (requestBody.getTenantId() != null && requestBody.getClientId() != null
                && requestBody.getClientSecret() != null) {
            try {
                return testAttributesAuthorizationWithTenantId(requestBody);
            } catch (Exception e) {
                logger.debug(e.getMessage());
                throw new EntityNotFoundException("Authorization not successful");
            }
        }
        return false;
    }

    private boolean testAttributesAuthorizationWithId(AttributeTestAuthorizationRequestBody requestBody) {

        logger.debug("Integration #{}, clientId: {}", requestBody.getId(), requestBody.getClientId());

        if (requestBody.getId() != null && requestBody.getClientId() != null && requestBody.getClientSecret() != null) {
            Optional<Integration> integration = integrationService.getIntegration(requestBody.getId());
            if (integration.isPresent() && integration.get().getConfigurationEntity() != null
                    && integration.get().getConfigurationEntity().getIdp() != null) {
                // && integration.get().getConfigurationEntity().getIdp() instanceof Azure) {

                logger.debug("Integration #{}, type: {}", integration.get().getId(),
                        integration.get().getConfigurationEntity().getIdp().getType());

                Set<Attribute> attributes = integration.get().getConfigurationEntity().getAttributes();
                String tenantId = "";
                for (Attribute attribute : attributes) {
                    if (attribute.getName().equals("tenantId") && attribute.getType().equals("data")) {
                        tenantId = attribute.getContent();
                        break;
                    }
                }

                logger.debug("Integration #{}, clientId: {}, tenantId: {}", requestBody.getId(),
                        requestBody.getClientId(), tenantId);

                String accessToken;
                try {
                    accessToken = attributeValidator.getToken(requestBody.getClientId(),
                            requestBody.getClientSecret(),
                            tenantId);
                } catch (Exception e) {
                    logger.debug(e.getMessage());
                    throw new EntityNotFoundException("Authorization not successful");
                }

                if (accessToken != null) {
                    this.token.setToken(accessToken);
                    return true;
                }
            }
        }
        return false;
    }

    private boolean testAttributesAuthorizationWithTenantId(AttributeTestAuthorizationRequestBody requestBody) {
        logger.debug("tenantId #{}, clientId: {}", requestBody.getTenantId(), requestBody.getClientId());
        if (requestBody.getTenantId() != null && requestBody.getClientId() != null
                && requestBody.getClientSecret() != null) {
            String accessToken;
            try {
                accessToken = attributeValidator.getToken(requestBody.getClientId(),
                        requestBody.getClientSecret(),
                        requestBody.getTenantId());
            } catch (Exception e) {
                logger.debug(e.getMessage());
                throw new EntityNotFoundException("Authorization not successful");
            }

            if (accessToken != null) {
                this.token.setToken(accessToken);
                return true;
            }
        }
        return false;
    }
}
