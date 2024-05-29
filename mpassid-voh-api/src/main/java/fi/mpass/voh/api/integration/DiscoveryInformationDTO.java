package fi.mpass.voh.api.integration;

import java.util.Set;

public class DiscoveryInformationDTO {

    private Set<String> existingExcluded;
    private Set<String> existingIncluded;

    public DiscoveryInformationDTO() {}

    public DiscoveryInformationDTO(Set<String> excludes, Set<String> includes) {
        this.existingExcluded = excludes;
        this.existingIncluded = includes;
    }

    public Set<String> getExistingExcluded() {
        return existingExcluded;
    }

    public void setExistingExcluded(Set<String> excluded) {
        this.existingExcluded = excluded;
    }

    public Set<String> getExistingIncluded() {
        return existingIncluded;
    }

    public void setExistingIncluded(Set<String> included) {
        this.existingIncluded = included;
    }
}
