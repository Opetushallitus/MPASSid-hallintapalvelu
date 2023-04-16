package fi.mpass.voh.api.integration.sp;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceProviderRepository extends JpaRepository<ServiceProvider, Long> {
    @Query("SELECT DISTINCT sp.type FROM ServiceProvider sp")
    List<String> findDistinctType();
}