package fi.mpass.voh.api.integration.attribute;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AttributeRepository extends JpaRepository<Attribute, Long> {
    @Query("SELECT DISTINCT attr.name FROM Attribute attr")
    List<String> findDistinctName();
}