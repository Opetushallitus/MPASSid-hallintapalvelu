package fi.mpass.voh.api.config;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
public class ProvisioningAuthenticationProvider implements AuthenticationProvider {
    private final static Logger logger = LoggerFactory.getLogger(ProvisioningAuthenticationProvider.class);

    @Value("${application.provisioning-client.name}")
    private String name;

    @Value("${application.provisioning-client.credential}")
    private String credential;

    @Override
    public Authentication authenticate(Authentication auth) throws AuthenticationException {
        final String name = auth.getName();
        final String credential = auth.getCredentials()
            .toString();
        logger.debug("Authenticating name: " + name);

        if (this.name.equals(name) && this.credential.equals(credential)) {
            List<GrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_APP_MPASSID_ADMIN"));
            return new UsernamePasswordAuthenticationToken(name, credential, authorities);
        } else {
            throw new BadCredentialsException("Authentication failed");
        }
    }

    @Override
    public boolean supports(Class<?> auth) {
        return auth.equals(UsernamePasswordAuthenticationToken.class);
    }
}

