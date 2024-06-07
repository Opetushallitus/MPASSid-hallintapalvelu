package fi.mpass.voh.api.loading;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.util.Pair;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.integration.Integration;

@Service
public class CredentialService {
    private static final Logger logger = LoggerFactory.getLogger(CredentialService.class);

    private ParameterStoreService parameterStoreService;

    public CredentialService(ParameterStoreService parameterStoreService) {
        this.parameterStoreService = parameterStoreService;
    }

    // credentials is a list of Pairs of (first) name and (second) value associated
    // with an identifier
    // e.g. [ (client_id, 12345), (client_s, 54321) ]
    Map<Long, List<Pair<String, String>>> credentials = new HashMap<>();

    public boolean updateCredential(Integration integration, Object name, Object value) {
        if (integration != null) {
            String organizationOid = integration.getOrganization().getOid();
            if (organizationOid != null) {
                String path = organizationOid + "/" + integration.getId();
                // TODO check the first and the second not null and size > 1 ?
                boolean success = parameterStoreService.put(path, (String) name, (String) value);
                if (success) {
                    logger.debug("Integration #{} Finished credential processing", integration.getId());
                } else {
                    logger.error("Integration #{} Failed credential processing", integration.getId());
                }
                return success;
            }
        }
        return false;
    }
}
