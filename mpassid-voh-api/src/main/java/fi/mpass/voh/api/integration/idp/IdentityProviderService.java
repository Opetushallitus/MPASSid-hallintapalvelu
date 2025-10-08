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
import java.util.Optional;

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

@Service
public class IdentityProviderService {
    private static final Logger logger = LoggerFactory.getLogger(IdentityProviderService.class);

    private final IntegrationService integrationService;

    private String metadataBasePath;

    public IdentityProviderService(
            @Value("${application.integrationservice.metadataBasePath:metadata}") String metadataBasePath,
            IntegrationService integrationService) {
        this.metadataBasePath = metadataBasePath;
        this.integrationService = integrationService;
    }


    public Integration saveMetadata(Integration i, String metadataUrl) {
        if (metadataUrl == null || metadataUrl.isEmpty()) {
            logger.debug("No metadataUrl found.");
            return i;
        }

        if (i != null) {
            try {
                if (i.getConfigurationEntity().getIdp() instanceof Adfs) {
                    Adfs adfsIdp = (Adfs) i.getConfigurationEntity().getIdp();
                    adfsIdp.setMetadataAndParse(metadataUrl);
                } else if (i.getConfigurationEntity().getIdp() instanceof Gsuite) {
                    Gsuite gsuiteIdp = (Gsuite) i.getConfigurationEntity().getIdp();
                    gsuiteIdp.setMetadataAndParse(metadataUrl);
                } else if (i.getConfigurationEntity().getIdp() instanceof Azure) {
                    Azure azureIdp = (Azure) i.getConfigurationEntity().getIdp();
                    azureIdp.setMetadataAndParse(metadataUrl);
                } else {
                    logger.debug("Given id is not Adfs, Gsuite or Azure (Entra id).");
                }
            } catch (Exception e) {
                logger.error("Exception in retrieving integration. {}", e.getMessage());
            }
        }
        return i;
    }

    public Integration saveMetadata(Long id, MultipartFile file) {

        InputStream inputStream;
        try {
            inputStream = file.getInputStream();
        } catch (IOException e) {
            logger.error("Failed to get input metadata stream.");
            throw new EntityNotFoundException("Failed to save metadata.");
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            inputStream.transferTo(baos);
        } catch (Exception e) {
            logger.error("Failed to create output metadata stream.");
            throw new EntityNotFoundException("Failed to save metadata.");
        }

        InputStream metadataOutputStream = new ByteArrayInputStream(baos.toByteArray());
        InputStream metadataReadingStream = new ByteArrayInputStream(baos.toByteArray());

        String flowname = null;
        String metadataUrl = null;
        String entityId = null;
        Path rootLocation = Paths.get(this.metadataBasePath);
        Path destinationFile = null;

        Optional<Integration> i = integrationService.getIntegration(id);
        if (i.isPresent()) {
            try {
                if (i.get().getConfigurationEntity().getIdp() instanceof Adfs) {
                    flowname = ((Adfs) i.get().getConfigurationEntity().getIdp()).getFlowName();
                    metadataUrl = ((Adfs) i.get().getConfigurationEntity().getIdp()).getMetadataUrl();
                    destinationFile = rootLocation.resolve(Paths.get("adfs_" + i.get().getId().toString() + "-metadata.xml")).normalize().toAbsolutePath();
                } else if (i.get().getConfigurationEntity().getIdp() instanceof Gsuite) {
                    flowname = ((Gsuite) i.get().getConfigurationEntity().getIdp()).getFlowName();
                    metadataUrl = ((Gsuite) i.get().getConfigurationEntity().getIdp()).getMetadataUrl();
                    destinationFile = rootLocation.resolve(Paths.get("gsuite_" + i.get().getId().toString() + "-metadata.xml")).normalize().toAbsolutePath();
                } else if (i.get().getConfigurationEntity().getIdp() instanceof Azure) {
                    flowname = ((Azure) i.get().getConfigurationEntity().getIdp()).getFlowName();
                    metadataUrl = ((Azure) i.get().getConfigurationEntity().getIdp()).getMetadataUrl();
                    destinationFile = rootLocation.resolve(Paths.get("azure_" + i.get().getId().toString() + "-metadata.xml")).normalize().toAbsolutePath();
                } else {
                    logger.debug("Given id is not Adfs, Gsuite or Azure (Entra id).");
                }
            } catch (Exception e) {
                logger.error("Exception in retrieving integration. {}", e.getMessage());
            }
        }
        else {
            logger.error("No integration found.");
            throw new EntityCreationException("Failed to save metadata.");
        }

        if (flowname == null) {
            logger.error("No flowname found.");
            throw new EntityCreationException("Failed to save metadata.");
        }

        if (metadataUrl == null) {
            logger.debug("No metadataUrl found.");
            throw new EntityCreationException("Failed to save metadata.");
        }

        if (destinationFile == null) {
            logger.debug("No destinationFile found.");
            throw new EntityCreationException("Failed to save metadata.");
        }

        // use the stream to save the metadata
        try {
            if (file.isEmpty()) {
                logger.error("Empty file {}", file);
                throw new EntityCreationException("Empty metadata.");
            }

            if (!destinationFile.getParent().equals(rootLocation.toAbsolutePath())) {
                logger.error("Cannot store file outside configured directory: {}",
                        destinationFile);
                throw new EntityCreationException("Failed to save metadata.");
            }

            // Save metadata file to disk
            Files.copy(metadataOutputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);

            if (i.isPresent()) {
                try {
                    if (i.get().getConfigurationEntity().getIdp() instanceof Adfs) {
                        Adfs adfsIdp = (Adfs) i.get().getConfigurationEntity().getIdp();
                        metadataUrl = adfsIdp.getMetadataUrl();
                        adfsIdp.setMetadataAndParse(metadataReadingStream);
                        entityId = adfsIdp.getEntityId();
                        i.get().getConfigurationEntity().setIdp(adfsIdp);
                        integrationService.updateIntegration(id, i.get());
                    } else if (i.get().getConfigurationEntity().getIdp() instanceof Gsuite) {
                        Gsuite gsuiteIdp = (Gsuite) i.get().getConfigurationEntity().getIdp();
                        metadataUrl = gsuiteIdp.getMetadataUrl();
                        gsuiteIdp.setMetadataAndParse(metadataReadingStream);
                        entityId = gsuiteIdp.getEntityId();
                        i.get().getConfigurationEntity().setIdp(gsuiteIdp);
                        integrationService.updateIntegration(id, i.get());
                    } else if (i.get().getConfigurationEntity().getIdp() instanceof Azure) {
                        Azure azureIdp = (Azure) i.get().getConfigurationEntity().getIdp();
                        metadataUrl = azureIdp.getMetadataUrl();
                        azureIdp.setMetadataUrlAndValidUntilDates(metadataReadingStream);
                        i.get().getConfigurationEntity().setIdp(azureIdp);
                        integrationService.updateIntegration(id, i.get());
                    } else {
                        logger.debug("Given id is not Adfs, Gsuite or Azure (Entra id).");
                    }
                } catch (Exception e) {
                    logger.error("Exception in retrieving integration. {}", e.getMessage());
                }
            }

            return i.get();

        } catch (IOException e) {
            logger.error("Exception in saving metadata", e);
            throw new EntityCreationException("Failed to save metadata.");
        }
    }

    public InputStreamResource getSAMLMetadata(String entityId) {
        // Deprecated
        Path rootLocation = Paths.get(metadataBasePath);
        Path sourceFile = rootLocation.resolve(Paths.get(entityId)).normalize().toAbsolutePath();

        try {
            return new InputStreamResource(new FileInputStream(sourceFile.toString()));
        } catch (FileNotFoundException e) {
            logger.error("Metadata not found: {}", sourceFile);
            throw new EntityNotFoundException("Metadata not found.");
        }
    }

    public InputStreamResource getSAMLMetadata(Long id) {
        // TODO: Unit tests
        String flowname = null;
        String filename = null;
        Optional<Integration> i = integrationService.getIntegration(id);
        if (i.isPresent()) {
            try {
                if (i.get().getConfigurationEntity().getIdp() instanceof Adfs) {
                    flowname = ((Adfs) i.get().getConfigurationEntity().getIdp()).getFlowName();
                    filename = "adfs_" + i.get().getId().toString() + "-metadata.xml";
                } else if (i.get().getConfigurationEntity().getIdp() instanceof Gsuite) {
                    flowname = ((Gsuite) i.get().getConfigurationEntity().getIdp()).getFlowName();
                    filename = "gsuite_" + i.get().getId().toString() + "-metadata.xml";
                } else {
                    logger.debug("Given id is not Adfs or Gsuite");
                }
            } catch (Exception e) {
                logger.error("Exception in retrieving integration. {}", e.getMessage());
            }

            if (flowname == null) {
                logger.error("No flowname.");
                //throw new EntityCreationException("Failed to get metadata.");
            }

            if (filename == null) {
                logger.error("No filename.");
                throw new EntityCreationException("Failed to get metadata.");
            }
        }

        Path rootLocation = Paths.get(metadataBasePath);
        Path sourceFile = rootLocation.resolve(Paths.get(filename)).normalize().toAbsolutePath();  

        try {
            return new InputStreamResource(new FileInputStream(sourceFile.toString()));
        } catch (FileNotFoundException e) {
            logger.error("Metadata not found: {}", sourceFile);
            throw new EntityNotFoundException("Metadata not found.");
        }
    }

}
