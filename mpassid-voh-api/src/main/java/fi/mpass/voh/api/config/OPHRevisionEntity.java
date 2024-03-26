package fi.mpass.voh.api.config;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionEntity;

@RevisionEntity(OPHRevisionListener.class)
@Table(name = "extended_revinfo")
@AttributeOverrides({
    @AttributeOverride(name = "id", column = @Column(name = "rev")),
    @AttributeOverride(name = "timestamp", column = @Column(name = "revtstmp"))
})
@Entity
public class OPHRevisionEntity extends DefaultRevisionEntity {

    private static final long serialVersionUID = -1604731513258123882L;

    @Column(name = "user_id")
    private String userId;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

}