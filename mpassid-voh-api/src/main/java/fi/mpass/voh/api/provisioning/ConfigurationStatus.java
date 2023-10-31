package fi.mpass.voh.api.provisioning;

import java.util.Date;

public class ConfigurationStatus {
    private boolean updated;
    private Date lastUpdateTime;
    private int deploymentPhase;

    public ConfigurationStatus(boolean updated, Date lastUpdateTime) {
        this.updated = updated;
        this.lastUpdateTime = lastUpdateTime;
    }

    public boolean isUpdated() {
        return updated;
    }

    public Date getLastUpdateTime() {
        return lastUpdateTime;
    }

    public int getDeploymentPhase() {
        return deploymentPhase;
    }

    public void setDeploymentPhase(int deploymentPhase) {
        this.deploymentPhase = deploymentPhase;
    }
}
