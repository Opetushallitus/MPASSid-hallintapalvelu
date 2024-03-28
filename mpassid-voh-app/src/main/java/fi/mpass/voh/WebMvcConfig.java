package fi.mpass.voh;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Profile({ "dev", "test", "prod" })
@Configuration
class WebMvcConfig implements WebMvcConfigurer {

    public WebMvcConfig() {}

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/", "/index.html");
        registry.addRedirectViewController("/{x:(?!api|v3|index\\.html|assets|swagger-ui).*}/{*path}", "/");
    }
}