package fi.mpass.voh.api.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Order(Ordered.HIGHEST_PRECEDENCE)
@ControllerAdvice
public class IntegrationExceptionHandler extends ResponseEntityExceptionHandler {
     /**
     * Handles EntityNotFoundException. Complements javax.persistence.EntityNotFoundException.
     *
     * @param ex the EntityNotFoundException
     * @return the IntegrationError object
     */
    @ExceptionHandler(EntityNotFoundException.class)
    protected ResponseEntity<Object> handleEntityNotFound(EntityNotFoundException ex) {
        IntegrationError integrationError = new IntegrationError(NOT_FOUND);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }

    private ResponseEntity<Object> buildResponseEntity(IntegrationError integrationError) {
        return new ResponseEntity<>(integrationError, integrationError.getStatus());
    }
}
