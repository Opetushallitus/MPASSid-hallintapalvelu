package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationPermission;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.provisioning.ConfigurationStatus;
import fi.mpass.voh.api.provisioning.Provisioning;
import fi.mpass.voh.api.provisioning.ProvisioningRepository;
import fi.mpass.voh.api.provisioning.ProvisioningService;

@SpringBootTest
@AutoConfigureMockMvc
public class ProvisioningServiceTests {

    @Mock
    private ProvisioningRepository provisioningRepository;
    @Mock
    private IntegrationService integrationService;
    private ProvisioningService underTest;

    private List<Integration> testIntegrations;
    private List<Integration> productionIntegrations;
    private List<Integration> preProductionIntegrations;
    private List<Integration> integrationSets;

    private Optional<Provisioning> testProvision;
    private Optional<Provisioning> productionProvision;
    private Optional<Provisioning> preProductionProvision;

    @BeforeEach
    void setUp() {
        underTest = new ProvisioningService(provisioningRepository, integrationService);

        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");

        // Integration sets
        integrationSets = new ArrayList<Integration>();
        for (int i = 0; i < 10; i++) {
            ConfigurationEntity ce = new ConfigurationEntity();
            IntegrationSet set = new IntegrationSet();
            set.setConfigurationEntity(ce);
            ce.setSet(set);
            set.setName("Integration set " + i);
            Integration integrationSet = new Integration(300000L + i, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                    0, null, organization, "serviceContactAddress" + i + "@example.net");
            integrationSet.setConfigurationEntity(ce);
            integrationSets.add(integrationSet);
        }

        testIntegrations = new ArrayList<Integration>();
        productionIntegrations = new ArrayList<Integration>();
        preProductionIntegrations = new ArrayList<Integration>();
        for (int i = 0; i < 5; i++) {
            Integration idp = createIdentityProvider(Long.valueOf(i), organization, 0);
            for (int s = 0; s < 10; s++) {
                    idp.addPermissionTo(integrationSets.get(s));                    
            }
            for (IntegrationPermission p : idp.getPermissions()) {
                LocalDateTime time = LocalDateTime.now();
                p.setLastUpdatedOn(time);
            }
            testIntegrations.add(idp);
        }
        for (int i = 5; i < 10; i++) {
            Integration idp = createIdentityProvider(Long.valueOf(i), organization, 1);
            for (int s = 0; s < 10; s++) {
                if (s % 3 == 0) {
                    idp.addPermissionTo(integrationSets.get(s));
                }
            }
            for (IntegrationPermission p : idp.getPermissions()) {
                LocalDateTime time = LocalDateTime.now();
                p.setLastUpdatedOn(time);
            }
            productionIntegrations.add(idp);
        }
        for (int i = 10; i < 15; i++) {
            Integration idp = createIdentityProvider(Long.valueOf(i), organization, 2);
            for (int s = 0; s < 10; s++) {
                if (s % 2 == 0) {
                    idp.addPermissionTo(integrationSets.get(s));
                }
            }
            for (IntegrationPermission p : idp.getPermissions()) {
                LocalDateTime time = LocalDateTime.now();
                p.setLastUpdatedOn(time);
            }
            preProductionIntegrations.add(idp);
        }

        testProvision = Optional.of(new Provisioning(0));
        productionProvision = Optional.of(new Provisioning(1));
        preProductionProvision = Optional.of(new Provisioning(2));
    }

    private Integration createIdentityProvider(Long id, Organization organization, int deploymentPhase) {
        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name" + id,
                "Custom Title " + id, true);
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Opinsys opinsys = new Opinsys("tenantId");
        configurationEntity.setIdp(opinsys);

        Integration integration = new Integration(100000L + id, LocalDate.now(), configurationEntity,
                LocalDate.of(2023, 6, 30),
                deploymentPhase, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        return integration;
    }

    @WithMockUser(value = "admin", roles = { "ADMIN" })
    @Test
    void testGetConfigurationStatuses() {
        // given
        given(integrationService.getIntegrationsByPermissionUpdateTimeSince(any(), eq(0)))
                .willReturn(testIntegrations);
        given(integrationService.getIntegrationsByPermissionUpdateTimeSince(any(), eq(1)))
                .willReturn(productionIntegrations);
        given(integrationService.getIntegrationsByPermissionUpdateTimeSince(any(), eq(2)))
                .willReturn(preProductionIntegrations);
        given(provisioningRepository.findByDeploymentPhase(0)).willReturn(testProvision);
        given(provisioningRepository.findByDeploymentPhase(1)).willReturn(productionProvision);
        given(provisioningRepository.findByDeploymentPhase(2)).willReturn(preProductionProvision);

        // when
        List<ConfigurationStatus> statuses = underTest.getConfigurationStatuses();

        // then
        assertEquals(3, statuses.size());
    }
}
