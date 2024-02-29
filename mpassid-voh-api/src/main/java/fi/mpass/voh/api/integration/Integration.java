package fi.mpass.voh.api.integration;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.Version;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;
import org.springframework.data.domain.Persistable;

import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonView;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import fi.mpass.voh.api.config.IntegrationView;
import fi.mpass.voh.api.organization.Organization;
import io.swagger.v3.oas.annotations.media.Schema;

@Audited
@Entity
@JsonInclude(Include.NON_NULL)
public class Integration implements Persistable<Long> {
    @Id
    private Long id;

    @Version
    private int version;

    @CreationTimestamp
    // private java.sql.Timestamp createdOn;
    private LocalDateTime createdOn;

    @UpdateTimestamp
    // private java.sql.Timestamp lastUpdatedOn;
    private LocalDateTime lastUpdatedOn;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "configuration_entity_id", referencedColumnName = "id")
    private ConfigurationEntity configurationEntity;

    // Defaults to no operations being cascaded
    @ManyToOne(fetch = FetchType.EAGER)
    @NotAudited
    @JoinColumn(name = "organization_oid", referencedColumnName = "oid")
    private Organization organization;

    @JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
    @JsonIgnoreProperties("integrationSets")
    // @ManyToMany(cascade = { CascadeType.REFRESH, CascadeType.MERGE, CascadeType.PERSIST }, fetch = FetchType.EAGER)
    @ManyToMany(cascade = { CascadeType.REFRESH, CascadeType.PERSIST }, fetch = FetchType.EAGER)
    @Audited
    @JoinTable(name = "integrationsSets", joinColumns = @JoinColumn(name = "integration_id", referencedColumnName = "id"), inverseJoinColumns = @JoinColumn(name = "integration_set_id", referencedColumnName = "id"))
    private Set<Integration> integrationSets = new HashSet<Integration>();

    @JsonManagedReference
    // TODO cascade review
    @OneToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "discovery_information_id", referencedColumnName = "id")
    // @JsonView(value = IntegrationView.Excluded.class)
    private DiscoveryInformation discoveryInformation;

    /* empty permissions list indicates all permissions */
    @JsonManagedReference
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    @OneToMany(mappedBy = "from", cascade = { CascadeType.ALL }, orphanRemoval = true)
    @OrderBy("id")
    private List<IntegrationPermission> permissions = new ArrayList<IntegrationPermission>();

    // @JsonView(value = IntegrationView.Default.class)
    @Schema(description = "0:testing, 1:production, 2:preproduction, 3:reserved")
    private int deploymentPhase;
    @Schema(description = "0:active, 1:inactive")
    @JsonIgnore
    private int status;
    // @JsonView(value = IntegrationView.Excluded.class)
    private LocalDate deploymentDate;
    // @JsonView(value = IntegrationView.Excluded.class)
    private LocalDate acceptanceDate;

    private String serviceContactAddress;

    public Integration() {
    }

    public Integration(Long id) {
        this.id = id;
    }

    public Integration(ConfigurationEntity configurationEntity) {
        this.configurationEntity = configurationEntity;
    }

    public Integration(ConfigurationEntity configurationEntity,
            DiscoveryInformation discoveryInformation) {
        this.configurationEntity = configurationEntity;
        this.discoveryInformation = discoveryInformation;
    }

    public Integration(ConfigurationEntity configurationEntity,
            DiscoveryInformation discoveryInformation, Organization organization) {
        this.configurationEntity = configurationEntity;
        this.discoveryInformation = discoveryInformation;
        this.organization = organization;
    }

    public Integration(Long id, LocalDate acceptanceDate, ConfigurationEntity configurationEntity,
            LocalDate deploymentDate, int deploymentPhase,
            DiscoveryInformation discoveryInformation, Organization organization, String serviceContactAddress) {
        this.id = id;
        this.acceptanceDate = acceptanceDate;
        this.configurationEntity = configurationEntity;
        this.deploymentDate = deploymentDate;
        this.deploymentPhase = deploymentPhase;
        this.discoveryInformation = discoveryInformation;
        this.organization = organization;
        this.serviceContactAddress = serviceContactAddress;
    }

    @Override
    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @JsonIgnore
    @Override
    public boolean isNew() {
        return this.id == null;
    }

    public int getVersion() {
        return this.version;
    }

    //public java.sql.Timestamp getLastUpdatedOn() {
    public LocalDateTime getLastUpdatedOn() {
        return this.lastUpdatedOn;
    }

    //public void setLastUpdatedOn(java.sql.Timestamp ts) {
    public void setLastUpdatedOn(LocalDateTime ts) {
        if (ts != null) {
            this.lastUpdatedOn = ts;
        }
    }

    public ConfigurationEntity getConfigurationEntity() {
        return this.configurationEntity;
    }

    public void setConfigurationEntity(ConfigurationEntity configurationEntity) {
        this.configurationEntity = configurationEntity;
    }

    /**
     * Gets the deployment phase.
     * 
     * @return The {@link int} representing the deployment phase.
     *         0 testing, 1 production, 2 preproduction, 3 reserved
     */
    public int getDeploymentPhase() {
        return this.deploymentPhase;
    }

    public void setDeploymentPhase(int deploymentPhase) {
        this.deploymentPhase = deploymentPhase;
    }

    /**
     * Gets integration status
     * 
     * @return The {@link int} representing the integration status.
     *         0 active, 1 inactive
     */
    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public boolean isActive() {
        return status == 0;
    }

    public Organization getOrganization() {
        return this.organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public DiscoveryInformation getDiscoveryInformation() {
        return this.discoveryInformation;
    }

    public void setDiscoveryInformation(DiscoveryInformation discoveryInformation) {
        this.discoveryInformation = discoveryInformation;
    }

    public LocalDate getDeploymentDate() {
        return this.deploymentDate;
    }

    public void setDeploymentDate(LocalDate deploymentDate) {
        this.deploymentDate = deploymentDate;
    }

    public LocalDate getAcceptanceDate() {
        return this.acceptanceDate;
    }

    public void setAcceptanceDate(LocalDate acceptanceDate) {
        this.acceptanceDate = acceptanceDate;
    }

    public String getServiceContactAddress() {
        return this.serviceContactAddress;
    }

    public void setServiceContactAddress(String serviceContactAddress) {
        this.serviceContactAddress = serviceContactAddress;
    }

    public void addPermissionTo(Integration integration) {
        IntegrationPermission permission = new IntegrationPermission(this, integration);
        if (!permissions.contains(permission)) {
            permissions.add(permission);
        }
    }

    public List<IntegrationPermission> getPermissions() {
        return this.permissions;
    }

    public void setPermissions(List<IntegrationPermission> permissions) {
        this.permissions = permissions;
    }

    public void removePermissionTo(Integration integration) {
        for (Iterator<IntegrationPermission> iterator = permissions.iterator(); iterator.hasNext();) {
            IntegrationPermission permission = iterator.next();

            if (permission.getFrom().equals(this) && permission.getTo().equals(integration)) {
                iterator.remove();
                permission.setFrom(null);
                permission.setTo(null);
            }
        }
    }

    public void removePermissions() {
        for (Iterator<IntegrationPermission> iterator = permissions.iterator(); iterator.hasNext();) {
            IntegrationPermission permission = iterator.next();

            if (permission.getFrom().equals(this)) {
                iterator.remove();
                permission.setFrom(null);
                permission.setTo(null);
            }
        }
    }

    /**
     * associates this Integration to the given IntegrationSet
     * if it doesn't already exist in the set
     */
    public void addToSet(Integration integrationSet) {
        boolean backwardExists = false;
        for (Iterator<Integration> integrationBackIterator = integrationSet.getIntegrationSets()
                .iterator(); integrationBackIterator.hasNext();) {
            if (integrationBackIterator.next().getId().equals(this.getId())) {
                backwardExists = true;
                break;
            }
        }
        if (!backwardExists) {
            integrationSet.getIntegrationSets().add(this);
        }

        boolean forwardExists = false;
        for (Iterator<Integration> integrationIterator = this.getIntegrationSets()
                .iterator(); integrationIterator.hasNext();) {
            if (integrationIterator.next().getId().equals(this.getId())) {
                forwardExists = true;
                break;
            }
        }
        if (!forwardExists) {
            this.integrationSets.add(integrationSet);
        }
    }

    public List<Integration> removeFromSets() {
        // if the integration is currently associated with the
        // integrationSet, remove the association
        List<Integration> removedSets = new ArrayList<Integration>();
        for (Iterator<Integration> integrationIterator = this.getIntegrationSets()
                .iterator(); integrationIterator.hasNext();) {
            Integration set = integrationIterator.next();
            for (Iterator<Integration> integrationSetIterator = set.getIntegrationSets()
                    .iterator(); integrationSetIterator.hasNext();) {
                Integration thisIntegration = integrationSetIterator.next();
                if (thisIntegration.getId().equals(this.getId())) {
                    integrationSetIterator.remove();
                    removedSets.add(set);
                }
            }
            integrationIterator.remove();
        }
        return removedSets;
    }

    public Set<Integration> getIntegrationSets() {
        return this.integrationSets;
    }

    @JsonIgnore
    public List<Integration> getIntegrationSetsList() {
        List<Integration> integrationSetsList = this.integrationSets.stream().collect(Collectors.toList());
        Collections.sort(integrationSetsList, Comparator.comparing(i -> i.getId()));
        return integrationSetsList;
    }

    public void sortPermissionsByLastUpdatedOn() {
        Collections.sort(permissions, Comparator.comparing(p -> p.getLastUpdatedOn()));   
    }
}
