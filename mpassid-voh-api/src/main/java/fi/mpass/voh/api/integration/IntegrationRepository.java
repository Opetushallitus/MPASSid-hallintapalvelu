package fi.mpass.voh.api.integration;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.history.RevisionRepository;

public interface IntegrationRepository extends JpaRepository<Integration, Long>, JpaSpecificationExecutor<Integration>,
        RevisionRepository<Integration, Long, Integer> {

    @Query("SELECT i FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id LEFT OUTER JOIN ServiceProvider sp ON ce.id=sp.configurationEntity.id LEFT JOIN FETCH i.integrationSets WHERE sp.entityId= :entityId")
    Integration findByConfigurationEntitySpEntityId(String entityId);

    @Query("SELECT i from Integration i left outer join ConfigurationEntity ce on i.configurationEntity.id=ce.id left outer join ServiceProvider sp on ce.id=sp.configurationEntity.id LEFT JOIN FETCH i.integrationSets where sp.clientId= :clientId")
    Integration findByConfigurationEntitySpClientId(String clientId);

    @Query("SELECT i FROM Integration i LEFT JOIN FETCH i.integrationSets WHERE i.id= :id")
    Optional<Integration> findByIdAll(Long id);

    @Query("SELECT i from Integration i left outer join ConfigurationEntity ce on i.configurationEntity.id=ce.id left outer join IdentityProvider idp on ce.id=idp.configurationEntity.id LEFT JOIN FETCH i.permissions where i.id= :id")
    Optional<Integration> findByIdIdpAll(Long id);

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id WHERE ce.role='idp'")
    List<Long> getAllIdpIds();

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id WHERE ce.role='set'")
    List<Long> getAllSetIds();

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id WHERE ce.role='set' AND i.deploymentPhase=:deploymentPhase")
    List<Long> getAllSetIdsByDeploymentPhase(int deploymentPhase);

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id WHERE ce.role='idp' AND i.deploymentPhase=:deploymentPhase")
    List<Long> getAllIdpIdsByDeploymentPhase(int deploymentPhase);

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id WHERE ce.role='sp' AND i.deploymentPhase=:deploymentPhase")
    List<Long> getAllSpIdsByDeploymentPhase(int deploymentPhase);

    @Query("SELECT i.id FROM Integration i LEFT OUTER JOIN ConfigurationEntity ce ON i.configurationEntity.id=ce.id WHERE ce.role='sp'")
    List<Long> getAllSpIds();

    List<Integration> findAllByLastUpdatedOnAfter(LocalDateTime updateDateTime);

    List<Integration> findAllByLastUpdatedOnAfterAndDeploymentPhase(LocalDateTime updateDateTime, int deploymentPhase);

    List<Integration> findDistinctByPermissionsLastUpdatedOnAfterAndDeploymentPhase(LocalDateTime updateDateTime, int deploymentPhase);

    @Query("SELECT a.id+1 as avail FROM Integration a WHERE (SELECT b.id FROM Integration b WHERE b.id=a.id+1) is null")
    List<Long> getAvailableIntegrationIdentifier();

    @Query("SELECT a.id+1 as avail FROM Integration a WHERE (SELECT b.id FROM Integration b WHERE b.id=a.id+1) is null AND a.id < 2000000")
    List<Long> getAvailableIdpIntegrationIdentifier();
}