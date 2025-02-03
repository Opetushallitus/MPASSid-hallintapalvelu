package fi.mpass.voh.api.loading;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.*;

@Service
public class ParameterStoreService {
    private static final Logger logger = LoggerFactory.getLogger(ParameterStoreService.class);

    private static final String DELIM = "/";

    @Value("${application.parameterstore.region:eu-north-1}")
    private String parameterStoreRegion = "eu-north-1";

    @Value("${application.parameterstore.kms-key-id:mpassid-poc-key}")
    private String kmsKeyId = "alias/mpassid-poc-key";
    
    @Value("${application.parameterstore.parameterRootName:mpassid}")
    private String parameterRootName = "/MPASSID/organization";

    @Value("${application.parameterstore.profileName}")
    private String profileName;



    private final SsmClient ssmClient;

    public ParameterStoreService() {
        Region region = Region.of(parameterStoreRegion);
        ssmClient = SsmClient.builder()
                .credentialsProvider(ProfileCredentialsProvider.create(profileName))
                .region(region)
                .build();
    }

    public boolean put(String id, String name, String value) {
        String path = parameterRootName + "/" + id + "/" + name;

        PutParameterRequest request = PutParameterRequest
                .builder()
                .name(path)
                .overwrite(true) // allow insert or update semantics
                .type(ParameterType.SECURE_STRING)
                .keyId(kmsKeyId)
                .value(value)
                .build();
        try {
            PutParameterResponse res = ssmClient.putParameter(request);
            logger.debug("Result: {}", res);
            logger.debug("HTTP result: {}", res.sdkHttpResponse());
        } catch (Exception e) {
            logger.error("Exception: ", e);
            value = null;
            return false;
        }
        value = null;
        return true;
    }

}
