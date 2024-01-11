package fi.mpass.voh.api.provisioning;

import java.time.LocalDateTime;

public class ConfigurationStatus {
    private boolean updated;
    private LocalDateTime lastUpdateTime;
    private int deploymentPhase;

    public ConfigurationStatus(boolean updated, LocalDateTime lastUpdateTime) {
        this.updated = updated;
        this.lastUpdateTime = lastUpdateTime;
    }

    public ConfigurationStatus(boolean updated, LocalDateTime lastUpdateTime, int deploymentPhase) {
        this.updated = updated;
        this.lastUpdateTime = lastUpdateTime;
        this.deploymentPhase = deploymentPhase;
    }

    public boolean isUpdated() {
        return updated;
    }

    public LocalDateTime getLastUpdateTime() {
        return lastUpdateTime;
    }

    public int getDeploymentPhase() {
        return deploymentPhase;
    }

    public void setDeploymentPhase(int deploymentPhase) {
        this.deploymentPhase = deploymentPhase;
    }
}
