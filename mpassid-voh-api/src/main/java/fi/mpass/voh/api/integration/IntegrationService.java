package fi.mpass.voh.api.integration;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import jakarta.persistence.OptimisticLockException;

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
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.loading.LoadingService;
import fi.mpass.voh.api.organization.OrganizationService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class IntegrationService {
  private static final Logger logger = LoggerFactory.getLogger(IntegrationService.class);

  @Value("${application.admin-organization-oid}")
  private String adminOrganizationOid;

  @Value("${application.defaultTestServiceIntegrationId}")
  private Long defaultTestServiceIntegrationId;

  private final IntegrationRepository integrationRepository;
  private final OrganizationService organizationService;
  private final LoadingService loadingService;

  public IntegrationService(IntegrationRepository integrationRepository, OrganizationService organizationService,
      LoadingService loadingService) {
    this.integrationRepository = integrationRepository;
    this.organizationService = organizationService;
    this.loadingService = loadingService;
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
          String oidRegex = "[0-2](\\.([0-9]*))+";
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

  private IntegrationSpecificationsBuilder configureSearch(IntegrationSpecificationsBuilder builder, String search) {

    if (builder != null && search != null && search.length() > 0) {
      builder.withEqualOr(Category.IDP, "flowName", search);
      builder.withEqualOr(Category.IDP, "entityId", search);
      builder.withEqualOr(Category.IDP, "tenantId", search);
      builder.withEqualOr(Category.IDP, "hostname", search);
      builder.withEqualOr(Category.SP, "entityId", search);
      builder.withEqualOr(Category.SP, "clientId", search);
      builder.withEqualOr(Category.ORGANIZATION, "oid", search);
      builder.withContainOr(Category.SET, "name", search);
      builder.withContainOr(Category.SP, "name", search);
      builder.withContainOr(Category.ORGANIZATION, "name", search);
      try {
        builder.withEqualOr(Category.INTEGRATION, "id", Long.valueOf(search));
      } catch (NumberFormatException e) {
        logger.debug("Input search string cannot be interpreted as identifier.");
      }

      return builder;
    }

    return new IntegrationSpecificationsBuilder();
  }

  private IntegrationSpecificationsBuilder configureFilter(IntegrationSpecificationsBuilder builder, String type,
      String role, String deploymentPhase, Integer status) {

    if (builder != null) {
      // filterByType can be a list of types, thus (equality OR equality OR ...) AND
      if (type != null && type.length() > 0)
        builder.withEqualAnd(Category.TYPE, "type", type);

      // role can be a list of roles, thus (equality OR equality OR ...) AND
      if (role != null && role.length() > 0)
        builder.withEqualAnd(Category.ROLE, "role", role);

      // deploymentPhase can be a list of phases, thus (equality OR equality OR ...)
      // AND
      if (deploymentPhase != null && deploymentPhase.length() > 0)
        builder.withEqualAnd(Category.DEPLOYMENT_PHASE, "deploymentPhase", deploymentPhase);

      // status of the integration
      if (status != null) {
        builder.withEqualAnd(Category.INTEGRATION, "status", status);
      } else {
        builder.withEqualAnd(Category.INTEGRATION, "status", 0);
      }
      return builder;
    }
    return new IntegrationSpecificationsBuilder();
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
   * @param deploymentPhase deployment phase string, can be a
   *                        comma-separated list
   * @return a paged list of Integrations
   * @throws EntityNotFoundException
   */
  public Page<Integration> getIntegrationsSpecSearchPageable(String search, String filterByType, String role,
      String deploymentPhase, Integer status, Pageable pageable) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

    builder = configureSearch(builder, search);
    builder = configureFilter(builder, filterByType, role, deploymentPhase, status);

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
    final int fromIndex = (int) pageable.getOffset();
    final int toIndex = Math.min(fromIndex + pageable.getPageSize(), results.size());
    Page<Integration> integrations = new PageImpl<>(results.subList(fromIndex, toIndex), pageable,
        results.size());
    logger.debug("toIndex: {}, fromIndex: {}, results size: {}, page size: {}, page number: {}, page offset: {}",
        toIndex, fromIndex, results.size(), pageable.getPageSize(), pageable.getPageNumber(), pageable.getOffset());

    return integrations;
  }

  private List<Integration> sortIntegrations(List<Integration> integrations, Optional<Integration> referenceIntegration,
      Pageable pageable) {

    Sort sort = pageable.getSort();
    Iterator<Sort.Order> iter = sort.iterator();
    while (iter.hasNext()) {
      Sort.Order order = iter.next();
      logger.debug("Sorting result list by {} in {} order", order.getProperty(), order.getDirection());
      if (order.getProperty().equals("id")) {
        integrations.sort((i1, i2) -> i1.getId().compareTo(i2.getId()));
      }
      if (order.getProperty().equals("configurationEntity.set.name")) {
        integrations.sort((i1, i2) -> i1.getConfigurationEntity().getSet().getName()
            .compareTo(i2.getConfigurationEntity().getSet().getName()));
      }
      if (order.getProperty().equals("organization.name")) {
        integrations.sort((i1, i2) -> i1.getOrganization().getName()
            .compareTo(i2.getOrganization().getName()));
      }
      if (order.getProperty().equals("lastUpdatedOn")) {
        if (referenceIntegration.isPresent()) {
          for (IntegrationPermission permission : referenceIntegration.get().getPermissions()) {
            Long to = permission.getTo().getId();
            for (Integration i : integrations) {
              if (i.getId().equals(to)) {
                // not persistent
                i.setLastUpdatedOn(permission.getLastUpdatedOn());
              }
            }
          }
        }
        integrations.sort((i1, i2) -> i1.getLastUpdatedOn().compareTo(i2.getLastUpdatedOn()));
      }
      if (order.getDirection().equals(Direction.DESC)) {
        Collections.reverse(integrations);
      }
    }

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
   * @param deploymentPhase        deployment phase string, can be a
   *                               comma-separated list
   * @param referenceIntegrationId the id of an Integration used to provide more
   *                               information for searching, filtering, or
   *                               sorting
   * @return a paged list of Integrations
   * @throws EntityNotFoundException
   */
  public Page<Integration> getIntegrationsSpecSearchPageable(String search, String filterByType, String role,
      String deploymentPhase, Long referenceIntegrationId, Integer status, Pageable pageable) {

    List<Integration> integrations = new ArrayList<>();

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();

    builder = configureSearch(builder, search);
    builder = configureFilter(builder, filterByType, role, deploymentPhase, status);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      List<String> userOrganizationOids = getUserDetailsOrganizationOids(auth);
      // (service provider) sets can be retrieved by all authenticated users
      if (!includesAdminOrganization(userOrganizationOids) && !(role != null && role.contains("set"))) {
        builder.withEqualAnd(Category.ORGANIZATION, "oid", userOrganizationOids);
      }
      Specification<Integration> spec = builder.build();

      List<Integration> existingIntegrations = integrationRepository.findAll(spec);

      // try to query the reference integration
      Optional<Integration> referenceIntegration = getSpecIntegrationById(referenceIntegrationId);
      if (referenceIntegration.isPresent()) {
        // permitted integrations
        List<IntegrationPermission> permissions = referenceIntegration.get().getPermissions();
        List<Integration> permittedIntegrations = new ArrayList<>();
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
              integrations.addAll(permittedIntegrations);
              integrations.addAll(existingIntegrations);
              logger.debug(
                  "After removing and adding permitted integrations to the beginning of the response. Size: {}",
                  permissions.size());
            }
          }
        }
      }

      if (integrations.isEmpty()) {
        integrations = new ArrayList<Integration>(existingIntegrations);
      }

      integrations.forEach(integration -> extendPermissions(Optional.of(integration)));
      integrations = sortIntegrations(integrations, referenceIntegration, pageable);

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
      return extendPermissions(integration);
    } else {
      throw new EntityNotFoundException("Authentication not successful");
    }
  }

  /**
   * The method extends the integration permissions.
   * Requires the default test service integration identifier to be set in
   * application properties.
   * 
   * @param integration
   * @return integration with extended permissions
   */
  private Optional<Integration> extendPermissions(Optional<Integration> integration) {
    if (integration.isPresent()) {
      if (integration.get().getConfigurationEntity().getIdp() instanceof IdentityProvider) {
        if (defaultTestServiceIntegrationId == null) {
          logger.error("Configuration error of the default test service integration identifier");
          return integration;
        }

        Optional<Integration> defaultTestServiceIntegration = integrationRepository
            .findById(defaultTestServiceIntegrationId);
        if (defaultTestServiceIntegration.isPresent()) {
          integration.get().addPermissionTo(defaultTestServiceIntegration.get());
        } else {
          logger.error("Cannot find the default test service integration");
          return integration;
        }
      }
    }
    return integration;
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

  /**
   * The method updates integration given an id and integration.
   * Requires authentication and organizational authorization.
   *
   * The loading service updates the integration if differences are detected.
   * It is also responsible of setting the last update time of the integration.
   * 
   * @param id          the id of the Integration
   * @param integration the input integration
   * @return Integration
   * @throws EntityNotFoundException
   */
  public Integration updateIntegration(Long id, Integration integration) {

    Integration existingIntegration = getSpecIntegrationById(id).get();
    if (existingIntegration != null) {
      try {
        // TODO check that integration.getId() and id matches
        Integration updatedIntegration = loadingService.loadOne(integration);
        if (updatedIntegration != null) {
          existingIntegration = updatedIntegration;
        }

        updatePermissions(integration, existingIntegration);

        integration = integrationRepository.saveAndFlush(existingIntegration);
      } catch (OptimisticLockException ole) {
        throw new EntityUpdateException(
            "Integration #" + existingIntegration.getId() + " update not successful. Please re-update.");
      }
      return extendPermissions(Optional.of(integration)).get();
    }
    return existingIntegration;
  }

  /**
   * The method updates integration permissions while maintaining permission
   * update times.
   *
   * @param integration         the input integration
   * @param existingIntegration the existing integration
   */
  private void updatePermissions(Integration integration, Integration existingIntegration) {
    
    if (integration.getPermissions() != null) {
      logger.debug(
          "Permit integrations count : {}", integration.getPermissions().size());
      List<Long> existingPermittedIntegrations = new ArrayList<>();
      for (IntegrationPermission existingPermission : existingIntegration.getPermissions()) {
        existingPermittedIntegrations.add(existingPermission.getTo().getId());
      }
      logger.debug("Integration #{}: Existing permitted integration identifiers #{}", existingIntegration.getId(),
          existingPermittedIntegrations);

      for (IntegrationPermission permission : integration.getPermissions()) {
        // permission updates to the configurable default test service are skipped
        if (permission.getTo().getId() != null && permission.getTo().getId().equals(defaultTestServiceIntegrationId)) {
          continue;
        }
        // permission to integration set
        if (!existingPermittedIntegrations.contains(permission.getTo().getId())) {
          Integration integrationSet = getIntegrationSetById(permission.getTo().getId()).get();
          existingIntegration.addPermissionTo(integrationSet);
          logger.debug("Updated #{}: Permitted integration #{}", existingIntegration.getId(),
              permission.getTo().getId());
        }
        existingPermittedIntegrations.remove(permission.getTo().getId());
      }
      // a permission was removed
      if (!existingPermittedIntegrations.isEmpty()) {
        for (Long permittedIntegrationId : existingPermittedIntegrations) {
          if (permittedIntegrationId.equals(defaultTestServiceIntegrationId)) {
            continue;
          }
          logger.debug("Updated #{}: Removed permitted integration #{}", existingIntegration.getId(),
              permittedIntegrationId);
          existingIntegration.removePermissionTo(permittedIntegrationId);
        }
      }
    }
  }

  public List<Integration> getIntegrationsSince(LocalDateTime timestamp) {
    List<Integration> integrations = integrationRepository.findAllByLastUpdatedOnAfter(timestamp);
    for (Integration integration : integrations) {
      List<Revision<Integer, Integration>> revisions = findRevisionsSince(integration.getId(), timestamp);
      logger.debug("Integration #{}: {} revisions since {}", integration.getId(), revisions.size(), timestamp);
    }
    return integrations;
  }

  public List<Integration> getIntegrationsSince(LocalDateTime timestamp, int deploymentPhase) {
    List<Integration> integrations = integrationRepository.findAllByLastUpdatedOnAfterAndDeploymentPhase(timestamp,
        deploymentPhase);
    for (Integration integration : integrations) {
      List<Revision<Integer, Integration>> revisions = findRevisionsSince(integration.getId(), timestamp);
      logger.debug("Integration #{}: {} revisions since {}", integration.getId(), revisions.size(), timestamp);
    }
    return integrations;
  }

  private List<Revision<Integer, Integration>> findRevisionsSince(Long id, LocalDateTime since) {
    Revisions<Integer, Integration> integrationRevisions = integrationRepository.findRevisions(id);
    if (integrationRevisions != null) {
      return integrationRevisions.getContent().stream().filter(
          revision -> revision.getEntity().getLastUpdatedOn().isAfter(since))
          .collect(Collectors.toList());
    }
    return new ArrayList<Revision<Integer, Integration>>();
  }

  public List<Integration> getIntegrationsByPermissionUpdateTimeSince(LocalDateTime timestamp, int deploymentPhase) {
    List<Integration> integrations = integrationRepository
        .findDistinctByPermissionsLastUpdatedOnAfterAndDeploymentPhase(timestamp, deploymentPhase);
    return integrations;
  }

  private List<Integration> getIntegrationsBy(String role) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();
    if (role != null && role.length() > 0) {
      builder.withEqualAnd(Category.ROLE, "role", role);
      Specification<Integration> spec = builder.build();
      return integrationRepository.findAll(spec);
    } else {
      throw new EntityNotFoundException("No role specified");
    }
  }

  private List<Integration> getIntegrationsBy(String role, String type) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();
    if (role != null && role.length() > 0 && type != null && type.length() > 0) {
      builder.withEqualAnd(Category.ROLE, "role", role);
      builder.withEqualAnd(Category.TYPE, "type", type);
      Specification<Integration> spec = builder.build();
      return integrationRepository.findAll(spec);
    } else {
      throw new EntityNotFoundException("No role and type specified");
    }
  }

  public List<Integration> getIdentityProviders() {
    return getIntegrationsBy("idp");
  }

  public List<Integration> getServiceProviders() {
    return getIntegrationsBy("sp");
  }

  public List<Integration> getServiceProviderSets() {
    return getIntegrationsBy("set", "sp");
  }

  public Optional<Integration> getIntegration(Long integrationId) {
    return integrationRepository.findById(integrationId);
  }
}