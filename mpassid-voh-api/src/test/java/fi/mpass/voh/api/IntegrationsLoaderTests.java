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
import fi.mpass.voh.api.config.IntegrationSetLoader;
import fi.mpass.voh.api.config.ServiceProvidersLoader;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.sp.ServiceProviderRepository;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT, properties = {"spring.h2.console.enabled=true"})
public class IntegrationsLoaderTests {

    IntegrationLoader integrationLoader;

    @Autowired
    IntegrationRepository repository;

    //@Autowired
    //IntegrationGroupRepository groupRepository;

    @Autowired
    ServiceProviderRepository serviceProviderRepository;

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
        // 64
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String oidcLocation = "oidc_services.json";
        // 2
        String samlLocation = "saml_services.json";
        ServiceProvidersLoader serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(oidcLocation);
        serviceLoader.run(samlLocation);

        // 2
        String location = "gsuite_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, serviceProviderRepository, loader);
        integrationLoader.run(location);

        // 71
        assertEquals(71, repository.findAll().size());
    }

    @Test
    public void testAzureLoader() throws Exception {
        String location = "azure_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, serviceProviderRepository, loader);
        integrationLoader.run(location);

        assertEquals(4, repository.findAll().size());
    }

    @Test
    public void testWilmaLoader() throws Exception {
        String location = "wilma_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, serviceProviderRepository, loader);
        integrationLoader.run(location);

        assertEquals(3, repository.findAll().size());
    }

    @Test
    @Transactional
    public void testOpinsysLoader() throws Exception {
        String location = "opinsys_home_organizations.json";
        integrationLoader = new IntegrationLoader(repository, service, serviceProviderRepository, loader);
        integrationLoader.run(location);

        List<Integration> integrations = repository.findAll();
        DiscoveryInformation di = integrations.get(0).getDiscoveryInformation();
        Set<String> schools = di.getSchools();
        Set<Attribute> attributes = integrations.get(0).getConfigurationEntity().getAttributes();
        Set<Integer> institutionTypes = integrations.get(0).getConfigurationEntity().getIdp().getInstitutionTypes();

        assertEquals(3, integrations.size());
        assertEquals(3, schools.size());
        assertEquals(4, attributes.size());
        assertEquals(2, institutionTypes.size());
    }

    @Test
    public void testWilmaLoaderWithoutPreassignedId() throws Exception {
        String location = "wilma_home_organizations_without_id.json";
        integrationLoader = new IntegrationLoader(repository, service, serviceProviderRepository, loader);
        integrationLoader.run(location);

        assertEquals(1, repository.findAll().size());
    }
}
