package fi.mpass.voh.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;

import fi.mpass.voh.api.config.IntegrationSetLoader;
import fi.mpass.voh.api.config.ServiceProvidersLoader;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class IntegrationSetLoaderTests {

    ServiceProvidersLoader integrationSetLoader;

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
    public void testIntegrationSetLoader() throws Exception {
        // 64
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.findAll().size());
    }

    @Test
    public void testIntegrationSetLoaderWithDuplicateSet() throws Exception {
        // total 65 with a duplicate, 64 unique
        String setLocation = "integration_invalid_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.findAll().size());
    }
}