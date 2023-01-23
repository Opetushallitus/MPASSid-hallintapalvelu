package fi.mpass.voh;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.info.License;

@OpenAPIDefinition(
        info = @Info(
                title = "MPASSid virkailijan opintopolun hallintapalvelu",
                version = "0.1",
                description = "",
                license = @License(name = "EUPL Version 1.1", url = "http://www.osor.eu/eupl/")
                // contact = @Contact(url = "https://", name = "support", email = "")
        ),
        servers = { @Server(url = "https://virkailija.testiopintopolku.fi/mpassid"), @Server(url = "https://localhost:8081") }
)

@SpringBootApplication
public class VOHApplication {

	public static void main(String[] args) {
		SpringApplication.run(VOHApplication.class, args);
	}
}
