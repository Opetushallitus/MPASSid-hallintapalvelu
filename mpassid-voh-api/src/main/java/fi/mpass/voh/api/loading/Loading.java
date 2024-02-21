package fi.mpass.voh.api.loading;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.MapKeyColumn;

import fi.mpass.voh.api.integration.Integration;

@Entity
public class Loading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // STARTED(0), LOADING(1), SUCCEEDED(2), FAILED(3)
    private LoadingStatus status;
    // IDP(0), SP(1), SET(2)
    private LoadingType type;

    private LocalDateTime time;

    @ElementCollection
    @CollectionTable(name = "integration_loading_status", joinColumns = {
            @JoinColumn(name = "loading_id", referencedColumnName = "id") })
    @MapKeyColumn(name = "integration_id")
    @Column(name = "status")
    private Map<Long, String> integrationStatus = new HashMap<>();

    public Loading() {
        this.time = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LoadingStatus getStatus() {
        return status;
    }

    public void setStatus(LoadingStatus status) {
        this.status = status;
    }

    public LoadingType getType() {
        return type;
    }

    public void setType(LoadingType type) {
        this.type = type;
    }

    public LocalDateTime getTime() {
        return time;
    }

    public void setTime(LocalDateTime time) {
        this.time = time;
    }

    public Map<Long, String> getIntegrationStatus() {
        return integrationStatus;
    }

    public void setIntegrationStatus(Map<Long, String> integrationStatus) {
        this.integrationStatus = integrationStatus;
    }

    public void addIntegrationLoadingStatus(Integration integration, String status) {
        if (this.integrationStatus != null && status != null) {
            String existingStatus = this.integrationStatus.get(integration.getId());
            if (existingStatus != null) {
                integrationStatus.put(integration.getId(), existingStatus + ";" + status);
            } else {
                integrationStatus.put(integration.getId(), status);
            }
        }
    }

    public void addIntegrationLoadingStatus(Long id, String status) {
        if (this.integrationStatus != null && status != null) {
            String existingStatus = this.integrationStatus.get(id);
            if (existingStatus != null) {
                integrationStatus.put(id, existingStatus + ";" + status);
            } else {
                integrationStatus.put(id, status);
            }
        }
    }
}
