package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import javax.transaction.Transactional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.domain.Specification;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.IntegrationSpecificationsBuilder;
import fi.mpass.voh.api.integration.IntegrationSpecificationCriteria.Category;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.ServiceProvider;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationRepository;

@SpringBootTest
@Transactional
public class IntegrationSpecificationTests {

    @Autowired
    private IntegrationRepository integrationRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    private Integration integration;
    private Integration spIntegration;

    @BeforeEach
    public void setup() {

        Organization organization = new Organization("Organization zyx", "123456-7", "1.2.3.4.5.6.7.8");
        organizationRepository.save(organization);
        Organization spOrg = new Organization("SP Organization 321", "654321-7", "1.2.3.4.5.6.7.1");
        organizationRepository.save(spOrg);

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Wilma wilma = new Wilma("wilmaHostname");

        // Allowed services, ConfigurationEntity (OIDC Service Provider)
        DiscoveryInformation spDiscoveryInformation = new DiscoveryInformation("SP Custom Display Name",
                "SP Custom Title", true);
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider serviceProvider = new OidcServiceProvider("clientId");
        serviceProvider.setConfigurationEntity(ce);
        ce.setSp(serviceProvider);
        Integration spInt = new Integration(66L, LocalDate.now(), ce, LocalDate.of(2023, 6, 30),
                0, spDiscoveryInformation, spOrg,
                "spContactAddress@example.net");
        integrationRepository.save(spInt);

        wilma.setFlowName("wilmaFlowname");
        configurationEntity.setIdp(wilma);

        integration = new Integration(99L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        integration.addPermissionTo(spInt);

        integrationRepository.save(integration);

        // ServiceProvider

        Organization spOrganization = new Organization("Organization xyz", "123456-9", "1.2.3.4.5.6.7.9");
        organizationRepository.save(spOrganization);

        ConfigurationEntity configurationEntitySp = new ConfigurationEntity();
        ServiceProvider oidcSp = new OidcServiceProvider("clientId2");
        oidcSp.setConfigurationEntity(configurationEntitySp);
        configurationEntitySp.setSp(oidcSp);

        spIntegration = new Integration(999L, LocalDate.now(), configurationEntitySp, LocalDate.of(2023, 6, 30),
                1, null, spOrganization,
                "serviceProviderContactAddress@example.net");

        integrationRepository.save(spIntegration);

        // Integration sets
        for (int i = 1; i < 10; i++) {
            Organization setOrganization;
            if (i<5) {
                setOrganization = new Organization("Organization set 1234", "123444-1", "1.2.3.4.5.6.7.2");
                organizationRepository.save(setOrganization);
            } else {
                setOrganization = new Organization("Organization set 56789", "567899-1", "1.2.3.4.5.6.7.3");
                organizationRepository.save(setOrganization);
            }

            ConfigurationEntity setCe = new ConfigurationEntity();
            IntegrationSet set = new IntegrationSet();
            set.setConfigurationEntity(setCe);
            setCe.setSet(set);
            set.setName("Integration set " + i);
            Integration integrationSet = new Integration(3000L + i, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                    0, null, organization, "serviceContactAddress" + i + "@example.net");
            integrationSet.setConfigurationEntity(setCe);
            integrationSet.setOrganization(setOrganization);
            integrationRepository.save(integrationSet);
        }
    }

    @Test
    public void testEmptySpecification() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(12, integrationList.size());
    }

    @Test
    public void testIntegrationWithWilmaHostnameAndFlowname() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        builder.withEqualOr(Category.IDP, "flowName", "wilmaFlowname");
        builder.withEqualOr(Category.IDP, "hostname", "wilmaHostname");

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
    }

    @Test
    public void testIntegrationWithFalseOrganizationOid() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        builder.withEqualOr(Category.ORGANIZATION, "oid", "1.2.3.4.5.6.7.10");

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(0, integrationList.size());
    }

    @Test
    public void testIsIdpTypes() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        String filterByType = "azure,wilma";

        builder.withEqualAnd(Category.TYPE, "type", filterByType);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
    }

    @Test
    public void testIsIdpType() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        String filterByType = "azure";

        builder.withEqualAnd(Category.TYPE, "type", filterByType);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(0, integrationList.size());
    }

    @Test
    public void testIntegrationWithRoles() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        String role = "idp,sp";

        builder.withEqualAnd(Category.ROLE, "role", role);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(3, integrationList.size());
    }

    @Test
    public void testIntegrationWithRole() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        String role = "sp";

        builder.withEqualAnd(Category.ROLE, "role", role);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(2, integrationList.size());
    }

    @Test
    public void testIntegrationWithContainingOrganizationName() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        builder.withContainOr(Category.ORGANIZATION, "name", "zyx");

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
    }

    @Test
    public void testIntegrationWithEqualOrganizations() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        List<String> userOrganizationOids = Arrays.asList("1.2.3.4.5.6.7.8", "1.2.3.4.5.6.7.9", "1.2.3.4.5.6.7.2");

        builder.withEqualAnd(Category.ORGANIZATION, "oid", userOrganizationOids);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(6, integrationList.size());
    }

    @Test
    public void testIntegrationWithEqualOrganization() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        List<String> userOrganizationOids = Arrays.asList("1.2.3.4.5.6.7.9");

        builder.withEqualAnd(Category.ORGANIZATION, "oid", userOrganizationOids);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
    }

    @Test
    public void testIntegrationSetWithEqualName() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        String setName = "Integration set 5";

        builder.withEqualAnd(Category.SET, "name", setName);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
    }

}
