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
import fi.mpass.voh.api.organization.OrganizationService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;

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

        assertEquals(64, repository.findAll().size());
    }
/*
    @Test
    public void testIntegrationSetLoaderReloadDeletions() throws Exception {
        // 64, one with organization
        String setLocation = "integration_sets.json";
        IntegrationSetLoader setLoader = new IntegrationSetLoader(repository, service, loader);
        setLoader.run(setLocation);

        Optional<Integration> integration_with_organization = repository.findById(6000003L);

        assertTrue(integration_with_organization.isPresent());
        assertEquals("1.2.246.562.10.33651716236", integration_with_organization.get().getOrganization().getOid());
        assertEquals(63, repository.findAll().size());

        setLocation = "integration_sets_dels.json";
        IntegrationSetLoader setReloader = new IntegrationSetLoader(repository, service, loader);
        setReloader.run(setLocation);

        assertEquals(62, repository.findAll().size());
    }
*/
}