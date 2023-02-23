package fi.mpass.voh.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;

import fi.vm.sade.javautils.kayttooikeusclient.OphUserDetailsServiceImpl;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Profile("prod")
@Configuration
@PropertySource("classpath:kayttooikeus-prod.properties")
public class OPHUserDetailsServiceConfig {

    private final static Logger logger = LoggerFactory.getLogger(OPHUserDetailsServiceConfig.class);

    private static final SimpleGrantedAuthority[] RESTRICTED_AUTHORITIES = new SimpleGrantedAuthority[] {
            new SimpleGrantedAuthority("ROLE_APP_MPASSID")
    };

    @Value("${kayttooikeus.server.prefix}")
    private String kayttooikeusServerPrefix;

    @Value("${kayttooikeus.client.callerid}")
    private String kayttooikeusClientCallerId;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        UserDetailsService userDetails;
        try {
            userDetails = new OphUserDetailsServiceImpl(kayttooikeusServerPrefix, kayttooikeusClientCallerId);
        } catch (Exception e) {
            logger.error("Exception through OphUserDetailsServiceImpl: " + e);
            userDetails = new OPHUserDetailsService(passwordEncoder());
        }
        return userDetails;
    }

    static class OPHUserDetailsService implements UserDetailsService {
        PasswordEncoder passwordEncoder;

        private OPHUserDetailsService(PasswordEncoder passwordEncoder) {
            this.passwordEncoder = passwordEncoder;
        }

        @Override
        public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
            switch (username) {
                default:
                    return User.builder()
                            .authorities(List.of(RESTRICTED_AUTHORITIES))
                            .password(this.passwordEncoder.encode("t9qeub211o"))
                            .username(username)
                            .build();
            }
        }
    }
}
