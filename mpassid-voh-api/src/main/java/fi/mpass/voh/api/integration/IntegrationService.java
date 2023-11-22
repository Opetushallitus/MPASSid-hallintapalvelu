package fi.mpass.voh.api.integration;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.persistence.OptimisticLockException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.domain.Sort.Order;
import org.springframework.data.history.Revision;
import org.springframework.data.history.Revisions;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.exception.EntityUpdateException;
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
   * types and roles. The method queries a repository through the specification
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
   * The method pages a list of integrations.
   * 
   * @param results  the list of integrations to be paged
   * @param pageable the paging parameters
   * @return
   */
  private Page<Integration> pageIntegrations(List<Integration> results, Pageable pageable) {
    final int toIndex = Math.min((pageable.getPageNumber() + 1) * pageable.getPageSize(), results.size());
    final int fromIndex = Math.max(toIndex - pageable.getPageSize(), 0);
    Page<Integration> integrations = new PageImpl<Integration>(results.subList(fromIndex, toIndex), pageable,
        results.size());

    return integrations;
  }

  /**
   * The method creates a specification from the given search criteria, filtering
   * types and roles. The method uses the reference integration to add
   * information or to extend the specified query to the repository and returns
   * paged integrations.
   * 
   * @param search                 search string from the user; case-sentitive;
   *                               identifiers are matched with equality, names
   *                               with
   *                               containing match
   * @param filterByType           type filtering string, can be a comma-separated
   *                               list
   * @param role                   role selection string, can be a comma-separated
   *                               list
   * @param deploymentPhase        deployment phase {@link int}
   * @param referenceIntegrationId the id of an Integration used to provide more
   *                               information for searching, filtering, or
   *                               sorting
   * @return a paged list of Integrations
   * @throws EntityNotFoundException
   */
  public Page<Integration> getIntegrationsSpecSearchPageable(String search, String filterByType, String role,
      String deploymentPhase, Long referenceIntegrationId, Pageable pageable) {

    List<Integration> integrations = new ArrayList<Integration>();

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

      List<Integration> existingIntegrations = integrationRepository.findAll(spec);

      // try to query the reference integration
      Optional<Integration> referenceIntegration = getSpecIntegrationById(referenceIntegrationId);
      if (referenceIntegration.isPresent()) {
        // permitted integrations
        List<IntegrationPermission> permissions = referenceIntegration.get().getPermissions();
        List<Integration> permittedIntegrations = new ArrayList<Integration>();
        for (IntegrationPermission p : permissions) {
          permittedIntegrations.add(p.getTo());
        }

        if (!permittedIntegrations.isEmpty()) {
          Sort sort = pageable.getSort();
          if (!sort.isEmpty()) {
            // if permissions sort parameter exists, add the referenced
            // integration's permitted integrations to the start or the end
            // of the list based on the sort order
            Order order = sort.getOrderFor("permissions");
            if (order != null) {
              existingIntegrations.removeAll(permittedIntegrations);

              if (order.getDirection().equals(Direction.DESC)) {
                integrations.addAll(existingIntegrations);
                integrations.addAll(permittedIntegrations);
                logger.debug("After removing and adding permitted integrations to the end of the response. Size: "
                    + existingIntegrations.size());
              } else {
                integrations.addAll(permittedIntegrations);
                integrations.addAll(existingIntegrations);
                logger.debug("After removing and adding permitted integrations to the beginning of the response. Size: "
                    + permissions.size());
              }
            }
          }
        }
      }

      if (integrations.isEmpty()) {
        integrations = List.copyOf(existingIntegrations);
      }

      // logger.debug("Distinct integrations size: " + distinctIntegrations.size());
      return pageIntegrations(integrations, pageable);
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

  /**
   * The method queries integration sets by id.
   * Requires authentication yet not organizational authorization.
   * 
   * @param id the id of the Integration
   * @return Integration
   * @throws EntityNotFoundException
   */
  private Optional<Integration> getIntegrationSetById(Long id) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

    if (id != null) {
      builder.withEqualAnd(Category.INTEGRATION, "id", id);
    } else {
      return Optional.empty();
    }

    builder.withEqualAnd(Category.ROLE, "role", "set");

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {

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

    Integration existingIntegration = getSpecIntegrationById(id).get();
    if (existingIntegration != null) {
      try {
        logger.debug("Saving changes for integration #" + existingIntegration.getId());
        if (integration.getServiceContactAddress() != null) {
          existingIntegration.setServiceContactAddress(integration.getServiceContactAddress());
        }
        // updates institution types
        if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getIdp() != null
            && integration.getConfigurationEntity().getIdp().getInstitutionTypes() != null) {
          existingIntegration.getConfigurationEntity().getIdp()
              .setInstitutionTypes(integration.getConfigurationEntity().getIdp().getInstitutionTypes());
        }
        // updates integration permissions
        if (integration.getPermissions() != null) {
          logger.debug(
                "Permitted integrations count : " + integration.getPermissions().size());
          existingIntegration.removePermissions();
          for (IntegrationPermission permission : integration.getPermissions()) {
            // permission to integration set
            Integration integrationSet = getIntegrationSetById(permission.getTo().getId()).get();
            existingIntegration.addPermissionTo(integrationSet);
            logger.debug(
                "Updated #" + existingIntegration.getId() + ": Permitted integration #" + permission.getTo().getId());
          }
        }
        integration = integrationRepository.saveAndFlush(existingIntegration);
      } catch (OptimisticLockException ole) {
        throw new EntityUpdateException(
            "Integration #" + existingIntegration.getId() + " update not successful. Please re-update.");
      }
      return integration;
    }
    return existingIntegration;
  }

  public List<Integration> getIntegrationsSince(LocalDateTime timestamp) {
    Date since = Date.from(timestamp.atZone(ZoneId.systemDefault()).toInstant());
    List<Integration> integrations = integrationRepository.findAllByLastUpdatedOnAfter(since);
    for (Integration integration : integrations) {
      List<Revision<Integer, Integration>> revisions = findRevisionsSince(integration.getId(), timestamp);
      logger.debug(
          "Integration: " + integration.getId() + " Number of revisions: " + revisions.size() + " since " + timestamp);
    }
    return integrations;
  }

  private List<Revision<Integer, Integration>> findRevisionsSince(Long id, LocalDateTime since) {
    Revisions<Integer, Integration> integrationRevisions = integrationRepository.findRevisions(id);
    if (integrationRevisions != null) {
      return integrationRevisions.getContent().stream().filter(
          revision -> revision.getEntity().getLastUpdatedOn().getTime() > Timestamp.valueOf(since).getTime())
          .collect(Collectors.toList());
    }
    return new ArrayList<Revision<Integer, Integration>>();
  }

  private List<Integration> getProvidersBy(String role) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();
    if (role != null && role.length() > 0) {
      builder.withEqualAnd(Category.ROLE, "role", role);
      Specification<Integration> spec = builder.build();
      return integrationRepository.findAll(spec);
    } else {
      throw new EntityNotFoundException("No role specified");
    }
  }

  public List<Integration> getIdentityProviders() {
    return getProvidersBy("idp");
  }

  public List<Integration> getServiceProviders() {
    return getProvidersBy("sp");
  }
}