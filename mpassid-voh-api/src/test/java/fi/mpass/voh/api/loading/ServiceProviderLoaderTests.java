package fi.mpass.voh.api.loading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.config.IntegrationSetLoader;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@SpringBootTest
class ServiceProviderLoaderTests {

    ServiceProviderLoader spLoader;

    @Autowired
    IntegrationRepository repository;

    @Autowired
    OrganizationService organizationService;

    @Autowired
    ResourceLoader loader;

    @BeforeEach
    void drop() {
        repository.deleteAll();
    }

    @Test
    void testOidcLoader() throws Exception {
        // 64
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());
    }

    @Test
    void testOidcReloadWithJsonSyntaxErrors() throws Exception {
        // 64
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        location = "oidc_services_json_errors.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());
        assertEquals(1, loading.getErrors().size());
    }

    @Test
    void testSamlLoader() throws Exception {
        // 64
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        String location = "saml_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(66, repository.count());
    }

    @Test
    void testOidcSetLoader() throws Exception {
        // 63, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

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
    void testOidcWithDuplicates() throws Exception {
        // 63, all with an attribute, one with organization
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        // 4
        String location = "oidc_services_duplicates.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        // the input was discarded since there were duplicate integrations
        assertEquals(64, repository.count());
        assertEquals(1, loading.getErrors().size());
    }

    @Test
    void testOidcWithNoIntegrationIdOrClientid() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        // 5, several errors
        // one integration without identifier
        // one integration with ununique identifier
        // thus all input integrations are skipped in order to fail fast
        String spLocation = "oidc_services_errors.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(64, repository.count());
        assertEquals(1, loading.getErrors().size());
    }

    @Test
    void testOidcWithUnexistentingSets() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        SetLoader setLoader = new SetLoader(repository, organizationService, loader);
        setLoader.setInput(setLocation);
        Loading loading = new Loading();
        setLoader.init(loading);

        assertEquals(64, repository.count());
        assertEquals(0, loading.getErrors().size());

        // 2, with unexisting sets
        String spLocation = "oidc_services_set_errors.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        spLoader.init(loading);

        assertEquals(64, repository.count());
        assertEquals(2, loading.getErrors().size());
    }

    @Test
    void testOidcSetReloadModifications() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 4
        String spLocation = "oidc_services_mods.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 5000001, changed sp.name. sp.metadata.clientId
        Optional<Integration> modifiedIntegration = repository.findById(5000001L);
        assertTrue(modifiedIntegration.isPresent());
        assertEquals("K H 2", modifiedIntegration.get().getConfigurationEntity().getSp().getName());
        assertEquals("clientId2",
                modifiedIntegration.get().getConfigurationEntity().getSp().getMetadata().get("client_id"));

        // 5000001, changed set 6000001 -> 6000003
        Set<Integration> integrationSet = modifiedIntegration.get().getIntegrationSets();
        for (Integration i : integrationSet) {
            assertEquals(6000003, i.getId());
            break;
        }

        // 5000003, changed deployment phase
        Optional<Integration> modifiedDeploymentPhaseIntegration = repository.findByIdAll(5000003L);
        assertTrue(modifiedDeploymentPhaseIntegration.isPresent());
        assertEquals(1, modifiedDeploymentPhaseIntegration.get().getDeploymentPhase());

        // 5000003, changed metadata redirect_uris
        // assertEquals(1,
        // modifiedDeploymentPhaseIntegration.get().getConfigurationEntity().getSp().getMetadata().get("redirect_uri"));
    }

    @Test
    void testOidcSetReloadIncorrectModifications() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 4
        String spLocation = "oidc_services_mods_errors.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // a case where input integration set id doesn't exist.
        // 5000002, changed set 6000001 -> 6000222 => integration remains unchanged
        Optional<Integration> modifiedIntegrationSet = repository.findByIdAll(5000002L);
        assertTrue(modifiedIntegrationSet.isPresent());
        assertEquals(1, modifiedIntegrationSet.get().getIntegrationSets().size());
        Set<Integration> integrationSets = modifiedIntegrationSet.get().getIntegrationSets();
        assertEquals(6000001L, integrationSets.iterator().next().getId());

        // 5000033, changed/corrected integration set
    }

    @Test
    void testOidcSetReloadAttributeModifications() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 4
        String spLocation = "oidc_services_mods.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

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
    void testOidcSetReloadAdditions() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 5
        String spLocation = "oidc_services_adds.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(69, repository.count());
        Optional<Integration> addedIntegration = repository.findById(5000004L);
        assertTrue(addedIntegration.isPresent());

        // sp integration 5000002, added metadata entry "auth_type":
        // "client_secret_basic"
        Optional<Integration> addedMetadataIntegration = repository.findById(5000002L);
        assertTrue(addedMetadataIntegration.isPresent());
        assertEquals("client_secret_basic",
                addedMetadataIntegration.get().getConfigurationEntity().getSp().getMetadata().get("auth_type"));
        // sp integration 5000002, added metadata (list) entry "added_redirect_uris": [
        // "https://S/secondredirect" ]
        assertThat((List<String>) addedMetadataIntegration.get().getConfigurationEntity().getSp().getMetadata()
                .get("added_redirect_uris")).contains("https://S/secondredirect");

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

        // sp integration 5000003, added to integration set 6000003
        Optional<Integration> spIntegration = repository.findByIdAll(5000003L);
        assertTrue(spIntegration.isPresent());
        Set<Integration> integrationSets = spIntegration.get().getIntegrationSets();
        assertEquals(6000003L, integrationSets.iterator().next().getId());
    }

    @Test
    void testOidcSetReloadDeletions() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 3
        String spLocation = "oidc_services_dels.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        // all (set and sp integrations) were found, one sp inactive
        assertEquals(68, repository.count());

        // 5000002 integration was inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(5000002L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 5000001 attribute allowtestlearnerid removed
        Optional<Integration> removedAttrIntegration = repository.findById(5000001L);
        assertTrue(removedAttrIntegration.isPresent());
        Set<Attribute> attributes = removedAttrIntegration.get().getConfigurationEntity().getAttributes();
        assertEquals(0, attributes.size());

        // 5000003 whole attributes array was removed
        Optional<Integration> inactivatedAttributesIntegration = repository.findById(5000003L);
        assertTrue(inactivatedAttributesIntegration.isPresent());
        Set<Attribute> attributesArray = inactivatedAttributesIntegration.get().getConfigurationEntity()
                .getAttributes();
        assertEquals(0, attributesArray.size());

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

    @Test
    void testOidcSetReloadDeletionsRestore() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        assertEquals(64, repository.count());

        // 4
        String location = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 3
        String spLocation = "oidc_services_dels.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        // all (set and sp integrations) were found, one sp inactive
        assertEquals(68, repository.count());

        // 5000002 integration was inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(5000002L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        // 4
        String restoreLocation = "oidc_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(restoreLocation);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(68, repository.count());

        // 5000002 integration was activated again
        Optional<Integration> activatedIntegration = repository.findById(5000002L);
        assertTrue(activatedIntegration.isPresent());
        assertTrue(activatedIntegration.get().isActive());
    }

    @Test
    void testSamlReloadModifications() throws Exception {
        // 64, all with an attribute
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        // 2
        String location = "saml_services.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(location);
        Loading loading = new Loading();
        spLoader.init(loading);

        assertEquals(66, repository.count());

        // 2
        String spLocation = "saml_services_mods_organization.json";
        spLoader = new ServiceProviderLoader(repository, organizationService, loader);
        spLoader.setInput(spLocation);
        loading = new Loading();
        spLoader.init(loading);

        assertEquals(66, repository.count());

        // 5000010, changed organization oid
        Optional<Integration> modifiedIntegration = repository.findById(5000010L);
        assertTrue(modifiedIntegration.isPresent());
        assertEquals("1.2.246.562.10.65243241471", modifiedIntegration.get().getOrganization().getOid());
    }
}