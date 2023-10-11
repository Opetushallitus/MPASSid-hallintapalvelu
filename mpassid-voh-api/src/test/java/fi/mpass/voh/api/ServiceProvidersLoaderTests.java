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
public class ServiceProvidersLoaderTests {

    ServiceProvidersLoader serviceLoader;

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
    public void testOidcLoader() throws Exception {
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(3, repository.findAll().size());
    }

    @Test
    public void testSamlLoader() throws Exception {
        String location = "saml_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(2, repository.findAll().size());
    }

    @Test
    public void testOidcSetLoader() throws Exception {
        // 64, all with an attribute, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(67, repository.findAll().size());
    }
}