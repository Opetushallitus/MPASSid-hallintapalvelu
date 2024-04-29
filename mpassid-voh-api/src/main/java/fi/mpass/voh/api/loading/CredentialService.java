package fi.mpass.voh.api.loading;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.integration.Integration;

@Service
public class CredentialService {
    private static final Logger logger = LoggerFactory.getLogger(CredentialService.class);

    Map<Long, Credential> credentials = new HashMap<>();

    public void updateClientId(Integration existingIntegration, Object clientId) {
        Credential credential = credentials.get(existingIntegration.getId());
        credential.setClientId((String) clientId);
        credentials.put(existingIntegration.getId(), credential);
    }

    //
    public void updateClientKey(Integration existingIntegration, Object clientKey) {
        Credential credential = credentials.get(existingIntegration.getId());
        credential.setClientId((String) clientKey);
        credentials.put(existingIntegration.getId(), credential);
    }

    public void start(Integration integration) {
        Credential credential = new Credential();
        logger.debug("Integration #{} Starting credential management", integration.getId());
        credentials.put(integration.getId(), credential);
    }

    public void finish(Integration integration) {
        Credential credential = credentials.get(integration.getId());
        if (credential.getClientId() != null && credential.getClientKey() != null) {
            // TODO Parameter Store
            // TODO remove local credential from memory
            logger.debug("Integration #{} Finished credential management", integration.getId());
        }
    }

    private class Credential {
        private String clientId;
        private String clientKey;

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getClientKey() {
            return clientKey;
        }

        public void setClientKey(String clientKey) {
            this.clientKey = clientKey;
        }
    }
}
