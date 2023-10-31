package fi.mpass.voh.api.provisioning;

import javax.persistence.Entity;
import javax.persistence.Id;

import java.time.LocalDateTime;

@Entity
public class Provisioning {
    @Id
    private final Long id = 1L;
    private LocalDateTime lastTime;

    public LocalDateTime getLastTime() {
        return lastTime;
    }

    public void setLastTime(LocalDateTime lastTime) {
        this.lastTime = lastTime;
    }
}
