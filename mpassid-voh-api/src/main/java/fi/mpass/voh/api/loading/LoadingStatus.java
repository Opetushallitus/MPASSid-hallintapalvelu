package fi.mpass.voh.api.loading;

public enum LoadingStatus {
    STARTED(0), LOADING(1), SUCCEEDED(2), FAILED(3);

    private Integer code;

    private LoadingStatus(Integer code) { 
        this.code = code;
    }

    public Integer getCode() {
        return code;
    }
}