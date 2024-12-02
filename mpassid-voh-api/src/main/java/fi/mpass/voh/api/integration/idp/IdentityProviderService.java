package fi.mpass.voh.api.integration.idp;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import fi.mpass.voh.api.exception.EntityCreationException;
import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationService;
import fi.mpass.voh.api.integration.mp.SamlMetadataProvider;

@Service
public class IdentityProviderService {
    private static final Logger logger = LoggerFactory.getLogger(IdentityProviderService.class);

    private final IntegrationService integrationService;

    private String metadataPathBase;

    public IdentityProviderService(@Value("${application.metadata.base.path:metadata}") String metadataPathBase,
            IntegrationService integrationService) {
        this.metadataPathBase = metadataPathBase;
        this.integrationService = integrationService;
    }

    public String saveMetadata(MultipartFile file) {

        InputStream inputStream;
        try {
            inputStream = file.getInputStream();
        } catch (IOException e) {
            logger.error("Failed to get input metadata stream.");
            throw new EntityNotFoundException("Failed to save metadata.");
        }

        // duplicate the stream
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            inputStream.transferTo(baos);
        } catch (Exception e) {
            logger.error("Failed to create output metadata stream.");
            throw new EntityNotFoundException("Failed to save metadata.");
        }

        InputStream entityIdStream = new ByteArrayInputStream(baos.toByteArray());
        InputStream metadataOutputStream = new ByteArrayInputStream(baos.toByteArray());

        // use the first stream to read the entityId and encode as a base64 filename
        SamlMetadataProvider mp = new SamlMetadataProvider(entityIdStream);
        String entityId = mp.getEntityId();
        String encodedEntityId = Base64.getEncoder().encodeToString(entityId.getBytes());
        String flowname = null;

        List<Integration> idps = integrationService.getIdentityProviders();
        for (Integration i : idps) {
            try {
                String entityIdExisting = i.getConfigurationEntity().getIdp().entityId;
                if (entityIdExisting.equals(entityId)) {
                    flowname = i.getConfigurationEntity().getIdp().getFlowName();
                }
            } catch (Exception e) {
                logger.debug("Exception in retrieving integration flowname. {}", e.getMessage());
                continue;
            }
        }

        if (flowname == null) {
            logger.error("No flowname found.");
            throw new EntityCreationException("Failed to save metadata.");
        }

        // use the second stream to save the metadata
        Path rootLocation = Paths.get(this.metadataPathBase);
        try {
            if (file.isEmpty()) {
                logger.error("Empty file {}", file);
                throw new EntityCreationException("Empty metadata.");
            }

            Path destinationFile = rootLocation.resolve(Paths.get(flowname + ".xml")).normalize().toAbsolutePath();
            if (!destinationFile.getParent().equals(rootLocation.toAbsolutePath())) {
                logger.error("Cannot store file outside configured directory: {}",
                        destinationFile);
                throw new EntityCreationException("Failed to save metadata.");
            }

            Files.copy(metadataOutputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);

            return encodedEntityId;

        } catch (IOException e) {
            logger.error("Exception in saving metadata", e);
            throw new EntityCreationException("Failed to save metadata.");
        }
    }

    public InputStreamResource getSAMLMetadata(String entityId) {
        Path rootLocation = Paths.get(metadataPathBase);
        Path sourceFile = rootLocation.resolve(Paths.get(entityId)).normalize().toAbsolutePath();

        try {
            return new InputStreamResource(new FileInputStream(sourceFile.toString()));
        } catch (FileNotFoundException e) {
            logger.error("Metadata not found: {}", sourceFile);
            throw new EntityNotFoundException("Metadata not found.");
        }
    }

}
