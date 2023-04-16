package fi.mpass.voh.api.integration;

import java.io.Serializable;

import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OPHPermissionEvaluator implements PermissionEvaluator {
    private final static Logger logger = LoggerFactory.getLogger(OPHPermissionEvaluator.class);

    /**
     * The method asserts that the authentication object includes the required
     * authority. The method trusts the authorization-service to return
     * valid authority information.
     * 
     * A set of example authority roles returned by the authorization-service:
     * 1 ROLE_APP_MPASSID
     * 2 ROLE_APP_MPASSID_TALLENTAJA
     * 3 ROLE_APP_MPASSID_TALLENTAJA_1.2.246.562.10.90008375488
     * 4 ROLE_APP_MPASSID_KATSELIJA
     * 5 ROLE_APP_MPASSID_KATSELIJA_1.2.246.562.10.90008375488
     * 
     * @param auth               authentication object
     * @param targetType         not used yet
     * @param requiredPermission the required privilege
     * @return boolean true when the authentication object includes the required
     *         permission in valid format, otherwise false
     */
    private boolean hasPrivilege(Authentication auth, String targetType, String requiredPermission) {
        logger.debug("number of granted authorities: " + auth.getAuthorities().size());
        for (GrantedAuthority grantedAuth : auth.getAuthorities()) {
            logger.info("granted authority: " + grantedAuth.getAuthority());

            if (grantedAuth.getAuthority().length() > 0) {
                String[] authorityElements = (grantedAuth.getAuthority()).split("_");

                // (1) The granted authority must include a permission element when there is a
                // required permission
                if (requiredPermission.length() > 0 && authorityElements.length < 4) {
                    continue;
                }
                if (authorityElements.length > 2) {
                    // (1, 2, 3, 4, 5) The granted authority must include the target application
                    // identifier in the 3rd element
                    if (authorityElements[2].contains("MPASSID")) {
                        if (requiredPermission.length() == 0)
                            return true;
                        if (authorityElements.length > 3) {
                            // (2, 3, 4, 5) The granted authority must include the required permission
                            if (authorityElements[3].contains(requiredPermission))
                                return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    @Override
    public boolean hasPermission(Authentication auth, Object targetDomainObject, Object permission) {
        if ((auth == null) || (targetDomainObject == null) || !(permission instanceof String)) {
            return false;
        }
        String targetType = targetDomainObject.getClass().getSimpleName().toUpperCase();

        return hasPrivilege(auth, targetType, permission.toString().toUpperCase());
    }

    @Override
    public boolean hasPermission(Authentication auth, Serializable targetId, String targetType,
            Object permission) {
        if ((auth == null) || (targetType == null) || !(permission instanceof String)) {
            return false;
        }
        return hasPrivilege(auth, targetType.toUpperCase(), permission.toString().toUpperCase());
    }
}