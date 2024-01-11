package fi.mpass.voh.api.config;

import javax.persistence.AttributeOverride;
import javax.persistence.AttributeOverrides;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Table;

import org.hibernate.annotations.Proxy;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionEntity;

@RevisionEntity(OPHRevisionListener.class)
@Table(name = "extended_revinfo")
@AttributeOverrides({
    @AttributeOverride(name = "id", column = @Column(name = "rev")),
    @AttributeOverride(name = "timestamp", column = @Column(name = "revtstmp"))
})
@Proxy(lazy = false)
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