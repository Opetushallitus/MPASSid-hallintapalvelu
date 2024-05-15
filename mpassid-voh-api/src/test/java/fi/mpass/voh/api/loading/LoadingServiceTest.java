package fi.mpass.voh.api.loading;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import fi.mpass.voh.api.exception.LoadingException;
import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.organization.Organization;

@SpringBootTest
@AutoConfigureMockMvc
class LoadingServiceTest {

    @Mock
    private LoadingRepository loadingRepository;

    @Mock
    private IdentityProviderLoader idpLoader;

    @Mock
    private SetLoader setLoader;

    @Mock
    private ServiceProviderLoader spLoader;

    private LoadingService underTest;
    private Loading loading;
    private Integration integration;

    @BeforeEach
    void setUp() {
        underTest = new LoadingService(loadingRepository, idpLoader, setLoader, spLoader);

        loading = new Loading();
    }

    @Test
    void testGetLoadingStatus() {
        // given
        given(loadingRepository.findFirstByOrderByTimeDesc()).willReturn(loading);

        // when
        Loading loadingResult = underTest.getLoadingStatus();

        // then
        assertEquals(loading, loadingResult);
    }

    @Test
    void testStartWithIdpLoadingSucceeded() {
        Loading postLoading = new Loading();
        postLoading.setStatus(LoadingStatus.SUCCEEDED);
        postLoading.setType(LoadingType.IDP);
        // given
        loading.setStatus(LoadingStatus.STARTED);
        loading.setType(LoadingType.IDP);
        given(idpLoader.init(any(Loading.class))).willReturn(postLoading);

        // when
        Loading loadingResult = underTest.start(loading);

        // then
        assertEquals(postLoading, loadingResult);
    }

    @Test
    void testStartWithIdpLoadingFailed() {
        Loading postLoading = new Loading();
        postLoading.setStatus(LoadingStatus.FAILED);
        postLoading.setType(LoadingType.IDP);
        Map<Long, String> error = new HashMap<>();
        error.put(Long.valueOf(1), "Update failed");
        postLoading.setErrors(error);

        // given
        loading.setStatus(LoadingStatus.STARTED);
        loading.setType(LoadingType.IDP);
        given(idpLoader.init(any(Loading.class))).willReturn(postLoading);

        // when
        Exception exception = assertThrows(LoadingException.class, () -> {
            underTest.start(loading);
        });

        // then
        assertEquals("Integration #1: Update failed;", exception.getMessage());
    }

    @Test
    void testLoadOneIdentityProvider() {
        // given
        DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
                "Custom Title", true);
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        Opinsys opinsys = new Opinsys("tenantId");
        configurationEntity.setIdp(opinsys);

        integration = new Integration(999L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
                0, discoveryInformation, organization, "contactAddress@example.net");

        given(idpLoader.updateExistingIntegration(any(Loading.class), any(Integration.class))).willReturn(integration);
        given(idpLoader.updateIntegrationTypeSpecificInformation(any(Loading.class), any(Integration.class))).willReturn(integration);

        // when
        Integration updatedIntegration = underTest.loadOne(integration);

        // then
        assertEquals(999L, updatedIntegration.getId());
    }

    @Test
    void testLoadOneServiceProvider() {
        // given
        ConfigurationEntity ce = new ConfigurationEntity();
        OidcServiceProvider sp = new OidcServiceProvider();
        sp.setConfigurationEntity(ce);
        ce.setSp(sp);
        sp.setName("RP1");
        sp.setClientId("clientId-1");
        Organization organization = new Organization("Organization zyx", "1.2.3.4.5.6.7.8");
        Integration integration = new Integration(111L, LocalDate.now(), ce, LocalDate.of(2023, 7, 30),
                0, null, organization, "serviceContactAddress1@example.net");

        given(spLoader.updateExistingIntegration(any(Loading.class), any(Integration.class))).willReturn(integration);

        // when
        Integration updatedIntegration = underTest.loadOne(integration);

        // then
        assertEquals(111L, updatedIntegration.getId());
    }
}
