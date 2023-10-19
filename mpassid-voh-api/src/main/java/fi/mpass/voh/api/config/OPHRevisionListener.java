package fi.mpass.voh.api.config;

import java.util.Optional;

import org.hibernate.envers.RevisionListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class OPHRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        OPHRevisionEntity revisionInfo = (OPHRevisionEntity) revisionEntity;
        Optional<Authentication> auth = Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication());
        String userId = auth.isPresent() ? auth.get().getName() : "-";
        revisionInfo.setUserId(userId);
    }

}
