package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.commons.lang3.builder.Diff;
import org.apache.commons.lang3.builder.DiffResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationDiffBuilder;
import fi.mpass.voh.api.integration.idp.Adfs;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.organization.Organization;

class IntegrationDiffBuilderTests {

    private List<Integration> serviceProviders;
    private List<Integration> integrationSets;
    private List<Integration> identityProviders;

    @BeforeEach
    void setUp() {
        Organization organization = new Organization("Organization abc", "1.2.3.4.5.6.7.8");

        integrationSets = new ArrayList<Integration>();
        serviceProviders = new ArrayList<Integration>();
        identityProviders = new ArrayList<Integration>();
        // setup set integration instances
        for (int i = 0; i < 3; i++) {
            Integration set = createSet(Long.valueOf(i), organization);
            integrationSets.add(set);
        }
        // setup sp integrations, sp_i -> set_i
        for (int i = 0; i < 3; i++) {
            Integration sp = createServiceProvider(Long.valueOf(i), organization);
            // sp.addToSet(integrationSets.get(i));
            serviceProviders.add(sp);
        }
        // sp_0 -> set_0 => sp_0 -> { set_0 }
        serviceProviders.get(0).addToSet(integrationSets.get(0));
        // sp_1 -> set_1 => sp_1 -> { set_1 }
        serviceProviders.get(1).addToSet(integrationSets.get(1));
        // sp_2 -> set_0 => sp_2 -> { set_0 }
        serviceProviders.get(2).addToSet(integrationSets.get(0));

        for (int i = 0; i < 2; i++) {
            Integration idp = createIdentityProvider(Long.valueOf(i), organization);
            identityProviders.add(idp);
        }
    }

    private Integration createServiceProvider(Long id, Organization organization) {
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider sp = new OidcServiceProvider();
        Map<String, Object> metadata = new HashMap<String, Object>();
        metadata.put("client_id", "clientId-" + id);
        sp.setMetadata(metadata);
        sp.setConfigurationEntity(ce);
        ce.setSp(sp);
        sp.setName("Integration SP #" + id);
        sp.setClientId("clientId-" + id);
        Integration integration = new Integration(id, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                0, null, organization, "serviceContactAddress" + id + "@example.net");
        return integration;
    }

    private Integration createSet(Long id, Organization organization) {
        ConfigurationEntity ce = new ConfigurationEntity();
        IntegrationSet set = new IntegrationSet();
        set.setConfigurationEntity(ce);
        ce.setSet(set);
        set.setName("Integration set #" + id);
        Integration integrationSet = new Integration(1000L + id, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                0, null, organization, "serviceContactAddress" + id + "@example.net");
        return integrationSet;
    }

    private Integration createIdentityProvider(Long id, Organization organization) {
        ConfigurationEntity ce = new ConfigurationEntity();
        IdentityProvider idp = new Adfs();
        idp.setConfigurationEntity(ce);
        ce.setIdp(idp);
        ((Adfs) idp).setMetadataUrl("https://example.org");
        ((Adfs) idp).setEntityId("entityId-" + id);
        Integration integration = new Integration(id, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                0, null, organization, "serviceContactAddress" + id + "@example.net");
        return integration;
    }

    @Test
    void givenTwoIntegrationsDifferentSets_whenComparingWithDiffBuilder_thenDifferencesFound() {

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareSp(serviceProviders.get(0),
                serviceProviders.get(1));
        for (Diff<?> d : diff.getDiffs()) {
            System.out.println(d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
        }

        assertFalse(diff.getDiffs().isEmpty());
    }

    @Test
    void givenSameIntegrationSameSets_whenComparingWithDiffBuilder_thenNoDifferencesFound() {

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareSp(serviceProviders.get(0),
                serviceProviders.get(0));
        for (Diff<?> d : diff.getDiffs()) {
            System.out.println(d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
        }

        assertTrue(diff.getDiffs().isEmpty());
    }

    @Test
    void givenTwoIntegrationSameSets_whenComparingWithDiffBuilder_thenNoSetDifferencesFound() {

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareSp(serviceProviders.get(0),
                serviceProviders.get(2));
        for (Diff<?> d : diff.getDiffs()) {
            System.out.println(d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
            assertNotEquals("integrationSets", d.getFieldName());
        }
    }

    @Test
    void givenTwoIdpIntegrationsDifferentFields_whenComparingWithDiffBuilder_thenDifferencesFound() {

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareIdp(identityProviders.get(0),
                identityProviders.get(1));
        for (Diff<?> d : diff.getDiffs()) {
            System.out.println(d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
        }

        assertFalse(diff.getDiffs().isEmpty());
    }

    @Test
    void givenSameIdpIntegrationSameFields_whenComparingWithDiffBuilder_thenNoDifferencesFound() {

        DiffResult<Integration> diff = IntegrationDiffBuilder.compareIdp(identityProviders.get(0),
                identityProviders.get(0));
        for (Diff<?> d : diff.getDiffs()) {
            System.out.println(d.getFieldName() + ": " + d.getLeft() + " != " + d.getRight());
        }

        assertTrue(diff.getDiffs().isEmpty());
    }
}
