package fi.mpass.voh.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationRepository;

@DataJpaTest
public class OrganizationRepositoryTests {

    @Autowired
    private OrganizationRepository underTest;
    
    @Test
    public void test() {
        // given
        Organization organization = new Organization("OKJ", "1.5.7.4.323232.442.444");
        
        // when
        Organization savedOrganization = underTest.save(organization);

        // then
        assertEquals(organization.getOid(), savedOrganization.getOid());
    }
}
