package fi.mpass.voh.api.integration;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.history.RevisionRepository;

public interface IntegrationRepository extends JpaRepository<Integration, Long>, JpaSpecificationExecutor<Integration>,
        RevisionRepository<Integration, Long, Integer> {

    @Query("SELECT i FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity=ce.id LEFT OUTER JOIN ServiceProvider sp ON ce.id=sp.configurationEntity LEFT JOIN FETCH i.integrationSets WHERE sp.entityId= :entityId")
    Integration findByConfigurationEntitySpEntityId(String entityId);

    @Query("SELECT i from Integration i left outer join ConfigurationEntity ce on i.configurationEntity=ce.id left outer join ServiceProvider sp on ce.id=sp.configurationEntity LEFT JOIN FETCH i.integrationSets where sp.clientId= :clientId")
    Integration findByConfigurationEntitySpClientId(String clientId);

    @Query("SELECT i FROM Integration i LEFT JOIN FETCH i.integrationSets WHERE i.id= :id")
    Optional<Integration> findByIdAll(Long id);

    @Query("SELECT i from Integration i left outer join ConfigurationEntity ce on i.configurationEntity=ce.id left outer join IdentityProvider idp on ce.id=idp.configurationEntity LEFT JOIN FETCH i.permissions where i.id= :id")
    Optional<Integration> findByIdIdpAll(Long id);

    List<Integration> findAllByLastUpdatedOnAfter(Date updateDateTime);

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity=ce.id WHERE ce.role='idp'")
    List<Long> getAllIdpIds();

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity=ce.id WHERE ce.role='set'")
    List<Long> getAllSetIds();

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity=ce.id WHERE ce.role='sp'")
    List<Long> getAllSpIds();
}