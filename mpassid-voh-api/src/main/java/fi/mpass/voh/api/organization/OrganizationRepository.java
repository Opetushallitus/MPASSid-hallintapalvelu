package fi.mpass.voh.api.organization;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {
    Organization getByOidOrBusinessId(String oid, String businessId);
}
