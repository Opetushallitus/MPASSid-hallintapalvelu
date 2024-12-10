package fi.mpass.voh.api.loading;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.util.Pair;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.exception.EntityCreationException;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.attribute.Attribute;

@Service
public class CredentialService {
    private static final Logger logger = LoggerFactory.getLogger(CredentialService.class);

    private ParameterStoreService parameterStoreService;

    @Value("${application.metadata.credential.name.field:client_id}")
    protected String credentialMetadataNameField = "client_id";
    @Value("${application.metadata.credential.value.field:client_secret}")
    protected String credentialMetadataValueField = "client_secret";

    public CredentialService(ParameterStoreService parameterStoreService) {
        this.parameterStoreService = parameterStoreService;
    }

    // credentials is a list of Pairs of (first) name and (second) value associated
    // with an identifier
    // e.g. [ (client_id, 12345), (client_s, 54321) ]
    Map<Long, List<Pair<String, String>>> credentials = new HashMap<>();

    public boolean updateOidcCredential(Integration integration, Object name, Object value) {
        if (integration != null) {
            String organizationOid = integration.getOrganization().getOid();
            if (organizationOid != null) {
                String path = organizationOid + "/" + integration.getId();
                // TODO check the first and the second not null and size > 1 ?
                boolean success = parameterStoreService.put(path, (String) name, (String) value);
                if (success) {
                    if (name.equals(credentialMetadataValueField)) {
                        integration.getConfigurationEntity().getSp().getMetadata().put((String) name,
                                ((String) value).substring(0, 3) + "*********");
                    }
                    logger.debug("Integration #{} Finished credential processing", integration.getId());
                } else {
                    logger.error("Integration #{} Failed credential processing", integration.getId());
                }
                return success;
            }
        }
        return false;
    }

    public boolean updateIdpCredential(Integration integration) {
        String credentialValueField = "clientKey";
        if (integration != null) {
            String organizationOid = integration.getOrganization().getOid();
            if (organizationOid != null) {
                String path = organizationOid + "/" + integration.getId();
                Set<Attribute> attributes = integration.getConfigurationEntity().getAttributes();
                for (Attribute attribute : attributes) {
                    if (attribute.getName().equals(credentialValueField)) {
                        boolean success = parameterStoreService.put(path, credentialValueField, attribute.getContent());
                        if (success) {
                            attribute.setContent(attribute.getContent().substring(0, 3) + "*********");
                            logger.debug("Integration #{} Finished credential processing", integration.getId());
                            return success;
                        } else {
                            logger.error("Failed to save secret to aws parameter store.");
                        }
                        break;
                    }
                }
            }
        }
        return false;
    }
}
