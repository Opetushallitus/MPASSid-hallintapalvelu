package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashSet;
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

@DataJpaTest
public class IntegrationRepositoryTests {

    @Autowired
    private IntegrationRepository underTest;

    @Test
    public void test() {
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
}
