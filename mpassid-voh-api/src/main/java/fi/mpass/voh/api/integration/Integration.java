package fi.mpass.voh.api.integration;

import java.time.LocalDate;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.Version;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import fi.mpass.voh.api.organization.Organization;

@Entity
public class Integration {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Version
    private java.sql.Timestamp version;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "configuration_entity_id", referencedColumnName = "id")
    private ConfigurationEntity configurationEntity;

    // Defaults to no operations being cascaded
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "organization_oid", referencedColumnName = "oid")
    private Organization organization;

    @JsonManagedReference
    // TODO cascade review
    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "discovery_information_id", referencedColumnName = "id")
    private DiscoveryInformation discoveryInformation;

    private int deploymentPhase;
    private LocalDate deploymentDate;
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

    public java.sql.Timestamp getVersion() {
        return this.version;
    }

    public ConfigurationEntity getConfigurationEntity() {
        return this.configurationEntity;
    }

    public void setConfigurationEntity(ConfigurationEntity configurationEntity) {
        this.configurationEntity = configurationEntity;
    }

    /**
     * Gets the deployment phase.
     * @return The {@link int} representing the deployment phase.
     * 0 testing, 1 production.
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
}
