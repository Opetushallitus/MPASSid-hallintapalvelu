package fi.mpass.voh.api.integration;

import java.util.Date;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.history.RevisionRepository;

public interface IntegrationRepository extends JpaRepository<Integration, Long>, JpaSpecificationExecutor<Integration>,
        RevisionRepository<Integration, Long, Integer> {

    // TODO called from IntegrationConfig, refactor by moving to IntegrationService
    // through specification
    @Query("SELECT i FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity=ce.id LEFT OUTER JOIN ServiceProvider sp ON ce.id=sp.configurationEntity WHERE sp.entityId= :entityId")
    Integration findByConfigurationEntitySpEntityId(String entityId);

    @Query("SELECT i from Integration i left outer join ConfigurationEntity ce on i.configurationEntity=ce.id left outer join ServiceProvider sp on ce.id=sp.configurationEntity where sp.clientId= :clientId")
    Integration findByConfigurationEntitySpClientId(String clientId);

    List<Integration> findAllByLastUpdatedOnAfter(Date updateDateTime);
}