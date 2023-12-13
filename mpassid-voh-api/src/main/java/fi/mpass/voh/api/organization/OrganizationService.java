package fi.mpass.voh.api.organization;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;

import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@PropertySource("classpath:organization.properties")
public class OrganizationService {
  private final static Logger logger = LoggerFactory.getLogger(OrganizationService.class);

  private String externalOrganizationServiceUrl;

  private final OrganizationRepository organizationRepository;

  public OrganizationService(OrganizationRepository organizationRepository,
      @Value("${organization.service.url:https://virkailija.opintopolku.fi/organisaatio-service/api/}") String url) {
    this.organizationRepository = organizationRepository;
    this.externalOrganizationServiceUrl = url;
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
  public Organization retrieveOrganization(String id)
      throws JsonProcessingException, JsonMappingException, WebClientResponseException {

    String url = externalOrganizationServiceUrl.replaceAll("/$", "") + "/";

    logger.debug("Retrieving organization information from " + url);

    WebClient client = WebClient.create();
    WebClient.ResponseSpec response = client.get()
        .uri(url + id)
        .retrieve();

    String responseBody = response.bodyToMono(String.class).block();

    ObjectMapper mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    Organization organization = mapper.readValue(responseBody, Organization.class);

    return organization;
  }

  /**
   * Returns a cached Organization object by id (oid or businessId) from the
   * repository
   * 
   * @param id oid or businessId
   * @return the organization identified by the specified id
   */
  public Organization getById(String id) {
    //return organizationRepository.getByOidOrBusinessId(id, id);
    return organizationRepository.getByOid(id);
  }

  public Organization saveOrganization(Organization organization) {
    return organizationRepository.save(organization);
  }
}
