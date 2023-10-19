package fi.mpass.voh.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.organization.Organization;

import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.any;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@AutoConfigureMockMvc
public class IntegrationServiceTests {

    @Mock
    private IntegrationRepository integrationRepository;
    private IntegrationService underTest;

    private Integration integration;
    private Integration updatedIntegration;
    private Integration updatedAllowingIntegration;
    private List<Integration> updatedIntegrations;

    @BeforeEach
    void setUp() {
        underTest = new IntegrationService(integrationRepository);

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "123456-7", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Opinsys opinsys = new Opinsys("tenantId");

        // Allowed services
        /*
         * ConfigurationEntity ce = new ConfigurationEntity();
         * OidcServiceProvider serviceProvider = new OidcServiceProvider();
         * serviceProvider.setConfigurationEntity(ce);
         * ce.setSp(serviceProvider);
         * serviceProvider.setClientId("clientId");
         * serviceProvider.addAllowingIdentityProvider(wilma);
         * Set<ServiceProvider> allowedServices = new HashSet<>();
         * allowedServices.add(serviceProvider);
         * 
         * wilma.setAllowedServiceProviders(allowedServices);
         */
        configurationEntity.setIdp(opinsys);

        integration = new Integration(999L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        updatedIntegration = new Integration(999L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "foo@bar");

        updatedAllowingIntegration = new Integration(999L, LocalDate.now(), configurationEntity,
                LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "zoo@bar");

        // TODO create Integration bakery
        updatedAllowingIntegration.addAllowed(integration);
    }

    @Test
    void testGetIntegrations() {
        // when
        underTest.getIntegrations();

        // then
        verify(integrationRepository).findAll();
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetIntegrationsSpecSearchPageable() {
        Pageable pageable = PageRequest.of(0, 20);

        // when
        underTest.getIntegrationsSpecSearchPageable("search", "opinsys,wilma", "idp", "0", pageable);

        // then
        verify(integrationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetSpecIntegrationByNotExistingId() {

        EntityNotFoundException thrown = assertThrows(EntityNotFoundException.class, () -> {
            underTest.getSpecIntegrationById(5L);
        });

        assertTrue(thrown.getMessage().contains("Not found Integration 5"));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    public void testUpdateIntegration() {
        // given
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(integration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedIntegration);

        // when - action or the behaviour that we are going test
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedIntegration);

        // then - verify the output
        assertTrue(resultIntegration.getId() == 999);
        assertTrue(resultIntegration.getServiceContactAddress().equals("foo@bar"));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    public void testUpdateAllowedIntegrations() {
        // given
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(integration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedAllowingIntegration);

        // when - action or the behaviour that we are going test
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedIntegration);

        // then - verify the output
        assertTrue(resultIntegration.getId() == 999);
        assertTrue(resultIntegration.getAllowedIntegrations().size() == 1);
    }
 
    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    public void testUpdateIntegrationWhenNoExistingIntegration() {
        // given
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.empty());
        given(integrationRepository.saveAndFlush(updatedIntegration)).willReturn(updatedIntegration);

        // when - action or the behaviour that we are going test
        EntityNotFoundException thrown = assertThrows(EntityNotFoundException.class, () -> {
            Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedIntegration);
        });

        // then - verify the output
        assertTrue(thrown.getMessage().contains("Not found Integration 999"));
    }

    @Test
    void testGetUpdatedIntegrationsSince() {
        updatedIntegrations = new ArrayList<Integration>();
        LocalDateTime sinceTime = LocalDateTime.now();
        updatedIntegration.setServiceContactAddress("zyx@domain");
        updatedIntegrations.add(updatedIntegration);
        updatedAllowingIntegration.setServiceContactAddress("xyz@domain");
        updatedIntegrations.add(updatedAllowingIntegration);

        // given
        given(integrationRepository.findAllByLastUpdatedOnAfter(any())).willReturn(updatedIntegrations);

        // when
        List<Integration> integrations = underTest.getIntegrationsSince(sinceTime);

        // then
        assertTrue(integrations.size() == 2);
    }
}