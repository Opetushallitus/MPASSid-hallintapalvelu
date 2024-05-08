package fi.mpass.voh.api.loading;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.util.Pair;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.integration.Integration;

@Service
public class CredentialService {
    private static final Logger logger = LoggerFactory.getLogger(CredentialService.class);

    // a credential is a Pair of (first) name and (second) value
    // Integration associates with one credential
    Map<Long, Pair<String, String>> credentials = new HashMap<>();

    public void updateCredentialName(Integration existingIntegration, Object name) {
        Pair<String, String> credential = credentials.get(existingIntegration.getId());
        credential = Pair.of((String) name, credential.getSecond());
        credentials.put(existingIntegration.getId(), credential);
    }

    public void updateCredentialValue(Integration existingIntegration, Object value) {
        Pair<String, String> credential = credentials.get(existingIntegration.getId());
        credential = Pair.of(credential.getFirst(), (String) value);
        credentials.put(existingIntegration.getId(), credential);
    }

    public void start(Integration integration) {
        logger.debug("Integration #{} Starting credential processing", integration.getId());
        credentials.put(integration.getId(), Pair.of("", ""));
    }

    public void finish(Integration integration) {
        Pair<String, String> credential = credentials.get(integration.getId());
        String organizationOid = integration.getOrganization().getOid();
        if (credential != null) {
            boolean success = ParameterStoreService.build().put(organizationOid, credential.getFirst(),
                    credential.getSecond());
            if (success) {
                logger.debug("Integration #{} Finished credential processing", integration.getId());
            } else {
                logger.error("Integration #{} Failed credential processing", integration.getId());
            }
        }
    }
}
