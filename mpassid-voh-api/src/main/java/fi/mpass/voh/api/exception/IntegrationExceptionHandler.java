package fi.mpass.voh.api.exception;

import java.util.Arrays;
import java.util.List;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.firewall.RequestRejectedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@Order(Ordered.HIGHEST_PRECEDENCE)
@ControllerAdvice
public class IntegrationExceptionHandler extends ResponseEntityExceptionHandler {
    /**
     * Handles EntityNotFoundException. Complements
     * javax.persistence.EntityNotFoundException.
     *
     * @param ex the EntityNotFoundException
     * @return the IntegrationError object
     */
    @ExceptionHandler(EntityNotFoundException.class)
    protected ResponseEntity<Object> handleEntityNotFound(EntityNotFoundException ex, WebRequest request) {
        List<String> acceptableMimeTypes = Arrays.asList(request.getHeaderValues(HttpHeaders.ACCEPT));
        if (acceptableMimeTypes.contains(MediaType.APPLICATION_OCTET_STREAM_VALUE)) {
            return ResponseEntity.notFound()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE)
                    .build();
        }
        IntegrationError integrationError = new IntegrationError(HttpStatus.NOT_FOUND);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }

    /**
     * Handles EntityInactivationException.
     * 
     * @param ex the EntityInactivationException
     * @return the IntegrationError object
     */
    @ExceptionHandler(EntityInactivationException.class)
    protected ResponseEntity<Object> handleEntityInactivation(EntityInactivationException ex) {
        IntegrationError integrationError = new IntegrationError(HttpStatus.CONFLICT);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }

    /**
     * Handles EntityCreationException.
     * 
     * @param ex the EntityCreationException
     * @return the IntegrationError object
     */
    @ExceptionHandler(EntityCreationException.class)
    protected ResponseEntity<Object> handleEntityCreation(EntityCreationException ex) {
        IntegrationError integrationError = new IntegrationError(HttpStatus.CONFLICT);
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
     * Handles LoadingException.
     * 
     * @param ex the EntityUpdateException
     * @return the IntegrationError object
     */
    @ExceptionHandler(LoadingException.class)
    protected ResponseEntity<Object> handleLoading(LoadingException ex) {
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

    /**
     * Handles InvalidDataAccessApiUsageException.
     *
     * @param ex the InvalidDataAccessApiUsageException
     * @return the IntegrationError object
     */
    @ExceptionHandler(InvalidDataAccessApiUsageException.class)
    protected ResponseEntity<Object> handleInvalidData(InvalidDataAccessApiUsageException ex) {
        IntegrationError integrationError = new IntegrationError(HttpStatus.BAD_REQUEST);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }

    /**
     * Handles RequestRejectedException.
     *
     * @param ex the RequestRejectedException.
     * @return the IntegrationError object
     */
    @ExceptionHandler(RequestRejectedException.class)
    protected ResponseEntity<Object> handleRejectedRequest(RequestRejectedException ex) {
        IntegrationError integrationError = new IntegrationError(HttpStatus.BAD_REQUEST);
        integrationError.setMessage(ex.getMessage());
        return buildResponseEntity(integrationError);
    }
}
