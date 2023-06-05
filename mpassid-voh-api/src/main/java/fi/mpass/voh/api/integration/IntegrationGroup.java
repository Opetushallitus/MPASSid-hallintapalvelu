package fi.mpass.voh.api.integration;

import java.util.Set;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;

@Entity
public class IntegrationGroup {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @OneToMany(mappedBy = "integrationGroup")
    private Set<Integration> integrations;
    
    public IntegrationGroup() {
    }
}