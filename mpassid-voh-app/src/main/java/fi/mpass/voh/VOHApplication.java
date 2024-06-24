package fi.mpass.voh;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.envers.repository.support.EnversRevisionRepositoryFactoryBean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import fi.mpass.voh.api.config.IntegrationServiceConfiguration;

@SpringBootApplication
@EnableJpaRepositories(repositoryFactoryBeanClass = EnversRevisionRepositoryFactoryBean.class)
@EnableConfigurationProperties(value = IntegrationServiceConfiguration.class)
public class VOHApplication {

	public static void main(String[] args) {
		SpringApplication.run(VOHApplication.class, args);
	}
}
