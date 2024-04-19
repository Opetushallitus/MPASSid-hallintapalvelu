package fi.mpass.voh.api.config.ui;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class DataUserInterfaceConfiguration {
    private static final Logger logger = LoggerFactory.getLogger(DataUserInterfaceConfiguration.class);

    @Value("${application.userinterface.data.configuration.file}")
    String configurationResourcePath;

    ResourceLoader resourceLoader;

    public DataUserInterfaceConfiguration(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public List<UserInterfaceConfiguration> getUserInterfaceConfigurations() {
        ObjectMapper mapper = new ObjectMapper();
        Resource resource = resourceLoader.getResource("file:" + configurationResourcePath);
        try {
            return mapper.readValue(resource.getFile(),
                    new TypeReference<List<UserInterfaceConfiguration>>() {
                    });
        } catch (IOException e) {
            logger.error("User interface configuration file not found from the application directory: {}", configurationResourcePath);
            resource = resourceLoader.getResource("classpath:" + configurationResourcePath);
            try {
                return mapper.readValue(resource.getFile(),
                        new TypeReference<List<UserInterfaceConfiguration>>() {
                        });
            } catch (IOException ee) {
                logger.error("User interface configuration file not found from classpath: {}", configurationResourcePath);
            }
        }
        return new ArrayList<>();
    }
}
