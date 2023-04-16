package fi.mpass.voh.api.integration.idp;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IdentityProviderRepository extends JpaRepository<IdentityProvider, Long> {
    @Query("SELECT DISTINCT idp.type FROM IdentityProvider idp")
    List<String> findDistinctType();
}