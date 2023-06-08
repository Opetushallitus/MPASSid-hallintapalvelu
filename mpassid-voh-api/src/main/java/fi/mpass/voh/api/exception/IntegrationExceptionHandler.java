package fi.mpass.voh.api.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

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
        IntegrationError integrationError = new IntegrationError(HttpStatus.NOT_FOUND);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }

    /**
     * Handles EntityUpdateException.
     * 
     * @param ex the EntityUpdateException
     * @return the IntegrationError object
     */
    @ExceptionHandler(EntityUpdateException.class)
    protected ResponseEntity<Object> handleEntityUpdate(EntityUpdateException ex) {
        IntegrationError integrationError = new IntegrationError(HttpStatus.CONFLICT);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }

     /**
     * Handles MethodArgumentTypeMismatchException.
     *
     * @param ex the MethodArgumentTypeMismatchException
     * @return the IntegrationError object
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<Object> handleEntityNotFound(MethodArgumentTypeMismatchException ex) {
        IntegrationError integrationError = new IntegrationError(HttpStatus.BAD_REQUEST);
        integrationError.setMessage(ex.getMessage() + ". Please refer to the api documentation.");
        return buildResponseEntity(integrationError);
    }

    private ResponseEntity<Object> buildResponseEntity(IntegrationError integrationError) {
        return new ResponseEntity<>(integrationError, integrationError.getStatus());
    }
}
