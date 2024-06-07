package fi.mpass.voh.api.config.ui;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class UserInterfaceConfigurationTest {

    @Autowired
    DefaultUserInterfaceConfiguration defaultUserInterfaceConfiguration;

    @Autowired
    DataUserInterfaceConfiguration dataUserInterfaceConfiguration;

    @Test
    void testJsonProperties() {
        assertEquals("default", defaultUserInterfaceConfiguration.getName());
        assertTrue(defaultUserInterfaceConfiguration.isMandatory());

        List<LinkedHashMap<String, ?>> integrationTypeConfiguration = defaultUserInterfaceConfiguration.getIntegrationType();
        String name = (String) integrationTypeConfiguration.get(0).get("name");
        boolean visible = (boolean) integrationTypeConfiguration.get(0).get("visible");
        assertEquals("azure", name);
        assertTrue(visible);
    }
 
    @Test
    void testDataUserInterfaceConfiguration() {
        assertEquals(20, dataUserInterfaceConfiguration.getUserInterfaceConfigurations().size());
        UserInterfaceConfiguration userInterfaceConfiguration = dataUserInterfaceConfiguration.getUserInterfaceConfigurations().get(4);
        List<LinkedHashMap<String, ?>> integrationTypeConfiguration = userInterfaceConfiguration.getIntegrationType();
        String name = (String) integrationTypeConfiguration.get(0).get("name");
        boolean visible = (boolean) integrationTypeConfiguration.get(0).get("visible");
        assertEquals("azure", name);
        assertTrue(visible);
    }
}
