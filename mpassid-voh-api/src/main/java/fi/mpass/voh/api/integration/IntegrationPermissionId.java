package fi.mpass.voh.api.integration;

import java.io.Serializable;
import jakarta.persistence.Embeddable;

@Embeddable
public class IntegrationPermissionId implements Serializable {

    private Long fromId;
    private Long toId;

    public IntegrationPermissionId() {
    }

    public IntegrationPermissionId(Long fromId, Long toId) {
        this.fromId = fromId;
        this.toId = toId;
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((toId == null) ? 0 : toId.hashCode());
        result = prime * result + ((fromId == null) ? 0 : fromId.hashCode());
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
        IntegrationPermissionId other = (IntegrationPermissionId) obj;
        if (toId == null) {
            if (other.toId != null)
                return false;
        } else if (!toId.equals(other.toId))
            return false;
        if (fromId == null) {
            if (other.fromId != null)
                return false;
        } else if (!fromId.equals(other.fromId))
            return false;
        return true;
    }

    public Long getFromId() {
        return fromId;
    }

    public void setFromId(Long fromId) {
        this.fromId = fromId;
    }

    public Long getToId() {
        return toId;
    }

    public void setToId(Long toId) {
        this.toId = toId;
    }
}
