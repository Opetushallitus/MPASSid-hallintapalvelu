package fi.mpass.voh.api.exception;

public class SecretSavingException extends RuntimeException {

    public SecretSavingException(String errorMessage) {
        super(errorMessage);
    }

    public SecretSavingException(String errorMessage, Throwable err) {
        super(errorMessage, err);
    }
}
