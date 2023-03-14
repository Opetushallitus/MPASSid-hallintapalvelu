package fi.mpass.voh.api;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.mockserver.client.MockServerClient;
import org.mockserver.model.HttpStatusCode;
import org.mockserver.springtest.MockServerTest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;

import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

@SpringBootTest
@MockServerTest("server.url=http://localhost:${mockServerPort}")
public class MetadataProviderTests {

    @Value("${server.url}")
    private String serverUrl;

    private MockServerClient mockServerClient;

    /**
     * Exercises SamlMetadataProvider to retrieve (mocked) SAML metadata through an url and to extract
     * a valid until date from the SAML metadata.
     * 
     * @throws Exception
     */
    @Test
    void validSAMLMetadata() throws Exception {
        // TODO throws exception
        
        // shib_viikki
        final var resource = new ClassPathResource("test_saml_metadata.xml");
        final var mockedResponse = Files.readString(Path.of(resource.getURI()));
        final var testUrl = new String("/test_metadata_url");
        
        mockServerClient
                .when(request().withMethod("GET").withPath(testUrl))
                .respond(response()
                        .withStatusCode(HttpStatusCode.OK_200.code())
                        .withBody(mockedResponse));
        
        SamlMetadataProvider mp = new SamlMetadataProvider(serverUrl + testUrl);

        assertEquals(mp.getSigningCertificateValidUntil(), LocalDate.of(2027,10,02));
    }
}
