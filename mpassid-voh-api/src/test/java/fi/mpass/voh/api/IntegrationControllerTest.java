package fi.mpass.voh.api;

import java.time.LocalDate;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
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
        DiscoveryInformation spDiscoveryInformation = new DiscoveryInformation("SP Custom Display Name",
                "SP Custom Title", true);
        Organization spOrganization = new Organization("SP Organization 321", "654321-7", "1.2.3.4.5.6.7.1");
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider serviceProvider = new OidcServiceProvider();
        serviceProvider.setConfigurationEntity(ce);
        ce.setSp(serviceProvider);
        serviceProvider.setClientId("clientId");
        Integration spIntegration = new Integration(66L, LocalDate.now(), ce, LocalDate.of(2023, 6, 30),
                0, spDiscoveryInformation, spOrganization,
                "spContactAddress@example.net");

        wilma.setFlowName("wilmaFlowname");
        configurationEntity.setIdp(wilma);

        integration = new Integration(99L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization,
                "serviceContactAddress@example.net");

        integration.addAllowed(spIntegration);
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

    @WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8", "APP_MPASSID_KATSELIJA" })
    @Test
    public void testOrganizationalAuthorizedSearchIntegrationsPaged() throws Exception {
        mockMvc.perform(get("/api/v1/integration/search")
                .param("role", "idp")
                .param("search", "test")
                .param("type", "oidc")
                .param("deploymentPhase", "1")
                .param("referenceIntegration", "12345")
                .param("page", "5")
                .param("size", "10")
                .param("sort", "id,desc") // <-- no space after comma!
                .param("sort", "name,asc")) // <-- no space after comma!
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(integrationService).getIntegrationsSpecSearchPageable(any(String.class), any(String.class),
                any(String.class), any(String.class), any(Long.class), pageableCaptor.capture());
        PageRequest pageable = (PageRequest) pageableCaptor.getValue();

        assertEquals(5, pageable.getPageNumber());
        assertEquals(10, pageable.getPageSize());
        Sort sort = pageable.getSort();
        assertEquals("name", sort.getOrderFor("name").getProperty());
        assertEquals(Sort.Direction.ASC, sort.getOrderFor("name").getDirection());
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
