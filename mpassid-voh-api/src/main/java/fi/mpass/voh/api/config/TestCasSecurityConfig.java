package fi.mpass.voh.api.config;

import java.util.Arrays;

import org.apereo.cas.client.session.SingleSignOutFilter;
import org.apereo.cas.client.validation.Cas30ServiceTicketValidator;
import org.apereo.cas.client.validation.TicketValidator;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.PropertySource;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.cas.ServiceProperties;
import org.springframework.security.cas.authentication.CasAuthenticationProvider;
import org.springframework.security.cas.web.CasAuthenticationEntryPoint;
import org.springframework.security.cas.web.CasAuthenticationFilter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.logout.LogoutFilter;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;

import org.apache.commons.lang3.RandomStringUtils;

@Profile("test")
@Configuration
@PropertySource("classpath:cas-test.properties")
public class TestCasSecurityConfig {

    @Value("${cas.server.prefix}")
    private String casServerPrefix;

    @Value("${cas.server.login}")
    private String casServerLogin;

    @Value("${cas.server.logout}")
    private String casServerLogout;

    @Value("${cas.client.login}")
    private String casClientLogin;

    @Value("${cas.client.logout}")
    private String casClientLogout;

    @Value("${cas.client.relative}")
    private String casClientLogoutRelative;

    @Value("${cas.failure.url}")
    private String casFailureUrl;

    @Bean
    public ServiceProperties serviceProperties() {
        ServiceProperties serviceProperties = new ServiceProperties();
        // Consistent with the URL monitored by CasAuthenticationFilter
        serviceProperties.setService(casClientLogin);
        // Whether to turn off single sign on is false by default, so it can not be set.
        serviceProperties.setSendRenew(false);
        return serviceProperties;
    }

    @Bean
    @Primary
    public AuthenticationEntryPoint authenticationEntryPoint(ServiceProperties sp) {
        CasAuthenticationEntryPoint entryPoint = new CasAuthenticationEntryPoint();
        // Login address of CAS Server authentication
        entryPoint.setLoginUrl(casServerLogin);
        entryPoint.setServiceProperties(sp);
        return entryPoint;
    }

    @Bean
    public TicketValidator ticketValidator() {
        return new Cas30ServiceTicketValidator(casServerPrefix);
    }

    @Bean
    public AuthenticationUserDetailsService<CasAssertionAuthenticationToken> authenticationUserDetailsService() {
        return token -> {
            Assertion assertion = token.getAssertion();
            Map<String, Object> attrs = assertion.getPrincipal().getAttributes();

            // Extract roles from CAS attributes
            Collection<?> rawRoles = (Collection<?>) attrs.getOrDefault("roles", List.of());

            List<String> roles = rawRoles.stream()
                    .map(Object::toString)
                    .toList();

            return User.withUsername(token.getName())
                    .password("N/A")
                    .authorities(roles.toArray(new String[0]))
                    .build();
        };
    }

    @Bean("casAuthenticationProvider")
    public CasAuthenticationProvider casAuthenticationProvider(ServiceProperties sp, TicketValidator ticketValidator,
            AuthenticationUserDetailsService<CasAssertionAuthenticationToken> authUserDetailsService) {
        CasAuthenticationProvider provider = new CasAuthenticationProvider();
        String random = RandomStringUtils.randomAlphanumeric(10);
        provider.setServiceProperties(sp);
        provider.setTicketValidator(ticketValidator);
        provider.setAuthenticationUserDetailsService(authUserDetailsService);
        provider.setKey(random);
        return provider;
    }

    @Bean("casFilter")
    public CasAuthenticationFilter casAuthenticationFilter(ServiceProperties sp,
            @Qualifier("casAuthenticationProvider") AuthenticationProvider ap) {
        CasAuthenticationFilter filter = new CasAuthenticationFilter();
        filter.setServiceProperties(sp);
        filter.setAuthenticationManager(new ProviderManager(Arrays.asList(ap)));
        filter.setAuthenticationFailureHandler(new SimpleUrlAuthenticationFailureHandler(casFailureUrl));
        return filter;
    }

    @Bean
    public SingleSignOutFilter singleSignOutFilter() {
        SingleSignOutFilter singleSignOutFilter = new SingleSignOutFilter();
        singleSignOutFilter.setLogoutCallbackPath("/login/cas");
        singleSignOutFilter.setIgnoreInitConfiguration(true);
        return singleSignOutFilter;
    }

    @Bean
    public LogoutFilter logoutFilter() {
        LogoutFilter logoutFilter = new LogoutFilter(casServerLogout, new SecurityContextLogoutHandler());
        // Set the path of the client logout request
        logoutFilter.setFilterProcessesUrl(casClientLogoutRelative);
        return logoutFilter;
    }
}
