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

import fi.mpass.voh.api.integration.idp.IdentityProviderRepository;

@SpringBootTest
@AutoConfigureMockMvc
public class IdentityProviderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private IdentityProviderRepository identityProviderRepository;

    @WithMockUser(value = "testuser")
    @Test
    public void testGetIdentityProviderTypes() throws Exception {
        List<String> types = List.of("azure", "opinsys", "wilma");
        when(identityProviderRepository.findDistinctType()).thenReturn(types);
        mockMvc.perform(get("/api/v1/idp/types").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(3)))
            .andExpect(jsonPath("$").isArray());
    }
}
