package fi.mpass.voh.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import fi.mpass.voh.api.provisioning.Provisioning;
import fi.mpass.voh.api.provisioning.ProvisioningService;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import java.time.LocalDateTime;

@SpringBootTest
@AutoConfigureMockMvc
public class ConfigurationProvisioningTests {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private ProvisioningService provisioningService;

        @WithMockUser(value = "testuser", authorities = { "ROLE_APP_MPASSID_ADMIN" })
        @Test
        public void testGetConfigurationStatus() throws Exception {
                mockMvc.perform(get("/api/v2/provisioning/configuration/status"))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @WithMockUser(value = "testuser", authorities = { "ROLE_APP_MPASSID_ADMIN" })
        @Test
        public void testUpdateProvisioningStatus() throws Exception {
                ObjectMapper objectMapper = new ObjectMapper();
                objectMapper.registerModule(new JavaTimeModule());
                objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
                Provisioning provisioning = new Provisioning(0);
                provisioning.setLastTime(LocalDateTime.now());

                when(provisioningService.updateProvisioning(provisioning)).thenReturn(provisioning);
                mockMvc.perform(put("/api/v2/provisioning")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(provisioning)).with(csrf()))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @WithMockUser(value = "testuser")
        @Test
        public void testUnauthorizedUpdateProvisioningStatus() throws Exception {
                mockMvc.perform(put("/api/v2/provisioning"))
                                .andExpect(status().isForbidden());
        }

        @Test
        public void testUnauthenticatedUpdateProvisioningStatus() throws Exception {
                mockMvc.perform(put("/api/v2/provisioning"))
                                .andExpect(status().isForbidden());
        }
}
