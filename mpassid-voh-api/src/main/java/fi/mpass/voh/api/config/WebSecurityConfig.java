package fi.mpass.voh.api.config;

import javax.servlet.Filter;
import javax.servlet.http.HttpServletResponse;

import org.jasig.cas.client.session.SingleSignOutFilter;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.cas.web.CasAuthenticationFilter;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.session.SessionManagementFilter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("!default")
@Configuration
@EnableWebSecurity(debug = true)
public class WebSecurityConfig {
    private final static Logger logger = LoggerFactory.getLogger(WebSecurityConfig.class);

    private AuthenticationEntryPoint entryPoint;
    private CasAuthenticationFilter casAuthenticationFilter;
    private ProvisioningAuthenticationProvider provisioningAuthenticationProvider;
    private SingleSignOutFilter singleSignOutFilter;

    public WebSecurityConfig(AuthenticationEntryPoint entryPoint, CasAuthenticationFilter casAuthenticationFilter,
            ProvisioningAuthenticationProvider provisioningAuthenticationProvider,
            SingleSignOutFilter singleSignOutFilter) {
        this.entryPoint = entryPoint;
        this.casAuthenticationFilter = casAuthenticationFilter;
        this.provisioningAuthenticationProvider = provisioningAuthenticationProvider;
        this.singleSignOutFilter = singleSignOutFilter;
    }

    private Filter expiredSessionFilter() {
        SessionManagementFilter filter = new SessionManagementFilter(new HttpSessionSecurityContextRepository());
        filter.setInvalidSessionStrategy(
                (request, response) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Session expired."));
        return filter;
    }

    @Bean("provisioningAuthManager")
    public AuthenticationManager provisioningAuthManager(HttpSecurity http) throws Exception {
        AuthenticationManagerBuilder authenticationManagerBuilder = http
                .getSharedObject(AuthenticationManagerBuilder.class);
        authenticationManagerBuilder.authenticationProvider(provisioningAuthenticationProvider);
        return authenticationManagerBuilder.build();
    }

    @Bean
    @Order(1)
    public SecurityFilterChain provisioningFilterChain(HttpSecurity http,
            @Qualifier("provisioningAuthManager") AuthenticationManager authManager)
            throws Exception {

        http.requestMatchers().antMatchers("/api/v1/provisioning/**")
                .and()
                .authorizeRequests().anyRequest().authenticated();
        http.httpBasic()
                .and()
                .authenticationManager(authManager);
        http.anonymous().disable();
        http.csrf().disable();

        return http.build();
    }

    @Bean
    @Order(2)
    @DependsOn("casFilter")
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {

        http.requestMatchers().antMatchers("/**")
                .and()
                .authorizeRequests().anyRequest().authenticated();

        http.addFilterBefore(singleSignOutFilter, CasAuthenticationFilter.class);
        http.addFilter(casAuthenticationFilter);
        http.addFilterAfter(expiredSessionFilter(), SessionManagementFilter.class);
        http.exceptionHandling().authenticationEntryPoint(entryPoint);
        http.anonymous().disable();
        http.csrf().disable();
        http.httpBasic().disable();

        return http.build();
    }
}