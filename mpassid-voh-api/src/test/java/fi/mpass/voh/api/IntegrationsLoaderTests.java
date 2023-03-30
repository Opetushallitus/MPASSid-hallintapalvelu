package fi.mpass.voh.api;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;
import org.springframework.transaction.annotation.Transactional;

import fi.mpass.voh.api.config.IntegrationLoader;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class IntegrationsLoaderTests {

    IntegrationLoader integrationLoader;

    @Autowired
    IntegrationRepository repository;

    @Autowired
    OrganizationService service;

    @Autowired
    ResourceLoader loader;

    @BeforeEach
    void drop() {
        repository.deleteAll();
    }
 
    @Test
    public void testGsuiteLoader() throws Exception {
        String location = "gsuite_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, loader);
        integrationLoader.run(location);

        // includes 4 IdentityProviders + 17 distinct (allowed) Service Providers (1 ServiceProvider twice in data)
        assertEquals(21, repository.findAll().size());
    }

    @Test
    public void testAzureLoader() throws Exception {
        String location = "azure_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, loader);
        integrationLoader.run(location);

        // includes 3 IdentityProviders + 6 (allowed) Service Providers
        assertEquals(9, repository.findAll().size());
    }

    @Test
    public void testWilmaLoader() throws Exception {
        String location = "wilma_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, loader);
        integrationLoader.run(location);

        assertEquals(3, repository.findAll().size());
    }

    @Test
    @Transactional
    public void testOpinsysLoader() throws Exception {
        String location = "opinsys_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, loader);
        integrationLoader.run(location);

        List<Integration> integrations = repository.findAll();
        DiscoveryInformation di = integrations.get(0).getDiscoveryInformation();
        Set<String> schools = di.getSchools();

        assertEquals(2, integrations.size());
        assertEquals(3, schools.size());
    }
}
