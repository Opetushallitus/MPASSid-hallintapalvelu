package fi.mpass.voh.api.loading;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import fi.mpass.voh.api.exception.LoadingException;

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
}
