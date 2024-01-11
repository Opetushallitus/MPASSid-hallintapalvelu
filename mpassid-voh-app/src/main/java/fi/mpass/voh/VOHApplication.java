package fi.mpass.voh;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.envers.repository.support.EnversRevisionRepositoryFactoryBean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

@OpenAPIDefinition(
        info = @Info(
                title = "MPASSid virkailijan opintopolun hallintapalvelu",
                version = "2.0.0",
                description = "",
                license = @License(name = "EUPL Version 1.1", url = "http://www.osor.eu/eupl/")
                // contact = @Contact(url = "https://", name = "support", email = "")
        ),
        servers = { @Server(url = "/mpassid") }
)
@SecurityScheme(name = "provisioning", scheme = "basic", type = SecuritySchemeType.HTTP, in = SecuritySchemeIn.HEADER)

@SpringBootApplication
@EnableJpaRepositories(repositoryFactoryBeanClass = EnversRevisionRepositoryFactoryBean.class)
public class VOHApplication {

	public static void main(String[] args) {
		SpringApplication.run(VOHApplication.class, args);
	}
}
