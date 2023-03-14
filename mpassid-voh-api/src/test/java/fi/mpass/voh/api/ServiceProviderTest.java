package fi.mpass.voh.api;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.boot.test.context.SpringBootTest;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fi.mpass.voh.api.integration.sp.HashMapConverter;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.SamlServiceProvider;

@SpringBootTest
public class ServiceProviderTest {

    /**
     * tests (OIDC) ServiceProvider setMetadata method called by Jackson during runtime.
     * tests HashMapConverter convertToEntityAttribute method.
     */
    @Test
    public void testOidcSetMetadata() throws Exception {
        // given
        final var resource = new ClassPathResource("test_oidc_sp_metadata.json");
        final var metadata = Files.readString(Path.of(resource.getURI()));

        // when
        HashMapConverter hmc = new HashMapConverter();
        Map<String, Object> hashMapMetadata = hmc.convertToEntityAttribute(metadata);

        OidcServiceProvider oidc = new OidcServiceProvider("clientID");
        oidc.setMetadata(hashMapMetadata);

        // then
        assertEquals(oidc.getClientId(), "{{ domain_clientId }}");
    }

    /**
     * tests (SAML) ServiceProvider setMetadata method called by Jackson during runtime.
     * tests HashMapConverter convertToEntityAttribute method.
     */
    @Test
    public void testSamlSetMetadata() throws Exception {
        // given
        final var resource = new ClassPathResource("test_saml_sp_metadata.json");
        final var metadata = Files.readString(Path.of(resource.getURI()));

        // when
        HashMapConverter hmc = new HashMapConverter();
        Map<String, Object> hashMapMetadata = hmc.convertToEntityAttribute(metadata);

        SamlServiceProvider saml = new SamlServiceProvider("entityID");
        saml.setMetadata(hashMapMetadata);

        // then
        assertEquals(saml.getEntityId(), "https://domain/shibboleth/mpass");
    }

    /**
     * tests (SAML) ServiceProvider setMetadata method with an invalid signing certificate.
     * tests HashMapConverter convertToEntityAttribute method.
     */
    @Test
    public void testSamlSetMetadataWithInvalidCertificate() throws Exception {
        // given
        final var resource = new ClassPathResource("test_saml_sp_metadata-invalid_cert.json");
        final var metadata = Files.readString(Path.of(resource.getURI()));

        // when
        HashMapConverter hmc = new HashMapConverter();
        Map<String, Object> hashMapMetadata = hmc.convertToEntityAttribute(metadata);

        SamlServiceProvider saml = new SamlServiceProvider("entityID");
        saml.setMetadata(hashMapMetadata);

        // then
        String error = (String)saml.getMetadata().get("signingCertificates0Error");
        assertTrue(error.contains("Unable to initialize"));
    }
}
