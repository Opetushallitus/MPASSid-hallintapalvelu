package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

    @BeforeEach
    public void setup() {

        Organization organization = new Organization("Organization zyx", "123456-7", "1.2.3.4.5.6.7.8");
        organizationRepository.save(organization);

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Wilma wilma = new Wilma("wilmaHostname");

        // Allowed services, ConfigurationEntity (OIDC Service Provider) wo/ Integration
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider serviceProvider = new OidcServiceProvider();
        serviceProvider.setConfigurationEntity(ce);
        ce.setSp(serviceProvider);
        serviceProvider.setClientId("clientId");
        serviceProvider.addAllowingIdentityProvider(wilma);
        Set<ServiceProvider> allowedServices = new HashSet<>();
        allowedServices.add(serviceProvider);

        wilma.setAllowedServiceProviders(allowedServices);
        wilma.setFlowName("wilmaFlowname");
        configurationEntity.setIdp(wilma);

        integration = new Integration(99L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        integrationRepository.save(integration);

        // TODO SP
    }

    @Test
    public void testEmptySpecification() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
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

        builder.withEqualOr(Category.ORGANIZATION, "oid", "1.2.3.4.5.6.7.9");

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

        assertEquals(1, integrationList.size());
    }

    @Test
    public void testIntegrationWithRole() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        String role = "sp";

        builder.withEqualAnd(Category.ROLE, "role", role);

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(0, integrationList.size());
    }

    @Test
    public void testIntegrationWithContainingOrganizationName() {
        IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

        builder.withContainOr(Category.ORGANIZATION, "name", "zyx");

        Specification<Integration> spec = builder.build();

        List<Integration> integrationList = integrationRepository.findAll(spec);

        assertEquals(1, integrationList.size());
    }

}
