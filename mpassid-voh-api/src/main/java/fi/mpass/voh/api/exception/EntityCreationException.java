package fi.mpass.voh.api.exception;

public class EntityCreationException extends RuntimeException {

    public EntityCreationException(String errorMessage) {
        super(errorMessage);
    }

    public EntityCreationException(String errorMessage, Throwable err) {
        super(errorMessage, err);
    }
}
