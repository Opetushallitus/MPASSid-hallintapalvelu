package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationRepository;

@DataJpaTest
public class IntegrationRepositoryTests {

    @Autowired
    private IntegrationRepository underTest;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Test
    public void testSaveIntegration() {
        // given
        Set<Integer> institutionTypes = Stream.of(1, 2, 11).collect(Collectors.toCollection(HashSet::new));
        Azure azure = new Azure("azure_seutu", "https://m/images/buttons/btn.png",
                "ShibA");
        azure.setEntityId("https://net/d63718ed/");
        ConfigurationEntity ce = new ConfigurationEntity();
        azure.setConfigurationEntity(ce);
        azure.setInstitutionTypes(institutionTypes);
        ce.setIdp(azure);
        DiscoveryInformation discoveryInformation = new DiscoveryInformation("customDisplayName", "title", true);
        // TODO: ce.setAttributes();
        Integration integration = new Integration(ce);
        integration.setDiscoveryInformation(discoveryInformation);
        integration.setId(4000001L);

        // when
        Integration savedIntegration = underTest.save(integration);

        // then
        assertEquals(integration.getId(), savedIntegration.getId());
    }

    @Test
    public void testFindAllByPermissionsLastUpdatedOnAfterAndDeploymentPhase() {
        // given
        Organization organization = new Organization("Organization abc", "1.2.246.562.10.895479029510");
        organizationRepository.save(organization);

        // 5 integration sets, to
        List<Integration> integrationSets = new ArrayList<Integration>();
        integrationSets = new ArrayList<Integration>();
        for (int i = 1; i < 6; i++) {
            ConfigurationEntity ce = new ConfigurationEntity();
            IntegrationSet set = new IntegrationSet();
            set.setConfigurationEntity(ce);
            ce.setSet(set);
            set.setName("Integration set " + i);
            Integration integrationSet = new Integration(300000L + Long.valueOf(i), LocalDate.now(), ce,
                    LocalDate.of(2023, 7, 30),
                    0, null, organization, "serviceContactAddress" + i + "@example.net");
            Integration savedIntegrationSet = underTest.save(integrationSet);
            integrationSets.add(savedIntegrationSet);
        }

        // 4 integrations, from
        for (int i = 1; i < 5; i++) {
            System.out.println("Integration " + i);
            Set<Integer> institutionTypes = Stream.of(1, 2, 11).collect(Collectors.toCollection(HashSet::new));
            Azure azure = new Azure("azure_s" + i, "https://m/images/buttons/btn.png", "ShA" + i);
            azure.setEntityId("https://net/d8ed/" + i);
            ConfigurationEntity ce = new ConfigurationEntity();
            azure.setConfigurationEntity(ce);
            azure.setInstitutionTypes(institutionTypes);
            ce.setIdp(azure);
            DiscoveryInformation discoveryInformation = new DiscoveryInformation("customDisplayName" + i, "title" + i,
                    true);
            discoveryInformation.setEarlyEducationProvider(true);
            // TODO: ce.setAttributes();
            int deploymentPhase = 0;
            if (i == 4) {
                deploymentPhase = 1;
            }
            Integration integration = new Integration(400000L + Long.valueOf(i), LocalDate.now(), ce,
                    LocalDate.of(2023, 7, 30),
                    deploymentPhase, discoveryInformation, organization, "serviceContactAddress" + i + "@example.net");

            // integration permissions
            integration.addPermissionTo(integrationSets.get(i));
            Integration savedIntegration = underTest.save(integration);
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }

        // retrieve the permission lastUpdatedOn times
        List<LocalDateTime> lastUpdatedOnTimes = new ArrayList<LocalDateTime>();
        List<Integration> foundIntegrations = underTest.findAll();
        assertEquals(9, foundIntegrations.size());
        for (Integration i : foundIntegrations) {
            if (i.getPermissions().size() > 0) {
                if (i.getConfigurationEntity().getIdp() != null) {
                    lastUpdatedOnTimes.add(i.getPermissions().get(0).getLastUpdatedOn());
                }
            }
        }

        // when
        List<Integration> changedIntegrations = underTest
                .findDistinctByPermissionsLastUpdatedOnAfterAndDeploymentPhase(lastUpdatedOnTimes.get(1).plusNanos(1000), 0);

        // then
        assertEquals(1, changedIntegrations.size());
    }
}
