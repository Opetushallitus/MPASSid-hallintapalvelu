package fi.mpass.voh.api.integration;

import java.util.Set;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.ManyToMany;

@Entity
public class IntegrationGroup {
    
    @Id
    private Long id;

    private String name;

    @ManyToMany(mappedBy = "integrationGroups", cascade = { CascadeType.REFRESH, CascadeType.MERGE })
    Set<Integration> integrations;
    
    public IntegrationGroup() {
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }
}