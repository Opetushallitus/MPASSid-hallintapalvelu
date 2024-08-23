package fi.mpass.voh.api.loading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Isolated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Isolated
@SpringBootTest
class SetLoaderTests {

    SetLoader setLoader;

    @Autowired
    IntegrationRepository repository;

    @Autowired
    OrganizationService organizationService;

    @Autowired
    CredentialService credentialService;

    @Autowired
    ResourceLoader loader;

    @BeforeEach
    void drop() {
        repository.deleteAll();
        repository.flush();
    }

    @Test
    void testIntegrationSetLoader() throws Exception {
        // 64, one with organization
        String setLocation = "set/integration_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(64, repository.count());
    }

    @Test
    void testIntegrationSetLoaderWithDuplicateSet() throws Exception {
        // total 65 with a duplicate, 64 unique
        String setLocation = "set/integration_invalid_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        // the input was discarded since there were duplicate integrations
        assertEquals(0, repository.count());
        // Duplicate error
        assertEquals(1, loading.getErrors().size());
    }

    @Test
    void testIntegrationSetLoaderWithLessThanThreshold() throws Exception {
        // 64
        String setLocation = "set/integration_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(64, repository.count());

        // 4 in input, 64 should remain due to exceeded maximum removal number
        setLocation = "set/integration_sets_more_than_max_removals.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setMaxRemovalNumber(8);
        setLoader.setInput(setLocation);
        loading = new Loading();
        setLoader.init(loading);

        List<Integration> integrations = repository.findAll();
        integrations.forEach(i -> assertEquals(0, i.getStatus()));
    }

    @Test
    void testIntegrationSetLoaderReloadModifications() throws Exception {
        // 64, one with organization
        String setLocation = "set/integration_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(64, repository.count());

        setLocation = "set/integration_sets_mods.json";
        SetLoader setReloader = new SetLoader(repository, organizationService, credentialService, loader);
        setReloader.setInput(setLocation);
        loading = new Loading();
        setReloader.init(loading);

        assertEquals(64, repository.count());

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
        assertEquals("muutettu Edita oppimisen palvelut",
                modifiedIntegration.get().getConfigurationEntity().getSet().getName());

        // 6000005, added organization
        Optional<Integration> modifiedIntegrationOrg = repository.findById(6000005L);
        assertTrue(modifiedIntegrationOrg.isPresent());
        assertEquals("1.2.246.562.10.33651716236", modifiedIntegrationOrg.get().getOrganization().getOid());

        // 6000006, changed organization
        modifiedIntegrationOrg = repository.findById(6000006L);
        assertTrue(modifiedIntegrationOrg.isPresent());
        assertEquals("1.2.246.562.10.52429530125", modifiedIntegrationOrg.get().getOrganization().getOid());
    }

    @Test
    void testIntegrationSetLoaderReloadAdditions() throws Exception {
        // 64, one with organization
        String setLocation = "set/integration_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(64, repository.count());

        // 6000002 add allowtestlearnerid2 attribute to integration
        setLocation = "set/integration_sets_adds.json";
        SetLoader setReloader = new SetLoader(repository, organizationService, credentialService, loader);
        setReloader.setInput(setLocation);
        loading = new Loading();
        setReloader.init(loading);

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
        // 6000065 new integration
        assertEquals(65, repository.count());
    }

    @Test
    void testIntegrationSetLoaderReloadDeletions() throws Exception {
        // 64
        String setLocation = "set/integration_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(64, repository.count());

        // 62
        setLocation = "set/integration_sets_dels.json";
        SetLoader setReloader = new SetLoader(repository, organizationService, credentialService, loader);
        setReloader.setInput(setLocation);
        loading = new Loading();
        setReloader.init(loading);

        // all found, two inactive
        assertEquals(64, repository.count());

        // 6000002 whole integration set inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(6000002L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 6000003 whole integration set inactivated
        inactivatedIntegration = repository.findById(6000003L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 6000004 attribute allowtestlearnerid removed
        Optional<Integration> removedAttrIntegration = repository.findById(6000004L);
        assertTrue(removedAttrIntegration.isPresent());
        Set<Attribute> attributes = removedAttrIntegration.get().getConfigurationEntity().getAttributes();
        assertEquals(0, attributes.size());

        // 6000005 whole attributes array was removed
        Optional<Integration> inactivatedAttributesIntegration = repository.findById(6000005L);
        assertTrue(inactivatedAttributesIntegration.isPresent());
        Set<Attribute> attributesArray = inactivatedAttributesIntegration.get().getConfigurationEntity()
                .getAttributes();
        assertEquals(0, attributesArray.size());
    }

    @Test
    void testIntegrationSetLoaderReloadDeletionsRestore() throws Exception {
        // 64
        String setLocation = "set/integration_sets.json";
        setLoader = new SetLoader(repository, organizationService, credentialService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(64, repository.count());

        // 62
        setLocation = "set/integration_sets_dels.json";
        SetLoader setReloader = new SetLoader(repository, organizationService, credentialService, loader);
        setReloader.setInput(setLocation);
        loading = new Loading();
        setReloader.init(loading);

        // all found, two inactive
        assertEquals(64, repository.count());

        // 6000002 whole integration set inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(6000002L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 6000003 whole integration set inactivated
        inactivatedIntegration = repository.findById(6000003L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 64
        String restoreLocation = "set/integration_sets.json";
        setReloader = new SetLoader(repository, organizationService, credentialService, loader);
        setReloader.setInput(restoreLocation);
        loading = new Loading();
        setReloader.init(loading);

        // 6000002 whole integration set was activated again
        Optional<Integration> activatedIntegration = repository.findById(6000002L);
        assertTrue(activatedIntegration.isPresent());
        assertTrue(activatedIntegration.get().isActive());

        // 6000003 whole integration set was activated again
        activatedIntegration = repository.findById(6000003L);
        assertTrue(activatedIntegration.isPresent());
        assertTrue(activatedIntegration.get().isActive());
    }
}