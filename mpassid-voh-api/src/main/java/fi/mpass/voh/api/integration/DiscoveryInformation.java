package fi.mpass.voh.api.integration;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.JoinColumn;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import io.swagger.v3.oas.annotations.media.Schema;

import org.hibernate.envers.Audited;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(Include.NON_NULL)
@Audited
@Entity
public class DiscoveryInformation {
    private static final Logger logger = LoggerFactory.getLogger(DiscoveryInformation.class);

    @JsonIgnore
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonBackReference
    @OneToOne(mappedBy = "discoveryInformation")
    private Integration integration;

    @Schema(description = "Opetuksen- ja koulutuksenjärjestäjä (OKJ)")
    private String customDisplayName;
    @Schema(description = "Koulun nimen lisätieto")
    private String title;
    private boolean showSchools;
 
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "discovery_information_schools", joinColumns = @JoinColumn(name = "discovery_information_id"))
    @Column(name = "schools")
    @Schema(description="https://koski.opintopolku.fi/koski/dokumentaatio/koodisto/oppilaitosnumero/latest")
    private Set<String> schools = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "discovery_information_excludedSchools", joinColumns = @JoinColumn(name = "discovery_information_id"))
    @Column(name = "schools")
    @Schema(description="https://koski.opintopolku.fi/koski/dokumentaatio/koodisto/oppilaitosnumero/latest")
    private Set<String> excludedSchools = new HashSet<>();

    private boolean earlyEducationProvider;

    public DiscoveryInformation() { }

    public DiscoveryInformation(String customDisplayName, String title, boolean showSchools) {
        this.customDisplayName = customDisplayName;
        this.title = title;
        this.showSchools = showSchools;
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integration getIntegration() {
        return this.integration;
    }

    public void setIntegration(Integration integration) {
        this.integration = integration;
    }

    public String getCustomDisplayName() {
        return this.customDisplayName;
    }

    public void setCustomDisplayName(String customDisplayName) {
        this.customDisplayName = customDisplayName;
    }

    public String getTitle() {
        return this.title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setCustomTitle(String customTitle) {
        this.title = customTitle;
    }

    public boolean isShowSchools() {
        return this.showSchools;
    }

    public boolean getShowSchools() {
        return this.showSchools;
    }

    public void setShowSchools(boolean showSchools) {
        this.showSchools = showSchools;
    }
    
    public Set<String> getSchools() {
        return this.schools;
    }
    
    public void setSchools(Set<String> schools) {
        this.schools = schools;
    }

    public Set<String> getExcludedSchools() {
        return this.excludedSchools;
    }

    public void setExcludedSchools(Set<String> excludedSchools) {
        this.excludedSchools = excludedSchools;
    }

    public boolean getEarlyEducationProvider() {
        return earlyEducationProvider;
    }

    public void setEarlyEducationProvider(boolean earlyEducationProvider) {
        this.earlyEducationProvider = earlyEducationProvider;
    }    
}
