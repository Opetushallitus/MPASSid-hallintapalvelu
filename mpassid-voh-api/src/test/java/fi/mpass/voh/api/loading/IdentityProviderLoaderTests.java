package fi.mpass.voh.api.loading;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;
import org.springframework.transaction.annotation.Transactional;

import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.config.IntegrationSetLoader;
import fi.mpass.voh.api.config.ServiceProvidersLoader;
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT, properties = {
        "spring.h2.console.enabled=true" })
class IdentityProviderLoaderTests {

    IdentityProviderLoader idpLoader;

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
    void testGsuiteLoader() throws Exception {
        // 63
        String setLocation = "set/integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, organizationService, loader);
        setLoader.run(setLocation);

        // 4
        String oidcLocation = "oidc_services.json";
        // 2
        String samlLocation = "saml_services.json";
        ServiceProvidersLoader serviceLoader = new ServiceProvidersLoader(repository, organizationService, loader);
        serviceLoader.run(oidcLocation);
        serviceLoader.run(samlLocation);

        // 2, one with integration permissions
        String location = "gsuite_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        // 71
        assertEquals(71, repository.count());
    }

    @Test
    void testAzureLoader() throws Exception {
        String location = "azure_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());
    }

    @Test
    void testWilmaLoader() throws Exception {
        String location = "wilma_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        loading = idpLoader.init(loading);

        assertEquals(3, repository.count());
        // no errors
        assertEquals(0, loading.getIntegrationStatus().size());
    }

    @Test
    void testWilmaLoaderWithoutOrganization() throws Exception {
        String location = "wilma_home_organizations_without_organization.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        loading = idpLoader.init(loading);

        // one correct integration with organization out of three
        assertEquals(1, repository.count());
        // only errors are reported, two incorrect integrations without organization
        assertEquals(2, loading.getIntegrationStatus().size());
    }

    @Test
    @Transactional
    void testOpinsysLoader() throws Exception {
        String location = "opinsys_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

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
    void testWilmaLoaderWithoutPreassignedId() throws Exception {
        String location = "wilma_home_organizations_without_id.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        assertEquals(1, repository.count());
    }

    @Test
    void testAzureReloadModifications() throws Exception {
        String location = "azure_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());

        String idpLocation = "azure_home_organizations_mods.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(idpLocation);
        loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());

        // 4000001 azure, logourl, entityid changed
        Optional<Integration> modifiedIntegration = repository.findById(4000001L);
        assertTrue(modifiedIntegration.isPresent());
        assertEquals("https://btn-t-changed.png",
                modifiedIntegration.get().getConfigurationEntity().getIdp().getLogoUrl());
        Azure azure = (Azure) modifiedIntegration.get().getConfigurationEntity().getIdp();
        assertEquals("https://df-44d9-bffa-1a-changed/", azure.getEntityId());

        // 4000002, attribute groupLevels content change, attribute surname type
        // (incorrect) change
        Optional<Integration> modifiedAttrIntegration = repository.findById(4000002L);
        assertTrue(modifiedAttrIntegration.isPresent());
        Set<Attribute> attributeSet = modifiedAttrIntegration.get().getConfigurationEntity().getAttributes();
        for (Attribute a : attributeSet) {
            if (a.getName().equals("groupLevels")) {
                assertEquals("opentunti.classLevel.change", a.getContent());
            }
            if (a.getName().equals("surname")) {
                assertEquals("data", a.getType());
            }
        }

        // 4000003, discovery information title and showSchools change
        Optional<Integration> modifiedDiscoveryInfoIntegration = repository.findById(4000003L);
        assertTrue(modifiedDiscoveryInfoIntegration.isPresent());
        DiscoveryInformation di = modifiedDiscoveryInfoIntegration.get().getDiscoveryInformation();
        assertEquals("Va changed", di.getTitle());
        assertEquals(false, di.getShowSchools());

        // 4000004, deployment phase change
        Optional<Integration> modifiedDeploymentPhaseIntegration = repository.findById(4000004L);
        assertTrue(modifiedDeploymentPhaseIntegration.isPresent());
        assertEquals(2, modifiedDeploymentPhaseIntegration.get().getDeploymentPhase());
    }

    @Test
    void testAzureReloadAdditions() throws Exception {
        String location = "azure_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());

        String idpLocation = "azure_home_organizations_adds.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(idpLocation);
        loading = new Loading();
        idpLoader.init(loading);

        // 4000005 added integration
        assertEquals(5, repository.count());
        Optional<Integration> addedIntegration = repository.findById(4000005L);
        assertTrue(addedIntegration.isPresent());

        // 4000001 added institution type 21, total 4 types
        Optional<Integration> addedInstitutionTypeIntegration = repository.findById(4000001L);
        assertTrue(addedInstitutionTypeIntegration.isPresent());
        Set<Integer> institutionTypes = addedInstitutionTypeIntegration.get().getConfigurationEntity().getIdp()
                .getInstitutionTypes();
        assertEquals(4, institutionTypes.size());
        assertTrue(institutionTypes.contains(21));

        // 4000002 added ce.attributes name role, content role, type user
        Optional<Integration> addedAttributeIntegration = repository.findById(4000002L);
        assertTrue(addedAttributeIntegration.isPresent());
        Set<Attribute> attributes = addedAttributeIntegration.get().getConfigurationEntity().getAttributes();
        boolean addedFound = false;
        for (Attribute a : attributes) {
            if (a.getName().equals("role")) {
                assertEquals("role", a.getContent());
                assertEquals("user", a.getType());
                addedFound = true;
                break;
            }
        }
        assertTrue(addedFound);

        // 4000003, discovery information schools addition
        Optional<Integration> addedDiscoveryInfoIntegration = repository.findById(4000003L);
        assertTrue(addedDiscoveryInfoIntegration.isPresent());
        DiscoveryInformation di = addedDiscoveryInfoIntegration.get().getDiscoveryInformation();
        Set<String> schools = di.getSchools();
        assertTrue(schools.contains("00842"));

        // TODO 5000003 added attributes array with allowtestlearnerid attribute
    }

    @Test
    void testAzureReloadDeletions() throws Exception {
        String location = "azure_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());

        String idpLocation = "azure_home_organizations_dels.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(idpLocation);
        loading = new Loading();
        idpLoader.init(loading);

        // all idp integrations were found, one idp inactive
        assertEquals(4, repository.count());

        // 4000001 integration was inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(4000001L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());
        // TODO permissions ?

        // 4000004 attribute learnerId removed, attributes size 12 -> 11
        Optional<Integration> removedAttrIntegration = repository.findById(4000004L);
        assertTrue(removedAttrIntegration.isPresent());
        Set<Attribute> attributes = removedAttrIntegration.get().getConfigurationEntity().getAttributes();
        assertEquals(11, attributes.size());
        boolean removedFound = false;
        for (Attribute a : attributes) {
            if (a.getName().equals("learnerId")) {
                removedFound = true;
                break;
            }
        }
        assertFalse(removedFound);

        // 4000003 removed institution types 15, 21, total 1 type
        Optional<Integration> addedInstitutionTypeIntegration = repository.findById(4000003L);
        assertTrue(addedInstitutionTypeIntegration.isPresent());
        Set<Integer> institutionTypes = addedInstitutionTypeIntegration.get().getConfigurationEntity().getIdp()
                .getInstitutionTypes();
        assertEquals(1, institutionTypes.size());
        assertFalse(institutionTypes.contains(15));
        assertTrue(institutionTypes.contains(11));

        // 4000002 removed discovery information title field
        Optional<Integration> removedDiscoveryInformationTitleIntegration = repository.findById(4000002L);
        assertTrue(removedDiscoveryInformationTitleIntegration.isPresent());
        assertNull(removedDiscoveryInformationTitleIntegration.get().getDiscoveryInformation().getTitle());
    }

    @Test
    void testAzureReloadDeletionsRestore() throws Exception {
        String location = "azure_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(location);
        Loading loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());

        String idpLocation = "azure_home_organizations_dels.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(idpLocation);
        loading = new Loading();
        idpLoader.init(loading);

        // all idp integrations were found, one idp inactive
        assertEquals(4, repository.count());

        // 4000001 integration was inactivated
        Optional<Integration> inactivatedIntegration = repository.findById(4000001L);
        assertTrue(inactivatedIntegration.isPresent());
        assertFalse(inactivatedIntegration.get().isActive());

        String restoreLocation = "azure_home_organizations.json";
        idpLoader = new IdentityProviderLoader(repository, organizationService, loader);
        idpLoader.setInput(restoreLocation);
        loading = new Loading();
        idpLoader.init(loading);

        assertEquals(4, repository.count());

        // 4000001 integration was activated again
        Optional<Integration> activatedIntegration = repository.findById(4000001L);
        assertTrue(activatedIntegration.isPresent());
        assertTrue(activatedIntegration.get().isActive());
    }

}
