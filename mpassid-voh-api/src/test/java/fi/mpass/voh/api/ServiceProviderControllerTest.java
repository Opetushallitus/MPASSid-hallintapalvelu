package fi.mpass.voh.api;

import java.util.List;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.integration.sp.ServiceProviderRepository;

@SpringBootTest
@AutoConfigureMockMvc
public class ServiceProviderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ServiceProviderRepository serviceProviderRepository;

    @WithMockUser(value = "testuser")
    @Test
    public void testUnauthorizedGetServiceProviderTypes() throws Exception {
        List<String> types = List.of("oidc");
        when(serviceProviderRepository.findDistinctType()).thenReturn(types);
        mockMvc.perform(get("/api/v1/sp/types").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$").doesNotExist());
    }

    @WithMockUser(value = "testuser", roles = {"APP_MPASSID_KATSELIJA"})
    @Test
    public void testGetServiceProviderTypes() throws Exception {
        List<String> types = List.of("oidc", "saml");
        when(serviceProviderRepository.findDistinctType()).thenReturn(types);
        mockMvc.perform(get("/api/v1/sp/types").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$").isArray());
    }
}
