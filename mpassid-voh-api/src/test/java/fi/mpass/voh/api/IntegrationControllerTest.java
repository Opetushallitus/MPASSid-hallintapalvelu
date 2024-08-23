package fi.mpass.voh.api;

import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.security.access.expression.method.MethodSecurityExpressionOperations;
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
import fi.mpass.voh.api.config.OPHPermissionEvaluator;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.organization.Organization;

@SpringBootTest
@AutoConfigureMockMvc
class IntegrationControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private IntegrationService integrationService;

	@MockBean
	private OPHPermissionEvaluator permissionEvaluator;

	private Integration integration;
	private Integration blankIntegration;
	private List<Integration> integrationSets;

	@BeforeEach
	public void setup() {
		DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
				"Custom Title", true);
		Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
		ConfigurationEntity configurationEntity = new ConfigurationEntity();
		Wilma wilma = new Wilma("wilmaHostname");
		wilma.setFlowName("wilmaFlowname");
		configurationEntity.setIdp(wilma);

		// Integration sets
		integrationSets = new ArrayList<Integration>();
		for (int i = 1; i < 10; i++) {
			ConfigurationEntity ce = new ConfigurationEntity();
			IntegrationSet set = new IntegrationSet();
			set.setConfigurationEntity(ce);
			ce.setSet(set);
			set.setName("Integration set " + i);
			Integration integrationSet = new Integration(1000L + i, LocalDate.now(), ce,
					LocalDate.of(2023, 7, 30),
					0, null, organization, "serviceContactAddress" + i + "@example.net");
			integrationSet.setConfigurationEntity(ce);
			integrationSets.add(integrationSet);
		}

		integration = new Integration(99L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
				0, discoveryInformation, organization,
				"serviceContactAddress@example.net");

		blankIntegration = new Integration(0L, null, configurationEntity, null, 0,
				discoveryInformation, organization, "");

		for (Integration set : integrationSets) {
			integration.addPermissionTo(set);
		}
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_KATSELIJA" })
	@Test
	void testAuthorizedGetIntegration() throws Exception {
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("KATSELIJA"))).thenReturn(true);
		when(integrationService.getSpecIntegrationById(any(Long.class))).thenReturn(Optional.of(integration));
		mockMvc.perform(get("/api/v2/integration/99").contentType(MediaType.APPLICATION_JSON))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON));
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_KATSELIJA" })
	@Test
	void testLeastAuthorizedGetIntegrationList() throws Exception {
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("KATSELIJA"))).thenReturn(true);
		when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
		mockMvc.perform(get("/api/v2/integration/list").contentType(MediaType.APPLICATION_JSON))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$").isArray());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA", "APP_MPASSID_KATSELIJA" })
	@Test
	void testAuthorizedGetIntegrationList() throws Exception {
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("KATSELIJA"))).thenReturn(true);
		when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
		mockMvc.perform(get("/api/v2/integration/list").contentType(MediaType.APPLICATION_JSON))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$").isArray());
	}

	@WithMockUser(value = "testuser")
	@Test
	void testUnauthorizedGetIntegrationList() throws Exception {
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("KATSELIJA"))).thenReturn(false);
		when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
		mockMvc.perform(get("/api/v2/integration/list").contentType(MediaType.APPLICATION_JSON))
				.andDo(print())
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$").doesNotExist());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID" })
	@Test
	void testPartiallyUnauthorizedGetIntegrationList() throws Exception {
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("TALLENTAJA"))).thenReturn(false);
		when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
		mockMvc.perform(get("/api/v2/integration/list").contentType(MediaType.APPLICATION_JSON))
				.andDo(print())
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$").doesNotExist());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8", "APP_MPASSID_KATSELIJA" })
	@Test
	void testOrganizationalAuthorizedGetIntegrationList() throws Exception {
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("KATSELIJA"))).thenReturn(true);
		when(integrationService.getIntegrations()).thenReturn(Collections.singletonList(integration));
		mockMvc.perform(get("/api/v2/integration/list").contentType(MediaType.APPLICATION_JSON))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$").isArray());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8", "APP_MPASSID_KATSELIJA" })
	@Test
	void testOrganizationalAuthorizedSearchIntegrationsPaged() throws Exception {

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("TALLENTAJA"))).thenReturn(true);

		mockMvc.perform(get("/api/v2/integration/search")
				.param("role", "set")
				.param("search", "test")
				.param("type", "oidc")
				.param("deploymentPhase", "1")
				.param("referenceIntegration", "12345")
				.param("status", "0")
				.param("page", "5")
				.param("size", "10")
				.param("sort", "id,desc") // <-- no space after comma!
				.param("sort", "name,asc")) // <-- no space after comma!
				.andExpect(status().isOk());

		ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
		verify(integrationService).getIntegrationsSpecSearchPageable(any(String.class), any(String.class),
				any(String.class), any(String.class), any(Long.class), any(Integer.class),
				pageableCaptor.capture());

		PageRequest pageable = (PageRequest) pageableCaptor.getValue();

		assertEquals(5, pageable.getPageNumber());
		assertEquals(10, pageable.getPageSize());
		Sort sort = pageable.getSort();
		assertEquals("name", sort.getOrderFor("name").getProperty());
		assertEquals(Sort.Direction.ASC, sort.getOrderFor("name").getDirection());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testAuthorizedUpdateIntegration() throws Exception {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), eq(99L),
				eq("TALLENTAJA")))
				.thenReturn(true);
		when(integrationService.updateIntegration(eq(99L), any(Integration.class))).thenReturn(integration);
		mockMvc.perform(put("/api/v2/integration/99").contentType(MediaType.APPLICATION_JSON)
				// https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/csrf.html
				.content(objectMapper.writeValueAsString(integration)).with(csrf()))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.id").value(99L))
				.andExpect(jsonPath("$.configurationEntity.idp.flowName").value("wilmaFlowname"));
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.9",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testUnauthorizedUpdateIntegration() throws Exception {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), eq(99L),
				eq("TALLENTAJA")))
				.thenReturn(false);
		when(integrationService.updateIntegration(eq(99L), any(Integration.class))).thenReturn(integration);
		mockMvc.perform(put("/api/v2/integration/99").contentType(MediaType.APPLICATION_JSON)
				// https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/csrf.html
				.content(objectMapper.writeValueAsString(integration)).with(csrf()))
				.andDo(print())
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$").doesNotExist());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testAuthorizedUpdateIntegrationWithJson() throws Exception {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		String json = "{" +
				"\"id\": 99," +
				"\"permissions\": [" +
				"{" +
				"\"to\": {" +
				"\"id\": 3000046" +
				"}" +
				"}," +
				"{ " +
				"\"to\": {" +
				"\"id\": 3000012" +
				"}" +
				"}," +
				"{ " +
				"\"to\": {" +
				"\"id\": 3000022" +
				"}" +
				"}" +
				"]," +
				"\"serviceContactAddress\": \"zoo@bar\"" +
				"}";

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), eq(99L),
				eq("TALLENTAJA")))
				.thenReturn(true);
		when(integrationService.updateIntegration(eq(99L), any(Integration.class))).thenReturn(integration);
		mockMvc.perform(put("/api/v2/integration/99").contentType(MediaType.APPLICATION_JSON)
				// https://docs.spring.io/spring-security/reference/servlet/test/mockmvc/csrf.html
				.content(json).with(csrf()))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.id").value(99L))
				.andExpect(jsonPath("$.configurationEntity.idp.flowName").value("wilmaFlowname"));
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testUnauthorizedGetBlankIntegration() throws Exception {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("TALLENTAJA")))
				.thenReturn(false);
		when(integrationService.createBlankIntegration(any(String.class), any(String.class), any(String.class),
				any(Long.class))).thenReturn(integration);
		mockMvc.perform(get("/api/v2/integration")
				.param("role", "idp")
				.param("type", "wilma")
				.param("organization", "1.2.3.4.5.6.7.9"))
				.andDo(print())
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$").doesNotExist());
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testAuthorizedGetBlankIntegration() throws Exception {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("TALLENTAJA")))
				.thenReturn(true);
		when(integrationService.createBlankIntegration(any(String.class), any(String.class), any(String.class),
				any())).thenReturn(blankIntegration);
		mockMvc.perform(get("/api/v2/integration")
				.param("role", "idp")
				.param("type", "wilma")
				.param("organization", "1.2.3.4.5.6.7.8"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.id").value(0L));
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testAuthorizedCreateIntegration() throws Exception {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("TALLENTAJA")))
				.thenReturn(true);
		when(integrationService.createIntegration(any(Integration.class))).thenReturn(integration);
		mockMvc.perform(post("/api/v2/integration").contentType(MediaType.APPLICATION_JSON)
				.content(objectMapper.writeValueAsString(integration)).with(csrf()))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.id").value(99L));
	}

	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8",
			"APP_MPASSID_TALLENTAJA" })
	@Test
	void testGetIntegrationDiscoveryInformationLogo() throws Exception {
		Path imageFile = Paths.get("src/test/resources/testimage.jpg");
		InputStreamResource resource = new InputStreamResource(new FileInputStream(imageFile.toString()));
		
		when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class),
				eq("TALLENTAJA")))
				.thenReturn(true);
		when(integrationService.getDiscoveryInformationLogo(any(Long.class))).thenReturn(resource);
		when(integrationService.getDiscoveryInformationLogoContentType(any(InputStream.class))).thenReturn("image/jpeg");

		mockMvc.perform(get("/api/v2/integration/discoveryinformation/logo/1"))
				.andDo(print())
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.IMAGE_JPEG));
	}

	// TODO negative test for invalid search deploymentPhase parameter, e.g. "0,2"
}