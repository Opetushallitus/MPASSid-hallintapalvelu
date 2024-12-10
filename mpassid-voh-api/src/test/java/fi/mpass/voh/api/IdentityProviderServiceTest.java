package fi.mpass.voh.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.InputStreamResource;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.idp.IdentityProviderService;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;

@SpringBootTest
@AutoConfigureMockMvc
class IdentityProviderServiceTest {
    private IdentityProviderService underTest;
    private IntegrationService integrationService;

    @BeforeEach
    void setUp() {
        // This path is relative to mpassid-voh-api module
        underTest = new IdentityProviderService("src/test/resources/metadata", "test.com/metadata", integrationService);
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetSamlMetadata() throws IOException {
        // given
        String entityIdBase64 = "aHR0cHM6Ly9zdHMud2luZG93cy5uZXQvM2YwNjZlOGMtODM5NS00YTFjLWFkYzYtODRiYWVkMGUwNzllLw==";

        // when
        InputStreamResource resource = underTest.getSAMLMetadata(entityIdBase64);
        // then

        assertEquals(39320, resource.contentLength());
    }
}