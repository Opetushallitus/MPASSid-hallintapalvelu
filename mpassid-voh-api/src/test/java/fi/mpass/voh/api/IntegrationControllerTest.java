package fi.mpass.voh.api;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.ServiceProvider;
import fi.mpass.voh.api.organization.Organization;

@SpringBootTest
@AutoConfigureMockMvc
public class IntegrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IntegrationService integrationService;

    private Integration integration;

    @BeforeEach
    public void setup() {
        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "123456-7", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Wilma wilma = new Wilma("wilmaHostname");

        // Allowed services
        /*
         * ConfigurationEntity ce = new ConfigurationEntity();
         * OidcServiceProvider serviceProvider = new OidcServiceProvider();
         * serviceProvider.setConfigurationEntity(ce);
         * ce.setSp(serviceProvider);
         * serviceProvider.setClientId("clientId");
         * serviceProvider.addAllowingIdentityProvider(wilma);
         * Set<ServiceProvider> allowedServices = new HashSet<>();
         * allowedServices.add(serviceProvider);
         * 
         * wilma.setAllowedServiceProviders(allowedServices);
         */
        wilma.setFlowName("wilmaFlowname");
        configurationEntity.setIdp(wilma);

        integration = new Integration(99L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID_KATSELIJA"})
    @Test
    public void testLeastAuthorizedGetIntegrationList() throws Exception {
        when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
        mockMvc.perform(get("/api/v1/integration/list").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$").isArray());
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID_TALLENTAJA", "APP_MPASSID_KATSELIJA"})
    @Test
    public void testAuthorizedGetIntegrationList() throws Exception {
        when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
        mockMvc.perform(get("/api/v1/integration/list").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$").isArray());
    }

    @WithMockUser(value = "testuser")
    @Test
    public void testUnauthorizedGetIntegrationList() throws Exception {
        when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
        mockMvc.perform(get("/api/v1/integration/list").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$").doesNotExist());
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID"})
    @Test
    public void testPartiallyUnauthorizedGetIntegrationList() throws Exception {
        when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
        mockMvc.perform(get("/api/v1/integration/list").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$").doesNotExist());
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8", "APP_MPASSID_KATSELIJA"})
    @Test
    public void testOrganizationalAuthorizedGetIntegrationList() throws Exception {
        when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
        mockMvc.perform(get("/api/v1/integration/list").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$").isArray());
    }

    @WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8", "APP_MPASSID_TALLENTAJA" })
    @Test
    public void testAuthorizedUpdateIntegration() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        when(integrationService.updateIntegration(eq(99L), any(Integration.class))).thenReturn(integration);
        mockMvc.perform(put("/api/v1/integration/99").contentType(MediaType.APPLICATION_JSON)
                // https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/csrf.html
                .content(objectMapper.writeValueAsString(integration)).with(csrf()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(99L))
                .andExpect(jsonPath("$.configurationEntity.idp.flowName").value("wilmaFlowname"));
    }
}
