package fi.mpass.voh.api.loading;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.*;

public class ParameterStoreService {
    private static final Logger logger = LoggerFactory.getLogger(ParameterStoreService.class);

    // TODO configurable
    private static final Region region = Region.EU_NORTH_1;
    private static final String KMS_KEY_ID = "alias/mpassid-poc-key";
    private final SsmClient ssmClient;
    private String parameterName = "/MPASSID/organization";

    public ParameterStoreService(SsmClient ssmClient) {
        this.ssmClient = ssmClient;
    }

    /**
     * Creates a new ParameterStoreService for the profile
     *
     * @return A new ParameterStoreService for the profile
     */
    public static ParameterStoreService build() {
        SsmClient ssmClient = SsmClient.builder()
                .credentialsProvider(ProfileCredentialsProvider.create("mpassid-rr-dev"))
                .region(region)
                .build();
        return new ParameterStoreService(ssmClient);
    }

    public boolean put(String id, String name, String value) {
        // TODO
        String path = parameterName + "/" + id + "/" + name;

        PutParameterRequest request = PutParameterRequest
                .builder()
                .name(path)
                .overwrite(true) // allow insert or update semantics
                .type(ParameterType.SECURE_STRING)
                .keyId(KMS_KEY_ID)
                .value(value)
                .build();
        try {
            PutParameterResponse res = ssmClient.putParameter(request);
            logger.debug("Result: {}", res);
        } catch (Exception e) {
            logger.error("Exception: ", e);
            return false;
        }
        return true;
    }

}
