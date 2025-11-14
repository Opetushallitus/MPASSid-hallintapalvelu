package fi.mpass.voh.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecuritySchemes;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "MPASSid virkailijan opintopolun hallintapalvelu",
                version = "2.6.1",
                description = "",
                license = @License(name = "EUPL Version 1.1", url = "http://www.osor.eu/eupl/")),
                // contact = @Contact(url = "https://", name = "support", email = "")
                security = {@SecurityRequirement(name = "cas"), @SecurityRequirement(name = "basic")}
        ,
        servers = { @Server(url = "/mpassid") }
)
@SecuritySchemes({
        @SecurityScheme(name = "provisioning", scheme = "basic", type = SecuritySchemeType.HTTP, in = SecuritySchemeIn.HEADER),
        @SecurityScheme(name = "loading", scheme = "basic", type = SecuritySchemeType.HTTP, in = SecuritySchemeIn.HEADER)
})
public class OpenAPIConfig {     
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI();    
    }
}
