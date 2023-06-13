package fi.mpass.voh.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;

import fi.mpass.voh.api.config.IntegrationGroupLoader;
import fi.mpass.voh.api.config.ServiceProvidersLoader;
import fi.mpass.voh.api.integration.IntegrationGroupRepository;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class ServiceProvidersLoaderTests {

    ServiceProvidersLoader serviceLoader;

    @Autowired
    IntegrationRepository repository;

    @Autowired
    IntegrationGroupRepository groupRepository;

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
        serviceLoader = new ServiceProvidersLoader(repository, groupRepository, service, loader);
        serviceLoader.run(location);

        assertEquals(3, repository.findAll().size());
    }

    @Test
    public void testSamlLoader() throws Exception {
        String location = "saml_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, groupRepository, service, loader);
        serviceLoader.run(location);

        assertEquals(2, repository.findAll().size());
    }

    @Test
    public void testOidcGroupLoader() throws Exception {
        String groupsLocation = "integration_groups.json";
        IntegrationGroupLoader groupLoader = new IntegrationGroupLoader(groupRepository, loader);
        groupLoader.run(groupsLocation);

        String location = "oidc_services_with_groups.json";
        serviceLoader = new ServiceProvidersLoader(repository, groupRepository, service, loader);
        serviceLoader.run(location);

        assertEquals(3, repository.findAll().size());
    }
}