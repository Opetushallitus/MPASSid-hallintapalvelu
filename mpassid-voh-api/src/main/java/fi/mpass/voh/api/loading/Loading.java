package fi.mpass.voh.api.loading;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;

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
    private Map<Long, String> errors = new HashMap<>();

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

    public Map<Long, String> getErrors() {
        return errors;
    }

    public void setErrors(Map<Long, String> errors) {
        this.errors = errors;
    }

    public void addError(Integration integration, String error) {
        if (integration != null) {
            if (this.errors != null && error != null) {
                Long identifier = integration.getId();
                if (identifier == null) {
                    identifier = Long.valueOf(0);
                }
                String existingStatus = this.errors.get(identifier);
                if (existingStatus != null) {
                    errors.put(identifier, existingStatus + ";" + error);
                } else {
                    errors.put(identifier, error);
                }
            }
        } else {
            this.addError(Long.valueOf(0), error);
        }
    }

    public void addError(Long id, String error) {
        if (this.errors != null && error != null) {
            String existingStatus = this.errors.get(id);
            if (existingStatus != null) {
                errors.put(id, existingStatus + ";" + error);
            } else {
                errors.put(id, error);
            }
        }
    }
}
