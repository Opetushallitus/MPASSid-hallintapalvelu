package fi.mpass.voh.api.config;

import java.util.Optional;

import org.springframework.security.access.expression.method.MethodSecurityExpressionOperations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component("authorize")
public class OPHPermissionEvaluator {
    private static final Logger logger = LoggerFactory.getLogger(OPHPermissionEvaluator.class);

    private final IntegrationRepository integrationRepository;
    private final IntegrationServiceConfiguration integrationServiceConfiguration;

    public OPHPermissionEvaluator(IntegrationRepository integrationRepository, IntegrationServiceConfiguration integrationServiceConfiguration) {
        this.integrationRepository = integrationRepository;
        this.integrationServiceConfiguration = integrationServiceConfiguration;
    }

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
        logger.debug("number of granted authorities: {}", auth.getAuthorities().size());
        for (GrantedAuthority grantedAuth : auth.getAuthorities()) {
            logger.info("granted authority: {}", grantedAuth.getAuthority());

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
     * @param id                 the id of the target integration to which
     *                           authorization is requested
     * @param requiredPermission the required privilege
     * @return boolean true when the authentication object includes the required
     *         permission in valid format and the target integration organization
     *         oid matches the granted permission organization oid, otherwise false
     */
    private boolean hasPrivilege(Authentication auth, Long id, String requiredPermission) {

        Optional<Integration> existingIntegration = this.integrationRepository.findById(id);

        if (existingIntegration.isPresent()) {
            logger.debug("target integration #{}", existingIntegration.get().getId());
            logger.debug("number of granted authorities: {}", auth.getAuthorities().size());
            for (GrantedAuthority grantedAuth : auth.getAuthorities()) {
                logger.info("granted authority: {}", grantedAuth.getAuthority());

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
                                if (authorityElements[3].contains(requiredPermission)) {
                                    if (authorityElements.length > 4) {
                                        // (3, 5) the granted authority must include the integration organization oid
                                        if (authorityElements[4]
                                                .equals(existingIntegration.get().getOrganization().getOid())
                                                || authorityElements[4].equals(this.integrationServiceConfiguration.getAdminOrganizationOid())) {
                                            return true;
                                        }
                                    }
                                }

                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    public boolean hasPermission(MethodSecurityExpressionOperations operations, Object targetDomainObject,
            Object permission) {
        if ((operations.getAuthentication() == null) || (targetDomainObject == null)
                || !(permission instanceof String)) {
            return false;
        }

        if (targetDomainObject instanceof Long) {
            return hasPrivilege(operations.getAuthentication(), (Long) targetDomainObject,
                    permission.toString().toUpperCase());
        }
        if (targetDomainObject instanceof String) {
            String targetType = targetDomainObject.getClass().getSimpleName().toUpperCase();
            return hasPrivilege(operations.getAuthentication(), targetType, permission.toString().toUpperCase());
        }
        return false;
    }
}