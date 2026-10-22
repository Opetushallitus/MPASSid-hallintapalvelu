package fi.mpass.voh.api;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.zip.GZIPOutputStream;

import org.junit.jupiter.api.Test;
import org.mockserver.client.MockServerClient;
import org.mockserver.model.HttpStatusCode;
import org.mockserver.model.MediaType;
import org.mockserver.springtest.MockServerTest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;

import com.sun.net.httpserver.HttpServer;

import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;

@SpringBootTest
@MockServerTest("server.url=http://localhost:${mockServerPort}")
class MetadataProviderTests {

    @Value("${server.url}")
    private String serverUrl;

    private MockServerClient mockServerClient;

    /**
     * Exercises SamlMetadataProvider to retrieve (mocked) SAML metadata through an url and to extract
     * a valid until date from the SAML metadata.
     * 
     * @throws Exception
     */
    @Test
    void validSAMLMetadata() throws Exception {
        // TODO throws exception
        
        // shib_viikki
        final var resource = new ClassPathResource("test_saml_metadata.xml");
        final var mockedResponse = Files.readString(Path.of(resource.getURI()));
        final var testUrl = new String("/test_metadata_url");
        
        mockServerClient
                .when(request().withMethod("GET").withPath(testUrl))
                .respond(response()
                        .withContentType(MediaType.APPLICATION_XML_UTF_8)
                        .withStatusCode(HttpStatusCode.OK_200.code())
                        .withBody(mockedResponse));
        
        SamlMetadataProvider mp = new SamlMetadataProvider(serverUrl + testUrl);

        assertEquals(LocalDate.of(2027,10,02), mp.getSigningCertificateValidUntil());
    }

    /**
     * Like Entra ID, the server gzips the metadata when the client accepts it. httpclient5 5.6.x keeps the
     * compressed Content-Length after decompression, which used to truncate the metadata to the compressed
     * size, so that it could not be parsed.
     *
     * @throws Exception
     */
    @Test
    void gzipCapableServerSAMLMetadata() throws Exception {
        final var resource = new ClassPathResource("test_saml_metadata.xml");
        final byte[] metadata = Files.readAllBytes(Path.of(resource.getURI()));
        final var compressed = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(compressed)) {
            gzip.write(metadata);
        }
        final byte[] gzippedMetadata = compressed.toByteArray();

        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/federationmetadata.xml", exchange -> {
            String acceptEncoding = exchange.getRequestHeaders().getFirst("Accept-Encoding");
            boolean gzip = acceptEncoding != null && acceptEncoding.contains("gzip");
            byte[] body = gzip ? gzippedMetadata : metadata;
            exchange.getResponseHeaders().set("Content-Type", "text/xml; charset=utf-8");
            if (gzip) {
                exchange.getResponseHeaders().set("Content-Encoding", "gzip");
            }
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();
        try {
            SamlMetadataProvider mp = new SamlMetadataProvider(
                    "http://localhost:" + server.getAddress().getPort() + "/federationmetadata.xml");

            assertEquals("https://sts.windows.net/3f066e8c-8395-4a1c-adc6-84baed0e079e/", mp.getEntityId());
            assertEquals(LocalDate.of(2027,10,02), mp.getSigningCertificateValidUntil());
        } finally {
            server.stop(0);
        }
    }
}
