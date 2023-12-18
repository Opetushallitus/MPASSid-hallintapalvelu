package fi.mpass.voh.api.provisioning;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvisioningRepository extends JpaRepository<Provisioning, Long> {

    Optional<Provisioning> findByDeploymentPhase(int deploymentPhase);
}
