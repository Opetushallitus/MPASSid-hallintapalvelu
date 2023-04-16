package fi.mpass.voh.api.exception;

public class EntityNotFoundException extends RuntimeException {

    public EntityNotFoundException(String errorMessage) {
        super(errorMessage);
    }
    public EntityNotFoundException(String errorMessage, Throwable err) {
        super(errorMessage, err);
    }
}
