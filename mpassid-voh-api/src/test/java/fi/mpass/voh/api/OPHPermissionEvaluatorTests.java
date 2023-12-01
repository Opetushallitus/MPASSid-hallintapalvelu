package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import static org.mockito.BDDMockito.given;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.OPHPermissionEvaluator;
import fi.mpass.voh.api.organization.Organization;

@SpringBootTest
@AutoConfigureMockMvc
public class OPHPermissionEvaluatorTests {

    @Mock
    private IntegrationRepository integrationRepository;

    private Integration integration1;
    private Integration integration2;

    private static final SimpleGrantedAuthority[] AUTHORITIES = new SimpleGrantedAuthority[] {
            new SimpleGrantedAuthority("ROLE_APP_krcpt"),
            new SimpleGrantedAuthority("ROLE_APP_krcpt_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_krcpt_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_ohkmv"),
            new SimpleGrantedAuthority("ROLE_APP_ohkmv_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_ohkmv_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_nfaab"),
            new SimpleGrantedAuthority("ROLE_APP_nfaab_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_nfaab_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_iojrw"),
            new SimpleGrantedAuthority("ROLE_APP_iojrw_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_iojrw_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_dktjp"),
            new SimpleGrantedAuthority("ROLE_APP_dktjp_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_dktjp_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_jvmpz"),
            new SimpleGrantedAuthority("ROLE_APP_MPASSID"),
            new SimpleGrantedAuthority("ROLE_APP_MPASSID_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_MPASSID_KATSELIJA"),
            new SimpleGrantedAuthority("ROLE_APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_jvmpz_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_jvmpz_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_vzofk"),
            new SimpleGrantedAuthority("ROLE_APP_vzofk_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_vzofk_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_xtnxv"),
            new SimpleGrantedAuthority("ROLE_APP_xtnxv_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_xtnxv_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Azfjdp"),
            new SimpleGrantedAuthority("ROLE_APP_Azfjdp_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Azfjdp_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Avtqtn"),
            new SimpleGrantedAuthority("ROLE_APP_Avtqtn_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Avtqtn_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Amqmde"),
            new SimpleGrantedAuthority("ROLE_APP_Amqmde_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Amqmde_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Aunuxc"),
            new SimpleGrantedAuthority("ROLE_APP_Aunuxc_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Aunuxc_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_lrdxy"),
            new SimpleGrantedAuthority("ROLE_APP_lrdxy_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_lrdxy_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_dzoui"),
            new SimpleGrantedAuthority("ROLE_APP_dzoui_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_dzoui_TALLENTAJA_1.2.246.562.10.00000000002"),
            new SimpleGrantedAuthority("ROLE_APP_aszvi"),
            new SimpleGrantedAuthority("ROLE_APP_aszvi_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_aszvi_TALLENTAJA_1.2.246.562.10.00000000003"),
            new SimpleGrantedAuthority("ROLE_APP_hlhwl"),
            new SimpleGrantedAuthority("ROLE_APP_hlhwl_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_hlhwl_TALLENTAJA_1.2.246.562.10.00000000004"),
            new SimpleGrantedAuthority("ROLE_APP_rsilg"),
            new SimpleGrantedAuthority("ROLE_APP_rsilg_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_rsilg_TALLENTAJA_1.2.246.562.10.00000000005"),
            new SimpleGrantedAuthority("ROLE_APP_amxrt"),
            new SimpleGrantedAuthority("ROLE_APP_amxrt_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_amxrt_TALLENTAJA_1.2.246.562.10.00000000006"),
            new SimpleGrantedAuthority("ROLE_APP_Aifrcm"),
            new SimpleGrantedAuthority("ROLE_APP_Aifrcm_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Aifrcm_TALLENTAJA_1.2.246.562.10.00000000007"),
            new SimpleGrantedAuthority("ROLE_APP_Azdnud"),
            new SimpleGrantedAuthority("ROLE_APP_Azdnud_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Azdnud_TALLENTAJA_1.2.246.562.10.00000000008"),
            new SimpleGrantedAuthority("ROLE_APP_Amoryf"),
            new SimpleGrantedAuthority("ROLE_APP_Amoryf_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Amoryf_TALLENTAJA_1.2.246.562.10.00000000008")
    };

    private static final SimpleGrantedAuthority[] RESTRICTED_AUTHORITIES = new SimpleGrantedAuthority[] {
            new SimpleGrantedAuthority("ROLE_APP_MPASSID")
    };

    private static final SimpleGrantedAuthority[] COMMON_AUTHORITIES = new SimpleGrantedAuthority[] {
            new SimpleGrantedAuthority("ROLE_APP_MPASSID"),
            new SimpleGrantedAuthority("ROLE_APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000005"),
            new SimpleGrantedAuthority("ROLE_APP_MPASSID_KATSELIJA_1.2.246.562.10.00000000006")
    };

    private static final SimpleGrantedAuthority[] NON_AUTHORITIES = new SimpleGrantedAuthority[] {
            new SimpleGrantedAuthority("ROLE_APP_Aeftsj"),
            new SimpleGrantedAuthority("ROLE_APP_Aeftsj_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Aeftsj_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Almcgm"),
            new SimpleGrantedAuthority("ROLE_APP_Almcgm_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Almcgm_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Ahjysy"),
            new SimpleGrantedAuthority("ROLE_APP_AhAjysy_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Ahjysy_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Apmfcc"),
            new SimpleGrantedAuthority("ROLE_APP_Apmfcc_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Apmfcc_TALLENTAJA_1.2.246.562.10.00000000001"),
            new SimpleGrantedAuthority("ROLE_APP_Aejczj"),
            new SimpleGrantedAuthority("ROLE_APP_Aejczj_TALLENTAJA"),
            new SimpleGrantedAuthority("ROLE_APP_Aejczj_TALLENTAJA_1.2.246.562.10.00000000001")
    };

    @BeforeEach
    void setUp() {
        Organization organization1 = new Organization("Organization 123", "123456-8", "1.2.246.562.10.00000000005");
        integration1 = new Integration(99L, LocalDate.now(), new ConfigurationEntity(), LocalDate.of(2023, 7, 30),
                0, new DiscoveryInformation(), organization1, "serviceContactAddress@example.net");

        Organization organization2 = new Organization("Organization 321", "123456-7", "1.2.246.562.10.00000000006");
        integration2 = new Integration(9L, LocalDate.now(), new ConfigurationEntity(), LocalDate.of(2023, 7, 30),
                0, new DiscoveryInformation(), organization2, "serviceContactAddress@example.net");
    }

    @Test
    void testSpecificIntegrationTallentajaAuthorized() {
        // given
        OPHPermissionEvaluator permissionEvaluator = new OPHPermissionEvaluator(integrationRepository);
        given(integrationRepository.findById(any(Long.class))).willReturn(Optional.of(integration1));

        // when
        
        TestingAuthenticationToken token = new TestingAuthenticationToken("user", "pwd", Arrays.asList(COMMON_AUTHORITIES));

        // then
        assertTrue(permissionEvaluator.hasPermission(token, 99L, "TALLENTAJA"));
    }

    @Test
    void testSpecificIntegrationTallentajaUnauthorized() {
        // given
        OPHPermissionEvaluator permissionEvaluator = new OPHPermissionEvaluator(integrationRepository);
        given(integrationRepository.findById(any(Long.class))).willReturn(Optional.of(integration2));

        // when
        
        TestingAuthenticationToken token = new TestingAuthenticationToken("user", "pwd", Arrays.asList(COMMON_AUTHORITIES));

        // then
        assertFalse(permissionEvaluator.hasPermission(token, 9L, "TALLENTAJA"));
    }
    
    @Test
    void testAuthorized() {
        // given
        OPHPermissionEvaluator permissionEvaluator = new OPHPermissionEvaluator(integrationRepository);

        // when
        TestingAuthenticationToken token = new TestingAuthenticationToken("user", "pwd", Arrays.asList(AUTHORITIES));

        // then
        assertTrue(permissionEvaluator.hasPermission(token, "", "TALLENTAJA"));
    }

    @Test
    void testUnauthorized() {
        // given
        OPHPermissionEvaluator permissionEvaluator = new OPHPermissionEvaluator(integrationRepository);

        // when
        TestingAuthenticationToken token = new TestingAuthenticationToken("user", "pwd",
                Arrays.asList(NON_AUTHORITIES));

        // then
        assertFalse(permissionEvaluator.hasPermission(token, "", "TALLENTAJA"));
    }

    @Test
    void testUnauthorizedWhenAuthorityWithoutPermission() {
        // given
        OPHPermissionEvaluator permissionEvaluator = new OPHPermissionEvaluator(integrationRepository);

        // when
        TestingAuthenticationToken token = new TestingAuthenticationToken("user", "pwd",
                Arrays.asList(RESTRICTED_AUTHORITIES));

        // then
        assertFalse(permissionEvaluator.hasPermission(token, "", "TALLENTAJA"));
    }

    @Test
    void testAuthorizedWhenEmptyRequiredPermissionWithRestrictedAuthorities() {
        // given
        OPHPermissionEvaluator permissionEvaluator = new OPHPermissionEvaluator(integrationRepository);

        // when
        TestingAuthenticationToken token = new TestingAuthenticationToken("user", "pwd",
                Arrays.asList(RESTRICTED_AUTHORITIES));

        // then
        assertTrue(permissionEvaluator.hasPermission(token, "", ""));
    }
}
