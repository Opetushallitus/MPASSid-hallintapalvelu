package fi.mpass.voh.api.config;

import org.apereo.cas.client.session.SingleSignOutFilter;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;

@Profile("!default")
@Configuration
@EnableWebSecurity
public class WebSecurityConfig {
    private AuthenticationEntryPoint entryPoint;
    private CasAuthenticationFilter casAuthenticationFilter;
    private ProvisioningAuthenticationProvider provisioningAuthenticationProvider;
    private SingleSignOutFilter singleSignOutFilter;

    @Value("${server.servlet.context-path:/}") // Default to "/" if not set
    private String contextPath;

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
        //http.csrf(AbstractHttpConfigurer::disable);
        http.httpBasic(AbstractHttpConfigurer::disable);

        // Customize the cookie properties
        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfTokenRepository.setCookieCustomizer(cookie -> cookie
            .secure(true)          // Set cookie as Secure (only over HTTPS)
            .httpOnly(false)        // Mark the cookie as not HttpOnly (can be accessed by JavaScript)
            .sameSite("Strict")    // Set SameSite to Strict or Lax depending on your needs
            .path(contextPath)
            
        );
        
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
                .ignoringRequestMatchers("/api/v2/provisioning/**", "/api/v2/loading/**") // Disable CSRF for these endpoints? In MPASS these are differen't filter chain
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.ALWAYS) // Ensure session for CSRF token
            )
            .authorizeHttpRequests(auth -> auth   // Use MPASS authorize configuration
                .anyRequest().permitAll()
            );
            

        return http.build();
    }
}
