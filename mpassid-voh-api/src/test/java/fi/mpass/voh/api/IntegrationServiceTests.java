package fi.mpass.voh.api;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithMockUser;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;

import fi.mpass.voh.api.exception.EntityCreationException;
import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.DiscoveryInformationDTO;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.loading.LoadingService;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;
import fi.mpass.voh.api.organization.SubOrganization;

import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.times;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@AutoConfigureMockMvc
class IntegrationServiceTests {

    @Mock
    private IntegrationRepository integrationRepository;
    @Mock
    private OrganizationService organizationService;
    @Mock
    private LoadingService loadingService;

    private IntegrationService underTest;

    private Integration integration;
    private Integration updatedIntegration;
    private Integration existingUpdatedAllowingIntegration;
    private Integration updatedAllowingIntegration;
    private Integration referenceIntegration;
    private List<Integration> updatedIntegrations;
    private List<Integration> integrationSets;
    private List<Integration> serviceProviders;

    @BeforeEach
    void setUp() {
        underTest = new IntegrationService(integrationRepository, organizationService, loadingService);

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        SubOrganization subOrganization1 = new SubOrganization("SubOrganization abc of Organization zyx", "1.2.3.4.5.6.7.100");
        subOrganization1.setInstitutionType("11"); // peruskoulu
        subOrganization1.setInstitutionCode("0");
        SubOrganization subOrganization2 = new SubOrganization("SubOrganization def of Organization zyx", "1.2.3.4.5.6.7.101");
        subOrganization1.setInstitutionType("15"); // lukio
        List<SubOrganization> children = new ArrayList<>();
        children.add(subOrganization1);
        children.add(subOrganization2);
        organization.setChildren(children);
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
            Integration sp2 = createServiceProvider(Long.valueOf(i + 100), organization);
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

        existingUpdatedAllowingIntegration = new Integration(999L, LocalDate.now(), configurationEntity,
                LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "zoo@bar");

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
            existingUpdatedAllowingIntegration.addPermissionTo(set);
            updatedAllowingIntegration.addPermissionTo(set);
            referenceIntegration.addPermissionTo(set);
        }
        existingUpdatedAllowingIntegration.removePermissionTo(integrationSets.get(6));
        existingUpdatedAllowingIntegration.removePermissionTo(integrationSets.get(8));
        referenceIntegration.removePermissionTo(integrationSets.get(5));
        referenceIntegration.removePermissionTo(integrationSets.get(2));
    }

    private Integration createServiceProvider(Long id, Organization organization) {
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider sp = new OidcServiceProvider();
        sp.setConfigurationEntity(ce);
        ce.setSp(sp);
        sp.setName("SP " + id);
        sp.setClientId("clientId-" + id);
        Integration integration = new Integration(id, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                0, null, organization, "serviceContactAddress" + id + "@example.net");
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
        underTest.getIntegrationsSpecSearchPageable("search", "opinsys,wilma", "idp", "0", 0, pageable);

        // then
        verify(integrationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetIntegrationsSpecSearchPageableWithNoRole() {
        Pageable pageable = PageRequest.of(0, 20);

        // when
        underTest.getIntegrationsSpecSearchPageable("search", "opinsys,wilma", "", "0", 0, pageable);

        // then
        verify(integrationRepository, times(1)).findAll(any(Specification.class), any(Pageable.class));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetIntegrationsSpecSearchPageableWithReferenceId() {

        Pageable pageable = PageRequest.of(0, 20, Sort.by("permissions"));
        given(integrationRepository.findAll(any(Specification.class))).willReturn(integrationSets);
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(referenceIntegration));

        // when
        Page<Integration> pageIntegration = underTest.getIntegrationsSpecSearchPageable("search", "", "set", "0", 1111L,
                0,
                pageable);

        // then
        assertEquals(9, pageIntegration.getContent().size());
        assertEquals(1006, pageIntegration.getContent().get(8).getId());
        assertEquals(1003, pageIntegration.getContent().get(7).getId());
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
    void testUpdateIntegration() {
        // given
        given(loadingService.loadOne(any(Integration.class))).willReturn(updatedIntegration);
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(integration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedIntegration);

        // when - action or the behaviour that we are going test
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedIntegration);

        // then - verify the output
        assertEquals(999, resultIntegration.getId());
        assertEquals("zyx@domain", resultIntegration.getServiceContactAddress());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testUpdateIntegrationPermissions() {
        // given
        // existing integration without any existing permissions
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(integration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedAllowingIntegration);

        // when updating with 9 permissions
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedAllowingIntegration);

        // then - verify the output
        assertEquals(999, resultIntegration.getId());
        assertEquals(9, resultIntegration.getPermissions().size());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testAddIntegrationPermissions() {
        // given
        // existing integration with 7 existing permissions
        given(integrationRepository.findOne(any(Specification.class)))
                .willReturn(Optional.of(existingUpdatedAllowingIntegration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedAllowingIntegration);

        // when adding 2 permissions
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedAllowingIntegration);

        // then - verify the output
        assertEquals(999, resultIntegration.getId());
        assertEquals(9, resultIntegration.getPermissions().size());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testRemoveIntegrationPermissions() {
        // given
        // existing integration with 9 existing permissions
        given(integrationRepository.findOne(any(Specification.class)))
                .willReturn(Optional.of(updatedAllowingIntegration));
        given(integrationRepository.saveAndFlush(any(Integration.class)))
                .willReturn(existingUpdatedAllowingIntegration);

        // when removing 2 permissions
        Integration resultIntegration = underTest.updateIntegration(integration.getId(),
                existingUpdatedAllowingIntegration);

        // then - verify the output
        assertEquals(999, resultIntegration.getId());
        assertEquals(7, resultIntegration.getPermissions().size());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testUpdateIntegrationWhenNoExistingIntegration() {
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
        assertEquals(2, integrations.size());
    }

    @Test
    void testGetIdentityProviders() {
        // given
        given(integrationRepository.findAll(any(Specification.class))).willReturn(updatedIntegrations);

        // when
        List<Integration> integrations = underTest.getIdentityProviders();

        // then
        assertEquals(2, integrations.size());
    }

    @Test
    void testGetIntegrationsByPermissionUpdateTimeSince() {
        // when
        underTest.getIntegrationsByPermissionUpdateTimeSince(LocalDateTime.now(), 0);

        // then
        verify(integrationRepository).findDistinctByPermissionsLastUpdatedOnAfterAndDeploymentPhase(
                any(LocalDateTime.class), any(Integer.class));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testCreateBlankIntegration() throws JsonMappingException, JsonProcessingException {
        // given
        // given(organizationService.retrieveOrganization(any(String.class))).willReturn(integration.getOrganization());
        given(organizationService.retrieveSubOrganizations(any(String.class))).willReturn(integration.getOrganization());

        // when
        Integration resultIntegration = underTest.createBlankIntegration("idp", "wilma", "1.2.3.4.5.6.7.8", null);

        // then
        assertEquals(0, resultIntegration.getId());
        assertNotNull(resultIntegration.getConfigurationEntity().getIdp());
        assertInstanceOf(Wilma.class, resultIntegration.getConfigurationEntity().getIdp());
        assertEquals("1.2.3.4.5.6.7.8", resultIntegration.getOrganization().getOid());
        assertEquals(2, resultIntegration.getOrganization().getChildren().size());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testCreateIntegration() throws JsonMappingException, JsonProcessingException {

        ArrayList<Long> availableIdentifiers = new ArrayList<>();
        availableIdentifiers.add(1000339L);
        availableIdentifiers.add(1000439L);
        availableIdentifiers.add(2000439L);
        // given
        given(organizationService.retrieveOrganization(any(String.class))).willReturn(integration.getOrganization());
        given(integrationRepository.getAvailableIdpIntegrationIdentifier()).willReturn(availableIdentifiers);
        given(integrationRepository.save(any(Integration.class))).willReturn(integration);

        // when
        Integration resultIntegration = underTest.createIntegration(integration);

        // then
        assertEquals(1000339L, resultIntegration.getId());
        assertNotNull(resultIntegration.getConfigurationEntity().getIdp());
        assertInstanceOf(Opinsys.class, resultIntegration.getConfigurationEntity().getIdp());
        assertEquals("opinsys1000339", resultIntegration.getConfigurationEntity().getIdp().getFlowName());
        assertEquals("opinsys_1000339", resultIntegration.getConfigurationEntity().getIdp().getIdpId());
        assertEquals("1.2.3.4.5.6.7.8", resultIntegration.getOrganization().getOid());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testCreateIntegrationWithNoAvailableIdentifiers() throws JsonMappingException, JsonProcessingException {

        ArrayList<Long> availableIdentifiers = new ArrayList<>();

        // given
        given(organizationService.retrieveOrganization(any(String.class))).willReturn(integration.getOrganization());
        given(integrationRepository.getAvailableIdpIntegrationIdentifier()).willReturn(availableIdentifiers);
        given(integrationRepository.save(any(Integration.class))).willReturn(integration);

        // when
        EntityCreationException thrown = assertThrows(EntityCreationException.class, () -> {
            Integration resultIntegration = underTest.createIntegration(integration);
        });

        // then
        assertTrue(thrown.getMessage().contains("Integration creation failed"));
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testGetDiscoveryInformation() throws JsonMappingException, JsonProcessingException {

        // organization 1.2.246.562.10.40384720658 has two integrations
        // 1
        Set<String> excluded = new HashSet<>();
        excluded.add("00907");
        excluded.add("05899");
        integration.getDiscoveryInformation().setExcludedSchools(excluded);
        Set<Integer> institutionTypes = new HashSet<>();
        institutionTypes.add(11);
        institutionTypes.add(15);
        integration.getConfigurationEntity().getIdp().setInstitutionTypes(institutionTypes);

        // 2
        Set<String> included = new HashSet<>();
        included.add("00907");
        included.add("05899");
        referenceIntegration.getDiscoveryInformation().setSchools(included);
        referenceIntegration.getConfigurationEntity().getIdp().setInstitutionTypes(institutionTypes);

        List<Integration> integrations = new ArrayList<>();
        integrations.add(integration);
        integrations.add(referenceIntegration);

        // given
        given(integrationRepository.findAllByOrganizationOid(any(String.class))).willReturn(integrations);
        
        // when
        List<Integer> types = new ArrayList<>();
        types.add(11);
        types.add(15);
        DiscoveryInformationDTO dto = underTest.getDiscoveryInformation("1.2.3.4.5.6.7.8", types);

        // then
        assertEquals(2, dto.getExistingIncluded().size());
        assertEquals(2, dto.getExistingExcluded().size());
        assertTrue(dto.getExistingIncluded().contains("00907")); // institution code
        assertTrue(dto.getExistingExcluded().contains("1111")); // integration identifier
    }
}