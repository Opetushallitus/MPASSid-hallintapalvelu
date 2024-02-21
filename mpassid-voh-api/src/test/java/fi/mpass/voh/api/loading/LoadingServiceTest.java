package fi.mpass.voh.api.loading;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

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

    }

    @Test
    void testStart() {

    }
}
