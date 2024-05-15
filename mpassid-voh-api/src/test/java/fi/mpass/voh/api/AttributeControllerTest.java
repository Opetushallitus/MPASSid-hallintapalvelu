package fi.mpass.voh.api;

import java.util.List;
import java.util.ArrayList;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.attribute.AttributeRepository;

@SpringBootTest
@AutoConfigureMockMvc
class AttributeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AttributeRepository attributeRepository;

    private List<Attribute> attributes;

    private List<String> attributeNames;

    @BeforeEach
    public void setup() {
        attributes = new ArrayList<Attribute>();

        attributes.add(new Attribute("2.5.4.5", "", "serialNumber", "9876543210", "Serial number"));
        attributes.add(new Attribute("2.5.4.6", "", "countryName", "Finland", "Country name"));
        attributes.add(new Attribute("2.5.4.10", "", "organizationName", "Kansanopisto", "Organization name"));
        attributes.add(new Attribute("2.5.4.12", "", "title", "Otsikko ABC", "Title"));
        attributes.add(new Attribute("2.5.4.49", "", "distinguishedName", "cn=common,ou=organizationunit,dc=example,dc=com", "distinguishedName"));

        attributeNames = new ArrayList<String>();
        for (Attribute attr : attributes) {
            attributeNames.add(attr.getName());
        }
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID_KATSELIJA"})
    @Test
    void testAttributeNameList() throws Exception {
        when(attributeRepository.findDistinctName()).thenReturn(attributeNames);
        mockMvc.perform(get("/api/v2/attribute/names").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(15)))
            .andExpect(jsonPath("$").isArray());
    }

    @WithMockUser(value = "testuser")
    @Test
    void testUnauthorizedAttributeNameList() throws Exception {
        when(attributeRepository.findDistinctName()).thenReturn(attributeNames);
        mockMvc.perform(get("/api/v2/attribute/names").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$").doesNotExist());
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID"})
    @Test
    void testPartiallyUnauthorizedAttributeNameList() throws Exception {
        when(attributeRepository.findDistinctName()).thenReturn(attributeNames);
        mockMvc.perform(get("/api/v2/attribute/names").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$").doesNotExist());
    }

    @WithMockUser(value = "testuser", roles={"APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8", "APP_MPASSID_KATSELIJA"})
    @Test
    void testOrganizationalAuthorizedAttributeNameList() throws Exception {
        when(attributeRepository.findDistinctName()).thenReturn(attributeNames);
        mockMvc.perform(get("/api/v2/attribute/names").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$", hasSize(15)))
            .andExpect(jsonPath("$").isArray());
    }
/*
    @WithMockUser(value = "testuser", roles={"APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.08", "APP_MPASSID_KATSELIJA_1.2.3.4.5.6.7.08"})
    @Test
    public void testInvalidOrganizationOidAttributeNameList() throws Exception {
        when(attributeRepository.findDistinctName()).thenReturn(attributeNames);
        mockMvc.perform(get("/api/v2/attribute/names").contentType(MediaType.APPLICATION_JSON))
            .andDo(print())
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$").doesNotExist());
    }
 */
}