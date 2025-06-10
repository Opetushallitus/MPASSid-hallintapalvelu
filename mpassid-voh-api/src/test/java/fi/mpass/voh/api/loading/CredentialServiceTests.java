package fi.mpass.voh.api.loading;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import static org.mockito.BDDMockito.given;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.organization.Organization;

@SpringBootTest
@AutoConfigureMockMvc
class CredentialServiceTests {

    @Mock
    private ParameterStoreService parameterStoreService;

    private CredentialService underTest;

    @BeforeEach
    void setUp() {
        underTest = new CredentialService(parameterStoreService);
    }

    @Test
    @Disabled
    void testUpdateCredential() {

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Opinsys opinsys = new Opinsys("tenantId");
        configurationEntity.setIdp(opinsys);
        Integration integration = new Integration(99999L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        // given
        given(parameterStoreService.put(any(String.class), any(String.class), any(String.class))).willReturn(true);

        // when
        boolean success = underTest.updateOidcCredential(integration, "client_id", "5432§1assdfg");

        // then
        assertTrue(success);
    }

    @Test
    void testUpdateCredentialWithFailingParameterStoreService() {

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Opinsys opinsys = new Opinsys("tenantId");
        configurationEntity.setIdp(opinsys);
        Integration integration = new Integration(99999L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        // given
        given(parameterStoreService.put(any(String.class), any(String.class), any(String.class))).willReturn(false);

        // when
        boolean success = underTest.updateOidcCredential(integration, "client_id", "5432§1assdfg");

        // then
        assertFalse(success);
    }
}
