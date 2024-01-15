package fi.mpass.voh.api.provisioning;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;

public class ConfigurationStatus {
    private boolean updated;
    @Schema(description = "The last time when provisioning was done")
    private LocalDateTime provisioningLastTime;
    @Schema(description = "The update time of the oldest, updated integration (permissions) since the last provisioning time")
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

    public ConfigurationStatus(boolean updated, LocalDateTime provisioningLastTime, LocalDateTime lastUpdateTime,
            int deploymentPhase) {
        this.updated = updated;
        this.provisioningLastTime = provisioningLastTime;
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

    public LocalDateTime getProvisioningLastUpdateTime() {
        return provisioningLastTime;
    }

    public void setProvisioningLastUpdateTime(LocalDateTime provisioningLastTime) {
        this.provisioningLastTime = provisioningLastTime;
    }
}
