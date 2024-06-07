package fi.mpass.voh.api.config;

import org.apereo.cas.client.session.SingleSignOutFilter;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.cas.web.CasAuthenticationFilter;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;

@Profile("!default")
@Configuration
@EnableWebSecurity
public class WebSecurityConfig {
    private AuthenticationEntryPoint entryPoint;
    private CasAuthenticationFilter casAuthenticationFilter;
    private ProvisioningAuthenticationProvider provisioningAuthenticationProvider;
    private SingleSignOutFilter singleSignOutFilter;

    public WebSecurityConfig(AuthenticationEntryPoint entryPoint,
            CasAuthenticationFilter casAuthenticationFilter,
            ProvisioningAuthenticationProvider provisioningAuthenticationProvider,
            SingleSignOutFilter singleSignOutFilter) {
        this.entryPoint = entryPoint;
        this.casAuthenticationFilter = casAuthenticationFilter;
        this.provisioningAuthenticationProvider = provisioningAuthenticationProvider;
        this.singleSignOutFilter = singleSignOutFilter;
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
        http.securityMatchers(matchers -> matchers
                .requestMatchers("/api/v2/provisioning/**", "/api/v2/loading/**"))
                .authorizeHttpRequests(authorize -> authorize
                        .anyRequest().authenticated());

        http.httpBasic(Customizer.withDefaults());
        http.authenticationManager(authManager);
        http.anonymous(AbstractHttpConfigurer::disable);
        http.csrf(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    @Order(2)
    @DependsOn("casFilter")
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
       
        HttpSessionRequestCache requestCache = new HttpSessionRequestCache();
        requestCache.setMatchingRequestParameterName(null);
        http.requestCache(cache -> cache.requestCache(requestCache));
 
        http.authorizeHttpRequests(authorize -> authorize.requestMatchers("/login/**")
                .permitAll());

        http.securityMatchers(matchers -> matchers
                .requestMatchers("/**"))
                .authorizeHttpRequests(authorize -> authorize
                        .anyRequest().authenticated());

        http.addFilterBefore(singleSignOutFilter, CasAuthenticationFilter.class);
        http.addFilter(casAuthenticationFilter);
        http.exceptionHandling(c -> c.authenticationEntryPoint(entryPoint));
        http.anonymous(AbstractHttpConfigurer::disable);
        http.csrf(AbstractHttpConfigurer::disable);
        http.httpBasic(AbstractHttpConfigurer::disable);

        return http.build();
    }
}