package fi.mpass.voh.api.exception;

public class EntityUpdateException extends RuntimeException {

    public EntityUpdateException(String errorMessage) {
        super(errorMessage);
    }

    public EntityUpdateException(String errorMessage, Throwable err) {
        super(errorMessage, err);
    }
}
