package fi.mpass.voh.api;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.mockito.Mock;

import org.mockserver.client.MockServerClient;
import org.mockserver.model.HttpStatusCode;
import org.mockserver.model.MediaType;
import org.mockserver.springtest.MockServerTest;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;

import fi.mpass.voh.api.organization.OrganizationRepository;
import fi.mpass.voh.api.organization.OrganizationService;
import fi.mpass.voh.api.organization.Organization;

// @ExtendWith(MockitoExtension.class)
@SpringBootTest
@MockServerTest("server.url=http://localhost:${mockServerPort}")
class OrganizationServiceTests {

    @Value("${server.url}")
    private String serverUrl;

    private MockServerClient mockServerClient;

    @Mock private OrganizationRepository organizationRepository;
    
    private OrganizationService underTest;

    @BeforeEach
    void setUp() {
        underTest = new OrganizationService(organizationRepository, serverUrl + "/test_organization_url");
    }

    /**
     * Exercises OrganizationService to retrieve (mocked) organization data through an url
     * 
     * @throws Exception
     */
    @Test
    void validOrganizationResponse() throws Exception {
        
        // Lempäälän kunta
        final var resource = new ClassPathResource("test_organization.json");
        final var mockedResponse = Files.readString(Path.of(resource.getURI()));
        final var testUrl = new String("/test_organization_url/1.2.246.562.10.74484103937");
        
        mockServerClient
                .when(request().withMethod("GET").withPath(testUrl))
                .respond(response()
                        .withContentType(MediaType.APPLICATION_JSON)
                        .withStatusCode(HttpStatusCode.OK_200.code())
                        .withBody(mockedResponse));
        
        Organization organization = underTest.retrieveOrganization("1.2.246.562.10.74484103937");

        assertEquals("Lempäälän kunta", organization.getName());
    }
}
