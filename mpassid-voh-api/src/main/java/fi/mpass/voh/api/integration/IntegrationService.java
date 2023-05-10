package fi.mpass.voh.api.integration;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.persistence.OptimisticLockException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.IntegrationSpecificationCriteria.Category;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class IntegrationService {
  private final static Logger logger = LoggerFactory.getLogger(IntegrationService.class);

  @Value("${application.admin-organization-oid}")
  private String adminOrganizationOid;

  private final IntegrationRepository integrationRepository;

  public IntegrationService(IntegrationRepository integrationRepository) {
    this.integrationRepository = integrationRepository;
  }

  public List<Integration> getIntegrations() {
    return integrationRepository.findAll();
  }

  public Page<Integration> getIntegrationsPageable(Pageable pageable) {
    return integrationRepository.findAll(pageable);
  }

  /**
   * The method extracts organizations oids from the user details
   * 
   * @param auth authentication object
   * @return a list of organization oids based on the user's granted authorities
   */
  private List<String> getUserDetailsOrganizationOids(Authentication auth) {
    List<String> organizationOids = new ArrayList<String>();

    UserDetails userDetails = (UserDetails) auth.getPrincipal();
    for (GrantedAuthority authority : userDetails.getAuthorities()) {
      logger.debug(authority.getAuthority());

      if (authority.getAuthority().length() > 0) {
        String[] authorityElements = authority.getAuthority().split("_");

        if (authorityElements.length == 5) {
          String oidRegex = "[0-2](\\.(0|[1-9][0-9]*))+";
          Pattern p = Pattern.compile(oidRegex);
          Matcher m = p.matcher(authorityElements[4]);
          boolean b = m.matches();
          // accept admin organization oid even if it doesn't match to the given oid
          // regexp
          if (b || authorityElements[4].equals(adminOrganizationOid)) {
            organizationOids.add(authorityElements[4]);
          }
        }
      }
    }
    return organizationOids;
  }

  private boolean includesAdminOrganization(List<String> organizationOids) {
    if (adminOrganizationOid != null && !adminOrganizationOid.isEmpty()) {
      for (String oid : organizationOids) {
        if (oid.contains(adminOrganizationOid)) {
          logger.debug("A request from an admin organization");
          return true;
        }
      }
    }
    return false;
  }

  /**
   * The method creates a specification from the given search criteria, filtering
   * types and roles. The methods queries a repository through the specification
   * and returns paged integrations.
   * 
   * @param search          search string from the user; case-sentitive;
   *                        identifiers are matched with equality, names with
   *                        containing match
   * @param filterByType    type filtering string, can be a comma-separated list
   * @param role            role selection string, can be a comma-separated list
   * @param deploymentPhase deployment phase {@link int}
   * @return a paged list of Integrations
   * @throws EntityNotFoundException
   */
  public Page<Integration> getIntegrationsSpecSearchPageable(String search, String filterByType, String role,
      String deploymentPhase, Pageable pageable) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

    if (search != null && search.length() > 0) {
      builder.withEqualOr(Category.IDP, "flowName", search);
      builder.withEqualOr(Category.IDP, "entityId", search);
      builder.withEqualOr(Category.IDP, "tenantId", search);
      builder.withEqualOr(Category.IDP, "hostname", search);
      builder.withEqualOr(Category.SP, "entityId", search);
      builder.withEqualOr(Category.SP, "clientId", search);
      builder.withEqualOr(Category.ORGANIZATION, "oid", search);
      builder.withEqualOr(Category.ORGANIZATION, "businessId", search);
      builder.withContainOr(Category.SP, "name", search);
      builder.withContainOr(Category.ORGANIZATION, "name", search);
    }

    // filterByType can be a list of types, thus (equality OR equality OR ...) AND
    if (filterByType != null && filterByType.length() > 0)
      builder.withEqualAnd(Category.TYPE, "type", filterByType);

    // role can be a list of roles, thus (equality OR equality OR ...) AND
    if (role != null && role.length() > 0)
      builder.withEqualAnd(Category.ROLE, "role", role);

    if (deploymentPhase != null)
      builder.withEqualAnd(Category.DEPLOYMENT_PHASE, "deploymentPhase", deploymentPhase);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      List<String> userOrganizationOids = getUserDetailsOrganizationOids(auth);
      if (!includesAdminOrganization(userOrganizationOids)) {
        builder.withEqualAnd(Category.ORGANIZATION, "oid", userOrganizationOids);
      }
      Specification<Integration> spec = builder.build();

      return integrationRepository.findAll(spec, pageable);
    } else {
      throw new EntityNotFoundException("Authentication not successful");
    }
  }

  /**
   * The method creates a specification based on the given id and queries a
   * repository through the specification.
   * 
   * @param id the id of the Integration
   * @return Integration
   * @throws EntityNotFoundException
   */
  public Optional<Integration> getSpecIntegrationById(Long id) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

    if (id != null) {
      builder.withEqualAnd(Category.INTEGRATION, "id", id);
    } else {
      return Optional.empty();
    }

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      List<String> userOrganizationOids = getUserDetailsOrganizationOids(auth);
      if (!includesAdminOrganization(userOrganizationOids)) {
        builder.withEqualAnd(Category.ORGANIZATION, "oid", userOrganizationOids);
      }
      Specification<Integration> spec = builder.build();

      Optional<Integration> integration = integrationRepository.findOne(spec);
      if (!integration.isPresent()) {
        throw new EntityNotFoundException("Not found Integration " + id);
      }
      return integration;
    } else {
      throw new EntityNotFoundException("Authentication not successful");
    }
  }

  public Integration updateIntegration(Long id, Integration integration) {
    try {
      integration = integrationRepository.saveAndFlush(integration);
    } catch (OptimisticLockException ole) {
      // TODO throw new
      logger.error(ole.toString());
    }
    return integration;
  }
}