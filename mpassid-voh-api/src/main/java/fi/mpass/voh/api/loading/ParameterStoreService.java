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

    private String parameterStoreRegion;

    private String kmsKeyId;

    private String parameterRootName;

    private String profileName;

    private final SsmClient ssmClient;

    public ParameterStoreService(@Value("${application.parameterstore.region:eu-north-1}") String parameterStoreRegion,
            @Value("${application.parameterstore.kms-key-id:mpassid-poc-key}") String kmsKeyId,
            @Value("${application.parameterstore.parameterRootName:mpassid}") String parameterRootName,
            @Value("${application.parameterstore.profileName}") String profileName) {
        this.parameterStoreRegion = parameterStoreRegion;
        this.kmsKeyId = kmsKeyId;
        this.parameterRootName = parameterRootName;
        this.profileName = profileName;
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
