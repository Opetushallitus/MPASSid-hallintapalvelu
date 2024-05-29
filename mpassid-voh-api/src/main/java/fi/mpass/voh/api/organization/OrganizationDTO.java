package fi.mpass.voh.api.organization;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class OrganizationDTO {
 
    private int numHits;
    @JsonProperty("organisaatiot")
    private List<Organization> organizations;
    
    public List<Organization> getOrganizations() {
        return organizations;
    }
    public void setOrganizations(List<Organization> organizations) {
        this.organizations = organizations;
    }
}
