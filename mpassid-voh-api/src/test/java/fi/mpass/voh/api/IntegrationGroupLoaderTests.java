package fi.mpass.voh.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;

import fi.mpass.voh.api.config.IntegrationGroupLoader;
import fi.mpass.voh.api.integration.IntegrationGroupRepository;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
public class IntegrationGroupLoaderTests {

    IntegrationGroupLoader groupLoader;

    @Autowired
    IntegrationGroupRepository repository;

    @Autowired
    ResourceLoader loader;

    @BeforeEach
    void drop() {
        repository.deleteAll();
    }

    @Test
    public void testGroupLoader() throws Exception {
        String location = "integration_groups.json";
        groupLoader = new IntegrationGroupLoader(repository, loader);
        groupLoader.run(location);

        assertEquals(3, repository.findAll().size());
    }
}
