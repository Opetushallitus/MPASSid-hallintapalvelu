package fi.mpass.voh.api.integration;

import java.time.LocalDateTime;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;

import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.envers.Audited;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

@Audited
@Entity
public class IntegrationPermission {
    @EmbeddedId
    @JsonIgnore
    private IntegrationPermissionId id;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("fromId")
    private Integration from;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("toId")
    @JsonSerialize(using = IntegrationPermissionSerializer.class)
    private Integration to;

    @JsonInclude(Include.NON_NULL)
    @UpdateTimestamp
    private LocalDateTime lastUpdatedOn;

    private IntegrationPermission() {
    }

    public IntegrationPermission(Integration from, Integration to) {
        this.from = from;
        this.to = to;
        this.id = new IntegrationPermissionId(from.getId(), to.getId());
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((id == null) ? 0 : id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        IntegrationPermission other = (IntegrationPermission) obj;
        if (id == null) {
            if (other.id != null)
                return false;
        } else if (!id.equals(other.id))
            return false;
        return true;
    }

    public Integration getFrom() {
        return from;
    }

    public void setFrom(Integration from) {
        this.from = from;
    }

    public Integration getTo() {
        return to;
    }

    public void setTo(Integration to) {
        this.to = to;
    }

    public LocalDateTime getLastUpdatedOn() {
        return lastUpdatedOn;
    }

    public void setLastUpdatedOn(LocalDateTime lastUpdatedOn) {
        this.lastUpdatedOn = lastUpdatedOn;
    }
}