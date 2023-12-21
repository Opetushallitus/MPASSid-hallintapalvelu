package fi.mpass.voh.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.organization.Organization;

import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.times;

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
    private Integration referenceIntegration;
    private List<Integration> updatedIntegrations;
    private List<Integration> integrationSets;
    private List<Integration> serviceProviders;

    @BeforeEach
    void setUp() {
        underTest = new IntegrationService(integrationRepository);

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Opinsys opinsys = new Opinsys("tenantId");
        configurationEntity.setIdp(opinsys);

        // Integration sets
        integrationSets = new ArrayList<Integration>();
        serviceProviders = new ArrayList<Integration>();
        for (int i = 1; i < 10; i++) {
            
            ConfigurationEntity ce = new ConfigurationEntity();
            IntegrationSet set = new IntegrationSet();
            set.setConfigurationEntity(ce);
            ce.setSet(set);
            set.setName("Integration set " + i);
            Integration integrationSet = new Integration(1000L + i, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                    0, null, organization, "serviceContactAddress" + i + "@example.net");
            integrationSet.setConfigurationEntity(ce);
            Integration sp1 = createServiceProvider(Long.valueOf(i), organization);
            Integration sp2 = createServiceProvider(Long.valueOf(i+100), organization);
            sp1.addToSet(integrationSet);
            serviceProviders.add(sp1);
            sp2.addToSet(integrationSet);
            serviceProviders.add(sp2);
            integrationSets.add(integrationSet);
        }

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

        referenceIntegration = new Integration(1111L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 8, 30),
                0, discoveryInformation, organization,
                "zap@bar");

        updatedIntegrations = new ArrayList<Integration>();
        updatedIntegration.setServiceContactAddress("zyx@domain");
        updatedIntegrations.add(updatedIntegration);
        updatedAllowingIntegration.setServiceContactAddress("xyz@domain");
        updatedIntegrations.add(updatedAllowingIntegration);

        for (Integration set : integrationSets) {
            updatedAllowingIntegration.addPermissionTo(set);
            referenceIntegration.addPermissionTo(set);
        }
        referenceIntegration.removePermissionTo(integrationSets.get(5));
        referenceIntegration.removePermissionTo(integrationSets.get(2));
    }

    private Integration createServiceProvider(Long id, Organization organization) {
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider sp = new OidcServiceProvider();
        sp.setConfigurationEntity(ce);
        ce.setSp(sp);
        sp.setName("SP " +id);
        sp.setClientId("clientId-"+id);
        Integration integration = new Integration(id, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                0, null, organization, "serviceContactAddress" + id +"@example.net");
        return integration;
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
    void testGetIntegrationsSpecSearchPageableWithNoRole() {
        Pageable pageable = PageRequest.of(0, 20);

        // when
        underTest.getIntegrationsSpecSearchPageable("search", "opinsys,wilma", "", "0", pageable);

        // then
        verify(integrationRepository, times(1)).findAll(any(Specification.class), any(Pageable.class));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetIntegrationsSpecSearchPageableWithReferenceId() {
        List<Integration> integrations = new ArrayList<Integration>();
        integrations.add(updatedIntegration);
        integrations.add(updatedAllowingIntegration);
        Pageable pageable = PageRequest.of(0, 20, Sort.by("permissions"));
        given(integrationRepository.findAll(any(Specification.class))).willReturn(integrationSets);
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(referenceIntegration));

        // when
        Page<Integration> pageIntegration = underTest.getIntegrationsSpecSearchPageable("search", "", "set", "0", 1111L,
                pageable);

        // then
        assertTrue(pageIntegration.getContent().size() == 9);
        assertTrue(pageIntegration.getContent().get(8).getId() == 1006);
        assertTrue(pageIntegration.getContent().get(7).getId() == 1003);

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
        assertTrue(resultIntegration.getServiceContactAddress().equals("zyx@domain"));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    public void testUpdateIntegrationPermissions() {
        // given
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(integration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedAllowingIntegration);

        // when - action or the behaviour that we are going test
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedAllowingIntegration);

        // then - verify the output
        assertTrue(resultIntegration.getId() == 999);
        assertTrue(resultIntegration.getPermissions().size() == 9);
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
        LocalDateTime sinceTime = LocalDateTime.now();

        // given
        given(integrationRepository.findAllByLastUpdatedOnAfter(any())).willReturn(updatedIntegrations);

        // when
        List<Integration> integrations = underTest.getIntegrationsSince(sinceTime);

        // then
        assertTrue(integrations.size() == 2);
    }

    @Test
    void testGetIdentityProviders() {
        // given
        given(integrationRepository.findAll(any(Specification.class))).willReturn(updatedIntegrations);

        // when
        List<Integration> integrations = underTest.getIdentityProviders();

        // then
        assertTrue(integrations.size() == 2);
    }

    @Test
    void testGetIntegrationsByPermissionUpdateTimeSince() {
        // when
        underTest.getIntegrationsByPermissionUpdateTimeSince(LocalDateTime.now(), 0);

        // then
        verify(integrationRepository).findDistinctByPermissionsLastUpdatedOnAfterAndDeploymentPhase(any(LocalDateTime.class), any(Integer.class));
    }
}