package fi.mpass.voh;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Profile("!dev")
@Configuration
@RequiredArgsConstructor
class WebMvcConfig implements WebMvcConfigurer {  
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // single element level, no need to exclude i.e. "api"
        registry.addViewController("/{x:\\w+}")
                .setViewName("forward:/index.html");
        // multi-level element path, excluding paths starting with "api", "v3", "index.html", or "assets"
        registry.addViewController("/{x:(?!api|v3|index\\.html|assets|swagger-ui).*}/{*path}")
                .setViewName("forward:/index.html");
    }
}