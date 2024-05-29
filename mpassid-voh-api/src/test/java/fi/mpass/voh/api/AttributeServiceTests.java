package fi.mpass.voh.api;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.config.AttributeConfiguration;
import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.attribute.AttributeService;
import fi.mpass.voh.api.integration.attribute.AttributeTestAuthorizationRequestBody;
import fi.mpass.voh.api.integration.attribute.AttributeTestAuthorizationToken;
import fi.mpass.voh.api.integration.attribute.AttributeValidator;
import fi.mpass.voh.api.integration.idp.Azure;

import fi.mpass.voh.api.organization.Organization;

import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.times;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@AutoConfigureMockMvc
class AttributeServiceTests {

    @Mock
    private IntegrationService integrationService;
    @Mock
    private AttributeValidator attributeValidator;
    @Mock
    private AttributeTestAuthorizationToken token;

    private AttributeConfiguration attributeConfiguration;

    private AttributeService underTest;

    private Integration integration;

    private String accessToken;
    private AttributeTestAuthorizationRequestBody request;

    @BeforeEach
    void setUp() {
        underTest = new AttributeService(attributeConfiguration, attributeValidator, integrationService, token);

        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Azure azure = new Azure("entityId");
        configurationEntity.setIdp(azure);

        Attribute attribute = new Attribute("data", "tenantId", "5bc5689d-2cf8-479b-a674-3df6d77c5bc0");
        Set<Attribute> attributes = new HashSet<>();
        attributes.add(attribute);
        configurationEntity.setAttributes(attributes);

        integration = new Integration(1000099L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "contactAddress@example.net");

        accessToken = "1234567890";
        request = new AttributeTestAuthorizationRequestBody(1000099L, "12345", "54321");
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testTestAttributesAuthorization() {
        // given
        given(integrationService.getIntegration(any(Long.class))).willReturn(Optional.of(integration));
        given(attributeValidator.getToken(any(String.class), any(String.class), any(String.class)))
                .willReturn(accessToken);

        // when - action or the behaviour that we are going test
        boolean result = underTest.testAttributesAuthorization(request);

        // then - verify the output
        assertEquals(true, result);
    }
/*
    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testUpdateIntegrationPermissions() {
        // given
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.of(integration));
        given(integrationRepository.saveAndFlush(any(Integration.class))).willReturn(updatedAllowingIntegration);

        // when - action or the behaviour that we are going test
        Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedAllowingIntegration);

        // then - verify the output
        assertEquals(999, resultIntegration.getId());
        assertEquals(9, resultIntegration.getPermissions().size());
    }

    @WithMockUser(value = "tallentaja", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8" })
    @Test
    void testUpdateIntegrationWhenNoExistingIntegration() {
        // given
        given(integrationRepository.findOne(any(Specification.class))).willReturn(Optional.empty());
        given(integrationRepository.saveAndFlush(updatedIntegration)).willReturn(updatedIntegration);

        // when - action or the behaviour that we are going test
        EntityNotFoundException thrown = assertThrows(EntityNotFoundException.class, () -> {
            Integration resultIntegration = underTest.updateIntegration(integration.getId(), updatedIntegration);
        });

        // then - verify the output
        assertTrue(thrown.getMessage().contains("Not found Integration 999"));
    }
*/
}