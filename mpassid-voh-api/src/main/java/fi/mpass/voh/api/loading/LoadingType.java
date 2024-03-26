package fi.mpass.voh.api.loading;

public enum LoadingType {
    ALL(0), IDP(1), SP(2), SET(3);

    private Integer code;

    private LoadingType(Integer code) { 
        this.code = code;
    }

    public Integer getCode() {
        return code;
    }
}