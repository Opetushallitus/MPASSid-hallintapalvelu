package fi.mpass.voh.api.exception;

public class LoadingException extends RuntimeException {

    public LoadingException(String errorMessage) {
        super(errorMessage);
    }

    public LoadingException(String errorMessage, Throwable err) {
        super(errorMessage, err);
    }
}
