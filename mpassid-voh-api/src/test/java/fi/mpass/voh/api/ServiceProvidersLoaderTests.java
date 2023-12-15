package fi.mpass.voh.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;

import fi.mpass.voh.api.config.IntegrationSetLoader;
import fi.mpass.voh.api.config.ServiceProvidersLoader;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import java.util.Set;

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
        // 63, all with an attribute, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(66, repository.findAll().size());

        Optional<Integration> integration = repository.findByIdAll(5000002L);
        assertTrue(integration.isPresent());
        Set<Integration> integrationSets = integration.get().getIntegrationSets();
        boolean associated = false;
        for (Integration i : integrationSets) {
            if (i.getId().equals(6000001L)) {
                associated = true;
                break;
            }
        }
        // TODO check bidirection
        assertTrue(associated);
    }

    @Test
    public void testOidcSetReloadModifications() throws Exception {
        // 63, all with an attribute, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(66, repository.findAll().size());

        // 3
        String spLocation = "oidc_services_mods.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(spLocation);

        assertEquals(66, repository.findAll().size());

        // 5000001, changed sp.name. sp.metadata.clientId
        Optional<Integration> modifiedIntegration = repository.findById(5000001L);
        assertTrue(modifiedIntegration.isPresent());
        assertEquals("K H 2", modifiedIntegration.get().getConfigurationEntity().getSp().getName());
        assertEquals("clientId2",
                modifiedIntegration.get().getConfigurationEntity().getSp().getMetadata().get("client_id"));

        // a case where input integration set id doesn't exist. This is resolved by
        // resetting all associations.
        // 5000002, changed set 600001 -> (not existing) 6000002 => no associations
        Optional<Integration> modifiedIntegrationSet = repository.findByIdAll(5000002L);
        assertTrue(modifiedIntegrationSet.isPresent());
        assertTrue(modifiedIntegrationSet.get().getIntegrationSets().isEmpty());
    }

    @Test
    public void testOidcSetReloadAttributeModifications() throws Exception {
        // 63, all with an attribute, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(66, repository.findAll().size());

        // 3
        String spLocation = "oidc_services_mods.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(spLocation);

        assertEquals(66, repository.findAll().size());

        // changed attribute value
        Optional<Integration> modifiedAttrIntegration = repository.findById(5000001L);
        assertTrue(modifiedAttrIntegration.isPresent());
        Set<Attribute> attributeSet = modifiedAttrIntegration.get().getConfigurationEntity().getAttributes();
        for (Attribute a : attributeSet) {
            if (a.getName().equals("allowtestlearnerid")) {
                assertEquals("false", a.getContent());
            }
        }
    }

    @Test
    public void testOidcSetReloadAdditions() throws Exception {
        // 63, all with an attribute, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(66, repository.findAll().size());

        // 4
        String spLocation = "oidc_services_adds.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(spLocation);

        assertEquals(67, repository.findAll().size());
        Optional<Integration> addedIntegration = repository.findById(5000004L);
        assertTrue(addedIntegration.isPresent());

        // sp integration 5000002, added metadata entry "auth_type":
        // "client_secret_basic"
        Optional<Integration> addedMetadataIntegration = repository.findById(5000002L);
        assertTrue(addedMetadataIntegration.isPresent());
        assertEquals("client_secret_basic",
                addedMetadataIntegration.get().getConfigurationEntity().getSp().getMetadata().get("auth_type"));

        // sp integration 5000003, added ce.attributes name allowtestlearnerid, content
        // true, type data
        Optional<Integration> addedAttrIntegration = repository.findById(5000003L);
        assertTrue(addedAttrIntegration.isPresent());
        Set<Attribute> attributes = addedAttrIntegration.get().getConfigurationEntity().getAttributes();
        boolean addedFound = false;
        for (Attribute a : attributes) {
            if (a.getName().equals("allowtestlearnerid")) {
                assertEquals("false", a.getContent());
                assertEquals("data", a.getType());
                addedFound = true;
                break;
            }
        }
        assertTrue(addedFound);

        // sp integration 5000003, added to integration set 600003
        Optional<Integration> spIntegration = repository.findByIdAll(5000003L);
        assertTrue(spIntegration.isPresent());
        Set<Integration> integrationSets = spIntegration.get().getIntegrationSets();
        assertEquals(6000003L, integrationSets.iterator().next().getId());
    }

    @Test
    public void testOidcSetReloadDeletions() throws Exception {
        // 63, all with an attribute, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        // 3
        String location = "oidc_services.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(location);

        assertEquals(66, repository.findAll().size());

        // 2
        String spLocation = "oidc_services_dels.json";
        serviceLoader = new ServiceProvidersLoader(repository, service, loader);
        serviceLoader.run(spLocation);

        // all (set and sp integrations) were found, one sp inactive
        assertEquals(66, repository.findAll().size());

        // 5000002 integration was inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(5000002L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 5000001 attribute allowtestlearnerid removed
        Optional<Integration> removedAttrIntegration = repository.findById(5000001L);
        assertTrue(removedAttrIntegration.isPresent());
        Set<Attribute> attributes = removedAttrIntegration.get().getConfigurationEntity().getAttributes();
        assertTrue(attributes.size() == 0);

        // 5000003 whole attributes array was removed
        Optional<Integration> inactivatedAttributesIntegration = repository.findById(5000003L);
        assertTrue(inactivatedAttributesIntegration.isPresent());
        Set<Attribute> attributesArray = inactivatedAttributesIntegration.get().getConfigurationEntity()
                .getAttributes();
        assertTrue(attributesArray.size() == 0);

        // 5000003 whole sp metadata entry "token_endpoint_auth_method" was removed
        assertNull(inactivatedAttributesIntegration.get().getConfigurationEntity().getSp().getMetadata()
                .get("token_endpoint_auth_method"));

        // 5000001, removed the sp integration from the set 6000001
        Optional<Integration> removedSetIntegration = repository.findByIdAll(5000001L);
        assertTrue(removedSetIntegration.isPresent());
        Set<Integration> integrationSets = removedSetIntegration.get().getIntegrationSets();
        boolean stillFound = false;
        for (Integration i : integrationSets) {
            if (i.getId().equals(6000001L)) {
                stillFound = true;
                break;
            }
        }
        // TODO check bidirection
        assertFalse(stillFound);
    }
}