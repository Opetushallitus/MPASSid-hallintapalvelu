package fi.mpass.voh.api.exception;

public class EntityInactivationException extends RuntimeException {

    public EntityInactivationException(String errorMessage) {
        super(errorMessage);
    }

    public EntityInactivationException(String errorMessage, Throwable err) {
        super(errorMessage, err);
    }
}
