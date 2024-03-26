package fi.mpass.voh.api.provisioning;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import java.time.LocalDateTime;

@Entity
public class Provisioning {
    @Id
    private final int deploymentPhase;
    private LocalDateTime lastTime;

    public Provisioning() {
        this.deploymentPhase = 0;
    }

    public Provisioning(int deploymentPhase) {
        this.deploymentPhase = deploymentPhase;
    }

    public LocalDateTime getLastTime() {
        return lastTime;
    }

    public void setLastTime(LocalDateTime lastTime) {
        this.lastTime = lastTime;
    }

    public int getDeploymentPhase() {
        return deploymentPhase;
    }
}
