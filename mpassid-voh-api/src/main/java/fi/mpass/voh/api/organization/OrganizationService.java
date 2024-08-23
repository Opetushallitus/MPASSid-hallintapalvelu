package fi.mpass.voh.api.organization;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class OrganizationService {
  private static final Logger logger = LoggerFactory.getLogger(OrganizationService.class);

  private String externalOrganizationServiceUrl;

  private final OrganizationRepository organizationRepository;

  private final RestClient restClient;

  public OrganizationService(OrganizationRepository organizationRepository,
      @Value("${organization.service.url:https://virkailija.opintopolku.fi/organisaatio-service/api/}") String url) {
    this.organizationRepository = organizationRepository;
    this.externalOrganizationServiceUrl = url;

    restClient = RestClient.builder().requestFactory(new HttpComponentsClientHttpRequestFactory())
        .baseUrl(this.externalOrganizationServiceUrl)
        .defaultHeaders(httpHeaders -> httpHeaders.set("Accept-Charset", "utf-8"))
        .build();
  }

  /**
   * 
   * Retrieves organization information from an external organization service.
   * https://virkailija.opintopolku.fi/organisaatio-service/swagger-ui/index.html
   * 
   * @param id
   * @return the retrieved organization
   * @throws JsonProcessingException
   * @throws JsonMappingException
   * @throws WebClientResponseException
   */
  public Organization retrieveOrganization(String id) throws JsonProcessingException {

    String url = externalOrganizationServiceUrl.replaceAll("/$", "") + "/";

    logger.debug("Retrieving organization information from {}", url);

    String responseBody = restClient.get()
        .uri(url + id)
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .body(String.class);

    ObjectMapper mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    Organization organization = mapper.readValue(responseBody, Organization.class);

    return organization;
  }

  /**
   * 
   * Retrieves organization information from an external organization service.
   * https://virkailija.opintopolku.fi/organisaatio-service/swagger-ui/index.html
   * 
   * @param oid the organization oid
   * @return the retrieved organization
   * @throws JsonProcessingException
   * @throws JsonMappingException
   * @throws WebClientResponseException
   */
  public Organization retrieveSubOrganizations(String oid) throws JsonProcessingException {

    if (!oid.isEmpty()) {
      String url = externalOrganizationServiceUrl.replaceAll("/$", "") + "/"
          + "hierarkia/hae?aktiiviset=true&suunnitellut=false&lakkautetut=false&oid=" + oid;

      logger.debug("Retrieving suborganizations information from {}", url);

      String responseBody = restClient.get()
          .uri(url)
          .accept(MediaType.APPLICATION_JSON)
          .retrieve()
          .body(String.class);

      ObjectMapper mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
      OrganizationDTO organization = mapper.readValue(responseBody, OrganizationDTO.class);
      if (organization != null && !organization.getOrganizations().isEmpty()) {
        return organization.getOrganizations().get(0);
      } else {
        logger.debug("No organizations found.");
      }
    }
    return null;
  }

  /**
   * Returns a cached Organization object by id (oid) from the
   * repository
   * 
   * @param id oid
   * @return the organization identified by the specified id
   */
  public Organization getById(String id) {
    return organizationRepository.getByOidOrBusinessId(id, id);
  }

  public Organization saveOrganization(Organization organization) {
    return organizationRepository.save(organization);
  }
}
