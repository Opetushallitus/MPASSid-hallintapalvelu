package fi.mpass.voh.api.config;

import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Role;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.expression.method.MethodSecurityExpressionHandler;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.method.configuration.GlobalMethodSecurityConfiguration;

import fi.mpass.voh.api.integration.OPHPermissionEvaluator;

@Configuration
@Role(BeanDefinition.ROLE_INFRASTRUCTURE)
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class OPHSecurityConfig extends GlobalMethodSecurityConfiguration {

    @Override
    protected MethodSecurityExpressionHandler createExpressionHandler() {
        DefaultMethodSecurityExpressionHandler expressionHandler = 
          new DefaultMethodSecurityExpressionHandler();
        expressionHandler.setPermissionEvaluator(new OPHPermissionEvaluator());
        return expressionHandler;
    }
}
