package fi.mpass.voh.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.test.context.support.WithMockUser;

import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.IntegrationService;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.any;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@AutoConfigureMockMvc
public class IntegrationServiceTests {

    @Mock private IntegrationRepository integrationRepository;
    private IntegrationService underTest;

    @BeforeEach
    void setUp() {
        underTest = new IntegrationService(integrationRepository);
    }

    @Test
    void testGetIntegrations() {
        // when
        underTest.getIntegrations();

        // then
        verify(integrationRepository).findAll();
    }

    @WithMockUser(value="tallentaja", roles={"APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8"})
    @Test
    void testGetIntegrationsSpecSearchPageable() {
        Pageable pageable = PageRequest.of(0, 20);

        // when
        underTest.getIntegrationsSpecSearchPageable("search", "opinsys,wilma", "idp", "0", pageable);

        // then
        verify(integrationRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @WithMockUser(value="tallentaja", roles={"APP_MPASSID_TALLENTAJA_1.2.3.4.5.6.7.8"})
    @Test
    void testGetSpecIntegrationByNotExistingId() {

        EntityNotFoundException thrown = assertThrows(EntityNotFoundException.class, () -> {
            underTest.getSpecIntegrationById(5L);
        });

        assertTrue(thrown.getMessage().contains("Not found Integration 5"));
    }
}

