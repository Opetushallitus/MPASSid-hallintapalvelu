package fi.mpass.voh.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;

import fi.mpass.voh.api.integration.attribute.AttributeValidator;

import static org.junit.jupiter.api.Assertions.assertEquals;
// import static org.mockito.ArgumentMatchers.any;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
// import org.mockito.Mock;
import org.mockserver.client.MockServerClient;
import org.mockserver.model.HttpStatusCode;
import org.mockserver.model.MediaType;
import org.mockserver.model.Parameter;
import org.mockserver.springtest.MockServerTest;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

@SpringBootTest
@MockServerTest("server.url=http://localhost:${mockServerPort}")
class AttributeValidatorTests {

  @Value("${server.url}")
  private String serverUrl;

  private MockServerClient mockServerClient;

  private AttributeValidator underTest;

  @BeforeEach
  void setUp() {
    underTest = new AttributeValidator(serverUrl + "/", serverUrl + "/",
        "/oauth2/v2.0/token", "https://graph.microsoft.com/.default",
        "v1.0/users/");
  }

  @Test
  void testGetToken() throws IOException {

    final var resource = new ClassPathResource("test_token.json");
    final var mockedResponse = Files.readString(Path.of(resource.getURI()));
    final var testUrl = new String("/tenantId12345/oauth2/v2.0/token");

    mockServerClient
        .when(request().withMethod("POST").withPath(testUrl))
        .respond(response().withContentType(MediaType.APPLICATION_JSON)
            .withStatusCode(HttpStatusCode.OK_200.code())
            .withBody(mockedResponse));

    // when - action or the behaviour that we are going test
    String token = underTest.getToken("clientId", "clientSecret", "tenantId12345");

    // then - verify the output
    assertEquals(
        "eyJ0eXAiOiJKV1QJTURQb1MtSENFY2NJWkRoNG1SV2xQd29PMjhIeWMiLCJhbGciOiJSUzIiLCJub25jg1dCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSIsImtpZCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSJ9.eyJhdWQiOiJodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC81YmM1Njg5ZC0yY2Y4LTQ3OWItYTY3NC0zZGY2ZDc3YzViYzAvIiwiaWF0IjoxNzExNDQzNTgxLCJuYmYiOjE3MTE0NDM1ODEsImV4cCI6MTcxMTQ0NzQ4MSwiYWlvIjoiRTJOZ1lMaTc2TEdXYS9rMWpvY1RvbXcyTFY3VUFRQT0iLCJhcHBfZGlzcGxheW5hbWUiOiJNUEFTU2lkRnJvbUdVSSIsImFwcGlkIjoiZTg2ZWUwOGYtMjA2OS00ODgyLThjNmEtNWY4Yzc2Yjg1NDlkIiwiYXBwaWRhY3IiOiIxIiwiaWRwIjoiaHR0cHM6Ly9zdHMud2luZG93cy5uZXQvNWJjNTY4OWQtMmNmOC00NzliLWE2NzQtM2RmNmQ3N2M1YmMwLyIsImlkdHlwIjoiYXBwIiwib2lkIjoiMWZmZGVhNTgtZjNlYy00YjY0LWIyYTUtNjRkMzE1MmZiMmNiIiwicmgiOiIwLkFZSUFuV2pGV19nc20wZW1kRDMyMTN4YndBTUFBQUFBQUFBQXdBQUFBQUFBQUFDQ0FBQS4iLCJyb2xlcyI6WyJHcm91cC5SZWFkLkFsbCIsIkRpcmVjdG9yeS5SZWFkV3JpdGUuQWxsIiwiR3JvdXAuUmVhZFdyaXRlLkFsbCIsIkRpcmVjdG9yeS5SZWFkLkFsbCIsIlVzZXIuUmVhZC5BbGwiLCJHcm91cE1lbWJlci5SZWFkLkFsbCIsIkdyb3VwTWVtYmVyLlJlYWRXcml0ZS5BbGwiXSwic3ViIjoiMWZmZGVhNTgtZjNlYy00YjY0LWIyYTUtNjRkMzE1MmZiMmNiIiwidGVuYW50X3JlZ2lvbl9zY29wZSI6IkVVIiwidGlkIjoiNWJjNTY4OWQtMmNmOC00NzliLWE2NzQtM2RmNmQ3N2M1YmMwIiwidXRpIjoibGhCZDg0SGVjMC1ybnVzR2Z2OWVBQSIsInZlciI6IjEuMCIsIndpZHMiOlsiMDk5N2ExZDAtMGQxZC00YWNiLWI0MDgtZDVjYTczMTIxZTkwIl0sInhtc190Y2R0IjoxMzgyNzA2NjI4LCJ4bXNfdGRiciI6IkVVIn0.qLzcKc9meGj-s703yjdlRGh8PV804EPWxaeSCBxFRgsckTb8SWPSdswQxIvGyxh5J4FF0_8nc9pf6IwwnPibJHDWq2HlOZCIJXdCAXXUXOA52FGIq4q29aI_m21T9lI6zot_9zvkMKbg_xEahBtEqgBuMBJl6Dm53a-k0wPz-9-knZcJx2AGFJ6voYleaxZA86zva9H_wTuvfZfaA67Oirhul5UFvBGKXa1ihm3QsBmqB3aClB8yk50fYlT5iHHMxOFA2eC2zS4vm6iHfJiZJZWYlhkxd58tQBgub5zsJxNQKOTcQs2_XLZSI6InBXTUp0TjdjSERQaGd1NiIsInzstXI-hp62rCZReILp655XdW0ziMZKxw",
        token);
  }

  @Test
  void testGetUserEntity() throws IOException {

    final var resource = new ClassPathResource("test_user_entity.json");
    final var mockedResponse = Files.readString(Path.of(resource.getURI()));
    final var testUrl = new String("/v1.0/users/principalName1");
    final var selectedAttributesList = List.of("api://e86ee08f-2069-4882-8c6a-5f8c76b8549d", "givenName", "surname", "displayName", "learnerId");
    /*Map<String, List<String>> selectParameter = new HashMap<String, List<String>>() {
      {
        put("select", selectedAttributes);
      }
    };*/
    //final var selectedAttributes = "api%3A%2F%2Fe86ee08f-2069-4882-8c6a-5f8c76b8549d,givenName,surname,displayName,learnerId";
    final var selectedAttributes = "api://e86ee08f-2069-4882-8c6a-5f8c76b8549d,givenName,surname,displayName,learnerId";
    /*Map<String, String> selectParameter = new HashMap<String, String>() {
      {
        put("select", selectedAttributes);
      }
    };*/
    Parameter select = new Parameter("$select", selectedAttributes);

    mockServerClient
        .when(request().withMethod("GET").withPath(testUrl).withQueryStringParameters(select))
        .respond(response().withContentType(MediaType.APPLICATION_JSON)
            .withStatusCode(HttpStatusCode.OK_200.code())
            .withBody(mockedResponse));

    // when - action or the behaviour that we are going test
    Map<String, Object> attributeMapping = underTest.getUserEntity(
        "eyJ0eXAiOiJKV1QJTURQb1MtSENFY2NJWkRoNG1SV2xQd29PMjhIeWMiLCJhbGciOiJSUzIiLCJub25jg1dCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSIsImtpZCI6IlhSdmtvOFA3QTNVYVdTblU3Yk05blQwTWpoQSJ9",
        "principalName1", selectedAttributesList);

    // then - verify the output
    assertEquals("Aku", attributeMapping.get("givenName"));
  }
}