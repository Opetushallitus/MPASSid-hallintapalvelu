package fi.mpass.voh.api.integration;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
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
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;

import fi.mpass.voh.api.config.IntegrationServiceConfiguration;
import fi.mpass.voh.api.exception.EntityCreationException;
import fi.mpass.voh.api.exception.EntityInactivationException;
import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.exception.EntityUpdateException;
import fi.mpass.voh.api.exception.SecretSavingException;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.IntegrationSpecificationCriteria.Category;
import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.Adfs;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.integration.idp.Gsuite;
import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.SamlServiceProvider;
import fi.mpass.voh.api.loading.CredentialService;
import fi.mpass.voh.api.loading.LoadingService;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationService;
import jakarta.persistence.OptimisticLockException;
import jakarta.validation.Valid;

@Service
public class IntegrationService {
  private static final Logger logger = LoggerFactory.getLogger(IntegrationService.class);

  private final IntegrationRepository integrationRepository;
  private final OrganizationService organizationService;
  private final LoadingService loadingService;
  private final IntegrationServiceConfiguration configuration;
  private final CredentialService credentialService;

  @Value("${application.metadata.credential.value.field:client_secret}")
  protected String credentialMetadataValueField = "client_secret";

  public IntegrationService(IntegrationRepository integrationRepository, OrganizationService organizationService,
      LoadingService loadingService, IntegrationServiceConfiguration configuration,
      CredentialService credentialService) {
    this.integrationRepository = integrationRepository;
    this.organizationService = organizationService;
    this.loadingService = loadingService;
    this.configuration = configuration;
    this.credentialService = credentialService;
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
          if (b || authorityElements[4].equals(configuration.getAdminOrganizationOid())) {
            organizationOids.add(authorityElements[4]);
          }
        }
      }
    }
    return organizationOids;
  }

  private boolean includesAdminOrganization(List<String> organizationOids) {
    if (configuration.getAdminOrganizationOid() != null && !configuration.getAdminOrganizationOid().isEmpty()) {
      for (String oid : organizationOids) {
        if (oid.contains(configuration.getAdminOrganizationOid())) {
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
   * The method creates a specification based on the given identifier and queries
   * the integration repository through the specification.
   * 
   * @param id Integration identifier
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

      // try to retrieve a transient, extended (organisation with suborganizations)
      // organization
      Organization organization = null;
      try {
        organization = organizationService.retrieveSubOrganizations(integration.get().getOrganization().getOid());
      } catch (JsonProcessingException e) {
        logger.debug("Failed to retrieve extended organization.");
      }
      if (organization != null) {
        organizationService.saveOrganization(organization);
        integration.get().setOrganization(organization);
      }
      integration = extendPermissions(integration);
      return integration;
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
        if (configuration.getDefaultTestServiceIntegrationId() == null) {
          logger.error("Configuration error of the default test service integration identifier");
          return integration;
        }

        Optional<Integration> defaultTestServiceIntegration = integrationRepository
            .findById(configuration.getDefaultTestServiceIntegrationId());
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

  public Integration changeLogoUrlForUi(Integration integration) {
    // Change the integrations logoUrl for UI suitable use.
    if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getIdp() != null) {
      String logoUrl = this.configuration.getImageBaseUrlUi()
          + "/" + integration.getId();
      integration.getConfigurationEntity().getIdp().setLogoUrl(logoUrl);
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
      if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getSp() != null) {
        if (!checkAuthority("ROLE_APP_MPASSID_PALVELU_TALLENTAJA") && !checkAuthority("ROLE_APP_MPASSID_TALLENTAJA")) {
          logger.error("No authority to update SP.");
          throw new EntityCreationException("Integration update failed, no authority to update SP.");
        }

        // Check for duplicate entityIds and clientIds
        if (integration.getConfigurationEntity().getSp().getType().equals("saml")) {
          SamlServiceProvider samlSp = (SamlServiceProvider) integration.getConfigurationEntity().getSp();
          SamlServiceProvider existingSamlSP = (SamlServiceProvider) existingIntegration.getConfigurationEntity()
              .getSp();
          if (samlSp.getEntityId() == null || !validateEntityId(samlSp.getEntityId())) {
            if (!existingSamlSP.getEntityId().equals(samlSp.getEntityId())) {
              logger.error("No entityID given or entityID is already in use.");
              throw new EntityUpdateException(
                  "Integration update failed, no entityID given or entityID is already in use.");
            }
          }
        }
        if (integration.getConfigurationEntity().getSp().getType().equals("oidc")) {
          OidcServiceProvider oidcSp = ((OidcServiceProvider) integration.getConfigurationEntity().getSp());
          OidcServiceProvider existingOidcSp = ((OidcServiceProvider) existingIntegration.getConfigurationEntity()
              .getSp());
          if (oidcSp.getClientId() == null || !validateEntityId(oidcSp.getClientId())) {
            if (!existingOidcSp.getClientId().equals(oidcSp.getClientId())) {
              logger.error("No entityID given or entityID is already in use.");
              throw new EntityUpdateException(
                  "Integration update failed, no clientId given or clientId is already in use.");
            }
          }
        }
      }
      if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getIdp() != null) {
        if (!checkAuthority("ROLE_APP_MPASSID_TALLENTAJA")) {
          logger.error("No authority to update IDP.");
          throw new EntityCreationException("Integration update failed, no authority to update IDP.");
        }

        if (integration.getConfigurationEntity().getIdp() instanceof Azure) {
          integration = addRedirectUri(integration);
        }
      }
      try {
        // TODO check that integration.getId() and id matches
        integration = handleSecrets(integration);
        Integration updatedIntegration = loadingService.loadOne(integration);
        if (updatedIntegration != null) {
          existingIntegration = updatedIntegration;
        }

        updatePermissions(integration, existingIntegration);

        integration = integrationRepository.saveAndFlush(existingIntegration);
      } catch (OptimisticLockException ole) {
        logger.error(ole.getMessage());
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
        if (permission.getTo().getId() != null
            && permission.getTo().getId().equals(configuration.getDefaultTestServiceIntegrationId())) {
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
          if (permittedIntegrationId.equals(configuration.getDefaultTestServiceIntegrationId())) {
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

  public List<Integration> getIntegrationsByByUpdateTimeSinceAndDeploymentPhaseAndRole(LocalDateTime timestamp,
      int deploymentPhase, String role) {
    List<Integration> integrations = integrationRepository
        .findAllByLastUpdatedOnAfterAndDeploymentPhaseAndRole(timestamp, deploymentPhase, role);
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

  private List<Integration> getFilteredIntegrationsBy(String role) {

    IntegrationSpecificationsBuilder builder = new IntegrationSpecificationsBuilder();
    if (role != null && role.length() > 0) {
      builder.withEqualAnd(Category.ROLE, "role", role);
      Specification<Integration> spec = builder.build();
      List<Integration> integrations = integrationRepository.findAll(spec);
      for (Integration integration : integrations) {
        List<IntegrationPermission> permissions = integration.getPermissions();
        Iterator<IntegrationPermission> iter = permissions.iterator();
        while (iter.hasNext()) {
          IntegrationPermission permission = iter.next();
          if (permission.getTo().getId().equals(configuration.getDefaultTestServiceIntegrationId())) {
            logger.debug("Filtering out integration #{}", configuration.getDefaultTestServiceIntegrationId());
            iter.remove();
          }
        }
      }

      return integrations;
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
    return getFilteredIntegrationsBy("idp");
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

  public Integration createBlankIntegration(String role, String type, String oid, Long integrationSetId) {
    // TODO if no integration set identifier is given, create a new one, otherwise
    // find by it and associate to it
    if (role != null && type != null && oid != null) {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();
      Organization organization = null;
      if (auth != null) {
        List<String> userOrganizationOids = getUserDetailsOrganizationOids(auth);
        if (userOrganizationOids.contains(oid)) {
          try {
            organization = organizationService.retrieveSubOrganizations(oid);
            if (organization != null) {
              organizationService.saveOrganization(organization);
            } else {
              logger.error("Organization is null.");
              throw new EntityCreationException("Integration creation failed due to organization retrieval error.");
            }
          } catch (JsonProcessingException e) {
            logger.error(e.getMessage());
            throw new EntityCreationException("Integration creation failed due to organization retrieval error.");
          }
        }
      }
      // TODO assuming here organization is not null
      // TODO type, role case
      if (role.equals("idp")) {
        DiscoveryInformation discoveryInformation = new DiscoveryInformation();
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        if (type.equals("wilma")) {
          Wilma wilma = new Wilma();
          configurationEntity.setIdp(wilma);
          wilma.setHostname("");
        }
        if (type.equals("gsuite")) {
          Gsuite gsuite = new Gsuite();
          configurationEntity.setIdp(gsuite);
        }
        if (type.equals("opinsys")) {
          Opinsys opinsys = new Opinsys();
          configurationEntity.setIdp(opinsys);
        }
        if (type.equals("adfs")) {
          Adfs adfs = new Adfs();
          configurationEntity.setIdp(adfs);
        }
        if (type.equals("azure")) {
          Azure azure = new Azure();
          configurationEntity.setIdp(azure);
        }
        return new Integration(0L, null, configurationEntity, null, 0,
            discoveryInformation, organization, "");
      }
      if (role.equals("sp")) {
        DiscoveryInformation discoveryInformation = new DiscoveryInformation();
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        if (type.equals("oidc")) {
          OidcServiceProvider oidc = new OidcServiceProvider();
          configurationEntity.setSp(oidc);
        }
        if (type.equals("saml")) {
          SamlServiceProvider saml = new SamlServiceProvider();
          configurationEntity.setSp(saml);
        }
        return new Integration(0L, null, configurationEntity, null, 0,
            discoveryInformation, organization, "");
      }
      if (role.equals("set")) {
        DiscoveryInformation discoveryInformation = new DiscoveryInformation();
        ConfigurationEntity configurationEntity = new ConfigurationEntity();
        IntegrationSet integrationSet = new IntegrationSet();
        configurationEntity.setSet(integrationSet);
        return new Integration(0L, null, configurationEntity, null, 0,
            discoveryInformation, organization, "");
      }
    }
    return new Integration();
  }

  public Integration inactivateIntegration(Long id) {
    // TODO check authz
    Optional<Integration> integration = this.getIntegration(id);

    if (integration.isPresent()) {
      if (integration.get().getConfigurationEntity() != null
          && integration.get().getConfigurationEntity().getIdp() != null) {
        if (!checkAuthority("ROLE_APP_MPASSID_TALLENTAJA")) {
          logger.error("No authority to inactivate IDP.");
          throw new EntityCreationException("Integration inactivation failed, no authority to inactivate IDP.");
        }
      }
      if (integration.get().getConfigurationEntity() != null
          && integration.get().getConfigurationEntity().getSp() != null) {
        if (!checkAuthority("ROLE_APP_MPASSID_PALVELU_TALLENTAJA") && !checkAuthority("ROLE_APP_MPASSID_TALLENTAJA")) {
          logger.error("No authority to inactivate SP.");
          throw new EntityCreationException("Integration inactivation failed, no authority to inactivate SP.");
        }
      }

      integration.get().getIntegrationSets().iterator();
      for (Iterator<Integration> integrationIterator = integration.get().getIntegrationSets()
          .iterator(); integrationIterator.hasNext();) {
        Integration setIntegration = integrationIterator.next();
        if (setIntegration.getIntegrationSets().size() == 1) {
          setIntegration.setStatus(1);
        }
      }
      integration.get().removeFromSets();
      integration.get().setStatus(1);
      return integrationRepository.save(integration.get());
    } else {
      logger.error("Integration #{} not found.", id);
      throw new EntityInactivationException("Integration inactivation failed. Integration not found.");
    }
  }

  public Integration createIntegration(@Valid Integration integration) {
    if (integration != null) {
      // TODO Separate IDP and SP creation to own methods
      if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getIdp() != null) {
        if (!checkAuthority("ROLE_APP_MPASSID_TALLENTAJA")) {
          logger.error("No authority to create IDP.");
          throw new EntityCreationException("Integration creation failed, no authority to create IDP.");
        }
        // Create IDP
        List<Long> availableIdpIds = (integration.getDeploymentPhase() == 1)
            ? integrationRepository.getAvailableIdpProdIntegrationIdentifier()
            : integrationRepository.getAvailableIdpTestIntegrationIdentifier();
        if (availableIdpIds != null && !availableIdpIds.isEmpty()) {
          integration.setId(availableIdpIds.get(0));
          integration.getConfigurationEntity().getIdp()
              .setFlowName(integration.getConfigurationEntity().getIdp().getType() + availableIdpIds.get(0));
          integration.getConfigurationEntity().getIdp()
              .setIdpId(integration.getConfigurationEntity().getIdp().getType() + "_" + availableIdpIds.get(0));
          if (integration.getConfigurationEntity().getIdp() instanceof Azure) {
            integration = addRedirectUri(integration);
          }
        } else {
          // TODO the case of the first integration without preloaded integrations
          logger.error("Failed to find an available idp integration identifier");
          throw new EntityCreationException("Integration creation failed");
        }
        integration = handleSecrets(integration);

        integration = addDefaultMetadataUrl(integration);

        return integrationRepository.save(integration);
      }
      if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getSp() != null) {
        // Create SP
        if (!checkAuthority("ROLE_APP_MPASSID_PALVELU_TALLENTAJA") && !checkAuthority("ROLE_APP_MPASSID_TALLENTAJA")) {
          logger.error("No authority to create SP.");
          throw new EntityCreationException("Integration creation failed, no authority to create SP.");
        }
        if (integration.getConfigurationEntity().getSp().getType().equals("saml")) {
          SamlServiceProvider samlSP = ((SamlServiceProvider) integration.getConfigurationEntity().getSp());
          if (samlSP.getEntityId() == null || !validateEntityId(samlSP.getEntityId())) {
            logger.error("No entityID given or entityID is already in use.");
            throw new EntityCreationException(
                "Integration creation failed, no entityID given or entityID is already in use.");
          }
        }
        if (integration.getConfigurationEntity().getSp().getType().equals("oidc")) {
          OidcServiceProvider oidcSP = ((OidcServiceProvider) integration.getConfigurationEntity().getSp());
          if (oidcSP.getClientId() == null || !validateEntityId(oidcSP.getClientId())) {
            logger.error("No entityID given or entityID is already in use.");
            throw new EntityCreationException(
                "Integration creation failed, no clientId given or clientId is already in use.");
          }
        }

        List<Long> availableSpIds = (integration.getDeploymentPhase() == 1)
            ? integrationRepository.getAvailableSpProdIntegrationIdentifier()
            : integrationRepository.getAvailableSpTestIntegrationIdentifier();
        if (availableSpIds != null && !availableSpIds.isEmpty()) {
          integration.setId(availableSpIds.get(0));
        } else {
          logger.error("Failed to find an available sp integration identifier");
          throw new EntityCreationException("Integration creation failed");
        }

        Long setId = 0L;
        try {
          setId = integration.getIntegrationSets().iterator().next().getId();
        } catch (Exception e) {
          logger.error("No integration set id found", e);
        }

        if (setId == 0) {
          // No existing integration set, create new
          List<Long> availableSetIds = (integration.getDeploymentPhase() == 1)
              ? integrationRepository.getAvailableSetProdIntegrationIdentifier()
              : integrationRepository.getAvailableSetTestIntegrationIdentifier();
          if (availableSetIds != null && !availableSetIds.isEmpty()) {
            setId = availableSetIds.get(0);
          } else {
            logger.error("Failed to find an available set integration identifier");
            throw new EntityCreationException("Integration creation failed");
          }
          logger.debug("\nsetId set to " + setId);

          Integration setIntegration = createBlankIntegration("set", "", "", null);
          setIntegration.setId(setId);
          setIntegration.getConfigurationEntity().getSet().setId(setId);
          setIntegration.getConfigurationEntity().getSet()
              .setName(integration.getConfigurationEntity().getSp().getName());
          setIntegration.getConfigurationEntity().getSet().setType("sp");
          setIntegration.setOrganization(integration.getOrganization());
          integration.removeFromSets();

          integration = handleSecrets(integration);

          integrationRepository.save(setIntegration);
          integrationRepository.save(integration);
          integration.addToSet(setIntegration);
          integrationRepository.save(setIntegration);
          integration = integrationRepository.save(integration);
          return integration;
        } else {
          // Add to existing integration set
          Optional<Integration> optionalSet = getIntegration(setId);
          if (optionalSet.isPresent()) {
            integration = handleSecrets(integration);
            integration = integrationRepository.saveAndFlush(integration);
            integration.addToSet(optionalSet.get());
            integrationRepository.saveAndFlush(optionalSet.get());
            return integrationRepository.saveAndFlush(integration);
          } else {
            logger.error("No integration set with id {} found.", setId);
            throw new EntityCreationException("Integration creation failed");
          }
        }
      }
    } else {
      logger.debug("Integration creation failed.");
    }
    return integration;
  }

  public Boolean validateAcsUrl(String url) {

    return true;
  }

  public Boolean validateEntityId(String id) {
    List<String> usedEntityIds = integrationRepository.getAllEntityIds();
    if (usedEntityIds.contains(id)) {
      return false;
    }
    return true;
  }

  public Boolean validateClientId(String id) {
    List<String> usedClientIds = integrationRepository.getAllClientIds();
    if (usedClientIds.contains(id)) {
      return false;
    }
    return true;
  }

  /**
   * 
   * @param requiredAuthority * ROLE_APP_MPASSID
   *                          ROLE_APP_MPASSID_TALLENTAJA
   *                          ROLE_APP_MPASSID_PALVELU_TALLENTAJA
   *                          ROLE_APP_MPASSID_KATSELIJA
   *                          ROLE_APP_MPASSID_PALVELU_KATSELIJA
   * @return Boolean
   */

  public Boolean checkAuthority(String requiredAuthority) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    for (GrantedAuthority grantedAuthority : auth.getAuthorities()) {
      if (grantedAuthority.getAuthority().contains(requiredAuthority)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns a data transfer object containing two arrays:
   * existingExcluded: given organization's integrations (identifiers) of
   * which discovery information contains excluded schools (filtered by given
   * institution types)
   * existingIncluded: institution (school) codes of the given organization's
   * integrations' discovery information (filtered by given institution types)
   * 
   * @param organizationOid one of the organizations' oids of the authenticated
   *                        user
   * @param types           the institution (school) types used to match with the
   *                        existing integrations' institution types
   * @return DiscoveryInformationDTO
   */
  public DiscoveryInformationDTO getDiscoveryInformation(String organizationOid, List<Integer> institutionTypes,
      Long id) {
    DiscoveryInformationDTO di = new DiscoveryInformationDTO();
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      List<String> userOrganizationOids = getUserDetailsOrganizationOids(auth);
      if (!organizationOid.isEmpty() && userOrganizationOids.contains(organizationOid) && institutionTypes != null) {
        // find all integrations of the given organization
        List<Integration> integrations = integrationRepository
            .findAllByOrganizationOid(organizationOid);

        Set<String> allExcluded = new HashSet<>();
        Set<String> allIncluded = new HashSet<>();
        for (Integration i : integrations) {
          if (i.isActive() && !i.getId().equals(id) && (i.getConfigurationEntity().getIdp() != null)) {
            if (i.getDeploymentPhase() != 1) {
              // Filter out non production integrations
              continue;
            }
            if (matchInstitutionTypes(institutionTypes, i) && i.getDiscoveryInformation() != null) {
              if (!i.getDiscoveryInformation().getExcludedSchools().isEmpty()) {
                allExcluded.add(Long.toString(i.getId()));
              }
              for (String school : i.getDiscoveryInformation().getSchools()) {
                allIncluded.add(school);
              }
              di.setExistingExcluded(allExcluded);
              di.setExistingIncluded(allIncluded);
            }
          }
        }
      }
    } else {
      throw new EntityNotFoundException("Authentication not successful");
    }
    return di;
  }

  /**
   * Matches given institution types with existing organization's integrations'
   * institution types (includes at least one)
   * 
   * @param institutionTypes given institution types
   * @param i                Integration
   */
  private boolean matchInstitutionTypes(List<Integer> institutionTypes, Integration i) {
    if (i.getConfigurationEntity() != null && i.getConfigurationEntity().getIdp() != null) {
      for (Integer parameterType : institutionTypes) {
        for (Integer integrationType : i.getConfigurationEntity().getIdp().getInstitutionTypes()) {
          if (parameterType.equals(integrationType)) {
            logger.debug("Integration #{} matches with parameter institution types : {}, param: {}", i.getId(),
                i.getConfigurationEntity().getIdp().getInstitutionTypes(), institutionTypes);
            return true;
          }
        }
      }
    }
    return false;
  }

  public String saveImage(Long id, MultipartFile file) {

    Optional<Integration> integration = this.getIntegration(id);

    if (integration.isPresent()) {
      String url = this.configuration.getImageBaseUrl() + "/" + Long.toString(id);
      Path rootLocation = Paths.get(this.configuration.getImageBasePath());
      try {
        if (file.isEmpty()) {
          logger.error("Empty file {}", file);
          throw new EntityCreationException("Failed to save image.");
        }

        try (InputStream inputStream = file.getInputStream(); InputStream contentStream = file.getInputStream()) {
          String logoContentType = getDiscoveryInformationLogoContentType(contentStream);
          if (logoContentType != null && logoContentType.contains("image/")) {
            logoContentType = logoContentType.replace("image/", "");
          }
          url += "." + logoContentType;
          Path destinationFile = rootLocation.resolve(Paths.get(Long.toString(id) + "." + logoContentType)).normalize()
              .toAbsolutePath();
          logger.debug("\n" + destinationFile.toString() + "\n");
          if (!destinationFile.getParent().equals(rootLocation.toAbsolutePath())) {
            logger.error("Cannot store file outside configured directory: {}", destinationFile);
            throw new EntityCreationException("Failed to save image.");
          }
          deleteDiscoveryInformationLogo(id);
          Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
          if (integration.get().getConfigurationEntity() != null
              && integration.get().getConfigurationEntity().getIdp() != null) {

            integration.get().getConfigurationEntity().getIdp().setLogoUrl(url);
            integrationRepository.save(integration.get());
          }
          url = this.configuration.getImageBaseUrlUi() + "/" + id;
          return url;
        }
      } catch (IOException e) {
        logger.error("Exception in saving image", e);
        throw new EntityCreationException("Failed to save image.");
      }
    } else {
      logger.error("Integration #{} not found.", id);
      throw new EntityUpdateException("Discovery information update failed.");
    }
  }

  public InputStreamResource getDiscoveryInformationLogo(Long id) {
    if (configuration.getImageBasePath() == null) {
      logger.error("Logo not found: {}", id);
      throw new EntityNotFoundException("Logo not found.");
    }
    Path rootLocation = Paths.get(configuration.getImageBasePath());
    String sourceFileName = "";
    File[] imageFiles = rootLocation.toFile().listFiles();
    boolean found = false;
    if (imageFiles != null) {
      for (File imageFile : imageFiles) {
        String filenameRegex = "(^" + id + "\\..*$|^" + id + "$)";
        Pattern p = Pattern.compile(filenameRegex);
        Matcher m = p.matcher(imageFile.getName());
        boolean b = m.matches();
        if (b) {
          sourceFileName = imageFile.getAbsolutePath();
          found = true;
        }
      }
    } else {
      logger.error("Logo not found: {}", id);
      throw new EntityNotFoundException("Logo not found.");
    }

    if (!found) {
      logger.error("Logo not found: {}", id);
      throw new EntityNotFoundException("Logo not found.");
    }

    try {
      return new InputStreamResource(new FileInputStream(sourceFileName));
    } catch (FileNotFoundException e) {
      logger.error("Logo not found: {}", sourceFileName);
      throw new EntityNotFoundException("Logo not found.");
    }
  }

  private void deleteDiscoveryInformationLogo(Long id) {
    if (configuration.getImageBasePath() == null) {
      logger.error("Logo not found: {}", id);
      throw new EntityNotFoundException("Logo not found.");
    }
    Path rootLocation = Paths.get(configuration.getImageBasePath());
    File[] imageFiles = rootLocation.toFile().listFiles();
    if (imageFiles != null) {
      for (File imageFile : imageFiles) {
        String filenameRegex = "(^" + id + "\\..*$|^" + id + "$)";
        Pattern p = Pattern.compile(filenameRegex);
        Matcher m = p.matcher(imageFile.getName());
        boolean b = m.matches();
        if (b) {
          try {
            imageFile.delete();
          } catch (SecurityException e) {
            logger.error("Delete access to the file denied.", e.getMessage());
          }
        }
      }
    }
  }

  public String getDiscoveryInformationLogoContentType(InputStream inputStream) {
    ImageInputStream imageStream = null;
    try {
      imageStream = ImageIO.createImageInputStream(inputStream);
    } catch (IOException e) {
      logger.error("Error in creating image input stream.");
    }

    if (imageStream != null) {
      Iterator<ImageReader> readers = ImageIO.getImageReaders(imageStream);

      while (readers.hasNext()) {
        ImageReader r = readers.next();
        try {
          return "image/" + r.getFormatName().toLowerCase();
        } catch (IOException e) {
          logger.error("Error in reading input image stream.");
        }
      }
    }
    return null;
  }

  private Integration addDefaultMetadataUrl(Integration integration) {
    // Add default metadataUrl (UI) if metadataUrl is not yet set
    if (integration.getConfigurationEntity().getIdp() instanceof IdentityProvider) {
      if (integration.getConfigurationEntity().getIdp().getType().equals("adfs")) {
        Adfs adfsIdp = (Adfs) integration.getConfigurationEntity().getIdp();
        if (adfsIdp.getMetadataUrl() == null || adfsIdp.getMetadataUrl().isEmpty()) {
          adfsIdp.setMetadataUrl(configuration.getMetadataBaseUrlUi() + "/" + integration.getId());
        }
      } else if (integration.getConfigurationEntity().getIdp().getType().equals("gsuite")) {
        Gsuite gsuiteIdp = (Gsuite) integration.getConfigurationEntity().getIdp();
        if (gsuiteIdp.getMetadataUrl() == null || gsuiteIdp.getMetadataUrl().isEmpty()) {
          gsuiteIdp.setMetadataUrl(configuration.getMetadataBaseUrlUi() + "/" + integration.getId());
        }
      }
    }
    return integration;
  }

  public Integration changeMetadataUrlForProvisioning(Integration integration) {
    // If metadataUrl points to hallintapalvelu, change it to point at proxy
    if (integration.getConfigurationEntity().getIdp() instanceof IdentityProvider) {
      if (integration.getConfigurationEntity().getIdp().getType().equals("adfs")) {
        Adfs adfsIdp = (Adfs) integration.getConfigurationEntity().getIdp();
        if (adfsIdp.getMetadataUrl().contains(configuration.getMetadataBaseUrlUi())) {
          String metadataUrl = this.configuration.getMetadataBaseUrl()
              + "/" + integration.getId();
          adfsIdp.setMetadataUrl(metadataUrl);
        }
      } else if (integration.getConfigurationEntity().getIdp().getType().equals("gsuite")) {
        Gsuite gsuiteIdp = (Gsuite) integration.getConfigurationEntity().getIdp();
        if (gsuiteIdp.getMetadataUrl().contains(configuration.getMetadataBaseUrlUi())) {
          String metadataUrl = this.configuration.getMetadataBaseUrl()
              + "/" + integration.getId();
          gsuiteIdp.setMetadataUrl(metadataUrl);
        }
      }
    }
    return integration;
  }

  private Integration handleSecrets(Integration integration) {
    // Save client secret to aws parameter store
    boolean success = false;
    if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getSp() != null) {
      if (integration.getConfigurationEntity().getSp().getType().equals("oidc")) {
        success = credentialService.updateOidcCredential(integration, credentialMetadataValueField,
            integration.getConfigurationEntity().getSp().getMetadata().get(credentialMetadataValueField));
        if (!success) {
          logger.error("Failed to save secret to aws parameter store.");
          throw new SecretSavingException("Failed to save aws secret.");
        }
      }
    } else if (integration.getConfigurationEntity() != null && integration.getConfigurationEntity().getIdp() != null) {
      if (integration.getConfigurationEntity().getIdp().getType().equals("azure")) {
        success = credentialService.updateIdpCredential(integration);
        if (!success) {
          logger.error("Failed to save secret to aws parameter store.");
          throw new SecretSavingException("Failed to save aws secret.");
        }
      } else if (integration.getConfigurationEntity().getIdp().getType().equals("opinsys")) {
        success = credentialService.updateIdpCredential(integration);
        if (!success) {
          logger.error("Failed to save secret to aws parameter store.");
          throw new SecretSavingException("Failed to save aws secret.");
        }
      }
    }
    return integration;
  }

  private Integration addAttribute(Integration integration, Attribute attribute) {
    try {
      Set<Attribute> attributes = integration.getConfigurationEntity().getAttributes();
      for (Iterator<Attribute> i = attributes.iterator(); i.hasNext();) {
        Attribute a = i.next();
        if (a.getName().equals(attribute.getName())) {
          i.remove();
        }
      }
      attribute.setConfigurationEntity(integration.getConfigurationEntity());
      attributes.add(attribute);
    } catch (Exception e) {
      logger.error("Error in handling integration attributes: ", e);
      throw new EntityCreationException("Integration creation failed");
    }
    return integration;
  }

  private Integration addRedirectUri(Integration integration) {
    Set<Attribute> attributes = integration.getConfigurationEntity().getAttributes();
    boolean found = false;
    for (Attribute a : attributes) {
      if (a.getName().equals(configuration.getRedirectUriReference())
          && a.getName().equals(configuration.getRedirectUriReferenceValue())) {
        Attribute newAttribute = new Attribute("data", "redirectUri", configuration.getRedirectUriValue1());
        integration = addAttribute(integration, newAttribute);
        found = true;
      }
    }
    if (!found) {
      String flowname = integration.getConfigurationEntity().getIdp().getFlowName();
      String content = configuration.getRedirectUriValue2().replace("<flowname>", flowname);
      Attribute newAttribute = new Attribute("data", "redirectUri", content);
      integration = addAttribute(integration, newAttribute);
    }
    return integration;
  }
}
