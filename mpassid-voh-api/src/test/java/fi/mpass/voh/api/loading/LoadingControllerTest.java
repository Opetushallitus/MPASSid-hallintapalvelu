package fi.mpass.voh.api.loading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import fi.mpass.voh.api.integration.OPHPermissionEvaluator;

@SpringBootTest
@AutoConfigureMockMvc
class LoadingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LoadingService loadingService;

    @MockBean
    private OPHPermissionEvaluator permissionEvaluator;

    @BeforeEach
    public void setup() {
    }

    @WithMockUser(value = "testuser", roles = { "APP_MPASSID_ADMIN" })
    @Test
    void testAuthorizedLoadingStart() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Loading preLoading = new Loading();
        preLoading.setStatus(LoadingStatus.STARTED);
        preLoading.setType(LoadingType.ALL);
        Loading postLoading = new Loading();
        postLoading.setStatus(LoadingStatus.SUCCEEDED);
        postLoading.setType(LoadingType.ALL);

        when(permissionEvaluator.hasPermission(any(Authentication.class), any(Object.class), eq("ADMIN")))
                .thenReturn(true);
        when(loadingService.start(preLoading)).thenReturn(postLoading);
        mockMvc.perform(post("/api/v2/loading/start").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(preLoading)).with(csrf()))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @WithMockUser(value = "testuser")
    @Test
    void testUnauthorizedLoadingStart() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Loading preLoading = new Loading();
        preLoading.setStatus(LoadingStatus.STARTED);
        Loading postLoading = new Loading();
        postLoading.setStatus(LoadingStatus.FAILED);

        when(permissionEvaluator.hasPermission(any(Authentication.class), any(Object.class), eq("ADMIN")))
                .thenReturn(false);
        when(loadingService.start(preLoading)).thenReturn(postLoading);
        mockMvc.perform(post("/api/v2/loading/start").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(preLoading)).with(csrf()))
                .andDo(print())
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v2/loading/start").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(preLoading)).with(csrf()))
                .andDo(print())
                .andExpect(status().is(405));
    }

    @WithMockUser(value = "testuser", roles = { "APP_MPASSID_ADMIN" })
    @Test
    void testAuthorizedLoadingStatus() throws Exception {
        Loading postLoading = new Loading();
        postLoading.setStatus(LoadingStatus.SUCCEEDED);
        postLoading.setType(LoadingType.ALL);

        when(permissionEvaluator.hasPermission(any(Authentication.class), any(Object.class), eq("ADMIN")))
                .thenReturn(true);
        when(loadingService.getLoadingStatus()).thenReturn(postLoading);
        mockMvc.perform(get("/api/v2/loading/status").contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @WithMockUser(value = "testuser")
    @Test
    void testUnauthorizedLoadingStatus() throws Exception {
        Loading postLoading = new Loading();
        postLoading.setStatus(LoadingStatus.SUCCEEDED);
        postLoading.setType(LoadingType.ALL);

        when(permissionEvaluator.hasPermission(any(Authentication.class), any(Object.class), eq("ADMIN")))
                .thenReturn(false);
        when(loadingService.getLoadingStatus()).thenReturn(postLoading);
        mockMvc.perform(get("/api/v2/loading/status").contentType(MediaType.APPLICATION_JSON))
                .andDo(print())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$").doesNotExist());
    }
}