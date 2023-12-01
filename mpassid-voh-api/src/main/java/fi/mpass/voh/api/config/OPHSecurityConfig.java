package fi.mpass.voh.api.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.method.configuration.GlobalMethodSecurityConfiguration;

import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.OPHPermissionEvaluator;

@Configuration
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class OPHSecurityConfig extends GlobalMethodSecurityConfiguration {

  @Autowired
  private IntegrationRepository integrationRepository;
  
  @Bean
  public OPHPermissionEvaluator ophPermissionEvaluator() {
    return new OPHPermissionEvaluator(integrationRepository);
  }

  @Override
  protected MethodSecurityExpressionHandler createExpressionHandler() {
    DefaultMethodSecurityExpressionHandler expressionHandler = new DefaultMethodSecurityExpressionHandler();
    expressionHandler.setPermissionEvaluator(ophPermissionEvaluator());
    return expressionHandler;
  }
}
