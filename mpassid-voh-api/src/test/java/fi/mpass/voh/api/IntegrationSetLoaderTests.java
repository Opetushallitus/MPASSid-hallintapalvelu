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
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import java.util.Set;

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
        // 64, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(63, repository.findAll().size());
    }

    @Test
    public void testIntegrationSetLoaderWithDuplicateSet() throws Exception {
        // total 65 with a duplicate, 64 unique
        String setLocation = "integration_invalid_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.findAll().size());
    }

    @Test
    public void testIntegrationSetLoaderReloadModifications() throws Exception {
        // 64, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(63, repository.findAll().size());

        setLocation = "integration_sets_mods.json";
        IntegrationSetLoader setReloader = new IntegrationSetLoader(repository, service, loader);
        setReloader.run(setLocation);

        assertEquals(63, repository.findAll().size());

        // 6000003, changed attribute value
        Optional<Integration> modifiedAttrIntegration = repository.findById(6000003L);
        assertTrue(modifiedAttrIntegration.isPresent());
        Set<Attribute> attributes = modifiedAttrIntegration.get().getConfigurationEntity().getAttributes();
        for (Attribute a : attributes) {
            if (a.getName().equals("allowtestlearnerid")) {
                assertEquals("true", a.getContent());
            }
        }

        // 6000004, changed set name
        Optional<Integration> modifiedIntegration = repository.findById(6000004L);
        assertTrue(modifiedIntegration.isPresent());
        assertEquals("muutettu Edita oppimisen palvelut", modifiedIntegration.get().getConfigurationEntity().getSet().getName());

        // 6000005, added organization
        Optional<Integration> modifiedIntegrationOrg = repository.findById(6000005L);
        assertTrue(modifiedIntegrationOrg.isPresent());
        assertEquals("1.2.246.562.10.33651716236", modifiedIntegrationOrg.get().getOrganization().getOid());
    }

    @Test
    public void testIntegrationSetLoaderReloadAdditions() throws Exception {
        // 64, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(63, repository.findAll().size());

        setLocation = "integration_sets_adds.json";
        IntegrationSetLoader setReloader = new IntegrationSetLoader(repository, service, loader);
        setReloader.run(setLocation);

        Optional<Integration> addedIntegration = repository.findById(6000002L);
        assertTrue(addedIntegration.isPresent());
        Set<Attribute> attributes = addedIntegration.get().getConfigurationEntity().getAttributes();
        boolean addedFound = false;
        for (Attribute a : attributes) {
            if (a.getName().equals("allowtestlearnerid2")) {
                assertEquals("false", a.getContent());
                addedFound = true;
            }
        }

        assertTrue(addedFound);
        assertEquals(64, repository.findAll().size());
    }

    @Test
    public void testIntegrationSetLoaderReloadDeletions() throws Exception {
        // 63, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(63, repository.findAll().size());

        // 62
        setLocation = "integration_sets_dels.json";
        IntegrationSetLoader setReloader = new IntegrationSetLoader(repository, service, loader);
        setReloader.run(setLocation);

        // all found, one inactive
        assertEquals(63, repository.findAll().size());

        // 6000003 whole integration set inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(6000003L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 6000004 attribute allowtestlearnerid removed
        Optional<Integration> removedAttrIntegration = repository.findById(6000004L);
        assertTrue(removedAttrIntegration.isPresent());
        Set<Attribute> attributes = removedAttrIntegration.get().getConfigurationEntity().getAttributes();
        assertTrue(attributes.size()==0);

        // 6000005 whole attributes array was removed
        Optional<Integration> inactivatedAttributesIntegration = repository.findById(6000005L);
        assertTrue(inactivatedAttributesIntegration.isPresent());
        Set<Attribute> attributesArray = inactivatedAttributesIntegration.get().getConfigurationEntity().getAttributes();
        assertTrue(attributesArray.size()==0);
    }

        @Test
    public void testIntegrationSetLoaderReloadDeletionsRestore() throws Exception {
        // 63, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(63, repository.findAll().size());

        // 62
        setLocation = "integration_sets_dels.json";
        IntegrationSetLoader setReloader = new IntegrationSetLoader(repository, service, loader);
        setReloader.run(setLocation);

        // all found, one inactive
        assertEquals(63, repository.findAll().size());

        // 6000003 whole integration set inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(6000003L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 63, one with organization
        String restoreLocation = "integration_sets.json";
        setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(restoreLocation);

        // 6000003 whole integration set was activated again
        Optional<Integration> activatedIntegration = repository.findById(6000003L);
        assertTrue(activatedIntegration.isPresent());
        assertTrue(activatedIntegration.get().isActive());
    }

}