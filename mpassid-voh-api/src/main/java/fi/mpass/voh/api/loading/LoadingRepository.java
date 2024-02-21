package fi.mpass.voh.api.loading;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LoadingRepository extends JpaRepository<Loading, Long> {

    Loading findFirstByOrderByTimeDesc();
}