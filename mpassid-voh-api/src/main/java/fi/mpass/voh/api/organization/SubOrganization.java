package fi.mpass.voh.api.organization;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SubOrganization extends Organization { 
    
    @JsonProperty("oppilaitostyyppi")
    private String institutionType;
    
    @JsonProperty("oppilaitosKoodi")
    private String institutionCode;

    @JsonProperty("organisaatiotyypit")
    private List<String> organizationTypes;

    public SubOrganization() { }

    public SubOrganization(String name, String oid) {
        super(name, oid);
    }

    public String getInstitutionCode() {
        return institutionCode;
    }

    public void setInstitutionCode(String code) {
        this.institutionCode = code;
    }

    public List<String> getOrganizationTypes() {
        return organizationTypes;
    }

    public void setOrganizationTypes(List<String> types) {
        this.organizationTypes = types;
    }

    public String getInstitutionType() {
        return institutionType;
    }

    public void setInstitutionType(String type) {
        this.institutionType = type;
    }
}
