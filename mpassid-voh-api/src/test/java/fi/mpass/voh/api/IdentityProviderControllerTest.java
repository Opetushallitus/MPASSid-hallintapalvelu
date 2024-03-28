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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.security.access.expression.method.MethodSecurityExpressionOperations;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.config.OPHPermissionEvaluator;
import fi.mpass.voh.api.integration.idp.IdentityProviderRepository;

@SpringBootTest
@AutoConfigureMockMvc
class IdentityProviderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OPHPermissionEvaluator permissionEvaluator;

    @MockBean
    private IdentityProviderRepository identityProviderRepository;

    @WithMockUser(value = "testuser")
    @Test
    void testGetIdentityProviderTypes() throws Exception {
        List<String> types = List.of("azure", "opinsys", "wilma");
        when(permissionEvaluator.hasPermission(any(MethodSecurityExpressionOperations.class), any(Object.class), eq("KATSELIJA"))).thenReturn(true);
        when(identityProviderRepository.findDistinctType()).thenReturn(types);
        mockMvc.perform(get("/api/v2/idp/types").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(3)))
            .andExpect(jsonPath("$").isArray());
    }
}
