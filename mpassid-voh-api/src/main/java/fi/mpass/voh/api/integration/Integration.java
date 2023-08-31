package fi.mpass.voh.api.integration;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.Version;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonView;

import fi.mpass.voh.api.config.IntegrationView;
import fi.mpass.voh.api.organization.Organization;

@Audited
@Entity
public class Integration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Version
    private int version;

    @CreationTimestamp
    private java.sql.Timestamp createdOn;

    @UpdateTimestamp
    private java.sql.Timestamp lastUpdatedOn;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "configuration_entity_id", referencedColumnName = "id")
    private ConfigurationEntity configurationEntity;

    // Defaults to no operations being cascaded
    @ManyToOne(fetch = FetchType.EAGER)
    @NotAudited
    @JoinColumn(name = "organization_oid", referencedColumnName = "oid")
    private Organization organization;

    @ManyToMany(cascade = { CascadeType.REFRESH, CascadeType.MERGE })
    @Audited
    @JoinTable(name = "integrationsGroups", joinColumns = @JoinColumn(name = "integration_id", referencedColumnName = "id"), inverseJoinColumns = @JoinColumn(name = "integration_group_id", referencedColumnName = "id"))
    private Set<IntegrationGroup> integrationGroups = new HashSet<>();

    @JsonManagedReference
    // TODO cascade review
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "discovery_information_id", referencedColumnName = "id")
    @JsonView(value = IntegrationView.Excluded.class)
    private DiscoveryInformation discoveryInformation;

    @JsonView(value = IntegrationView.Default.class)
    // @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    // @JsonIgnoreProperties("allowedIntegrations")
    @ManyToMany(fetch = FetchType.EAGER, cascade = { CascadeType.REFRESH, CascadeType.MERGE })
    @JoinTable(name = "allowedIntegrations", joinColumns = @JoinColumn(name = "integration_id1", referencedColumnName = "id"), inverseJoinColumns = @JoinColumn(name = "integration_id2", referencedColumnName = "id"))
    private Set<Integration> allowedIntegrations = new HashSet<Integration>();

    @JsonIgnoreProperties("allowingIntegrations")
    @ManyToMany(fetch = FetchType.EAGER, mappedBy = "allowedIntegrations", cascade = { CascadeType.REFRESH, CascadeType.MERGE })
    private Set<Integration> allowingIntegrations = new HashSet<Integration>();

    @JsonView(value = IntegrationView.Excluded.class)
    private int deploymentPhase;
    @JsonView(value = IntegrationView.Excluded.class)
    private LocalDate deploymentDate;
    @JsonView(value = IntegrationView.Excluded.class)
    private LocalDate acceptanceDate;

    private String serviceContactAddress;

    public Integration() {
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

    public long getId() {
        return this.id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public int getVersion() {
        return this.version;
    }

    public java.sql.Timestamp getLastUpdatedOn() {
        return this.lastUpdatedOn;
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
     *         0 testing, 1 production.
     */
    public int getDeploymentPhase() {
        return this.deploymentPhase;
    }

    public void setDeploymentPhase(int deploymentPhase) {
        this.deploymentPhase = deploymentPhase;
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

    public void addAllowed(Integration integration) {
        allowedIntegrations.add(integration);
        // integration.addAllowing(this);
    }

    public void addAllowing(Integration integration) {
        this.allowingIntegrations.add(integration);
    }

    public Set<Integration> getAllowedIntegrations() {
        return this.allowedIntegrations;
    }

    public void setAllowedIntegrations(Set<Integration> allowed) {
        this.allowedIntegrations = allowed;
    }

    public void addGroup(IntegrationGroup integrationGroup) {
        this.integrationGroups.add(integrationGroup);
    }

    public Set<IntegrationGroup> getIntegrationGroups() {
        return this.integrationGroups;
    }
}
