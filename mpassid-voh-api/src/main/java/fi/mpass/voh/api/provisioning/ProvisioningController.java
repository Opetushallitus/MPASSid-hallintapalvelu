package fi.mpass.voh.api.provisioning;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import fi.mpass.voh.api.exception.EntityNotFoundException;
import fi.mpass.voh.api.exception.IntegrationError;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@SecurityRequirement(name = "provisioning")
@RequestMapping(path = "api/v2/provisioning")
public class ProvisioningController {

    private final ProvisioningService provisioningService;
    private final IntegrationService integrationService;

    private static final Logger logger = LoggerFactory.getLogger(ProvisioningController.class);

    public ProvisioningController(ProvisioningService provisionService, IntegrationService integrationService) {
        this.provisioningService = provisionService;
        this.integrationService = integrationService;
    }

    @Operation(summary = "Get provisioning configuration status")
    @PreAuthorize("@authorize.hasPermission(#root, 'Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(array = @ArraySchema(schema = @Schema(implementation = ConfigurationStatus.class)), mediaType = "application/json"))
    @GetMapping("/configuration/status")
    public List<ConfigurationStatus> getProvisioningConfigurationStatus() {
        return provisioningService.getConfigurationStatuses();
    }

    @Operation(summary = "Update provisioning status")
    @PutMapping
    @PreAuthorize("@authorize.hasPermission(#root, 'Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Provisioning.class), mediaType = "application/json"))
    public Provisioning updateProvisioningStatus(@Valid @RequestBody Provisioning provisioning) {
        return provisioningService.updateProvisioning(provisioning);
    }

    @Operation(summary = "Get all integrations")
    @PreAuthorize("@authorize.hasPermission(#root, 'Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json"))
    @GetMapping("/list")
    public List<Integration> getIntegrations() {
        return integrationService.getIntegrations();
    }

    @Operation(summary = "Get all identity providers")
    @PreAuthorize("@authorize.hasPermission(#root, 'Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = IdentityProviders.class), mediaType = "application/json"))
    @GetMapping("/identityproviders")
    public IdentityProviders getIdentityProviders() {
        return new IdentityProviders(provisioningService.getIdentityProviders());
    }

    @Operation(summary = "Get all service providers")
    @PreAuthorize("@authorize.hasPermission(#root, 'Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = ServiceProviders.class), mediaType = "application/json"))
    @GetMapping("/serviceproviders")
    public ServiceProviders getServiceProviders() {
        return new ServiceProviders(provisioningService.getServiceProviders());
    }

    @Operation(summary = "Get integration discovery information logo")
    @PreAuthorize("@authorize.hasPermission(#root, 'Provisioning', 'ADMIN')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = ResponseEntity.class), mediaType = "application/octet-stream")),
            @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Resource not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @GetMapping("/integration/discoveryinformation/logo/{id}")
    // @JsonView(value = IntegrationView.Default.class)
    public ResponseEntity<Resource> getIntegrationDiscoveryInformationLogo(@PathVariable Long id) {
        InputStreamResource resource = integrationService.getDiscoveryInformationLogo(id);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            resource.getInputStream().transferTo(baos);
        } catch (IllegalStateException e) {
            logger.error(e.getMessage());
            throw new EntityNotFoundException("Logo retrieval failed.");
        } catch (IOException e) {
            logger.error(e.getMessage());
            throw new EntityNotFoundException("Logo retrieval failed.");
        }
        InputStream imageHeaderStream = new ByteArrayInputStream(baos.toByteArray());
        InputStream imageOutputStream = new ByteArrayInputStream(baos.toByteArray());
        InputStreamResource outputResource = new InputStreamResource(imageOutputStream);
        String logoContentType = integrationService.getDiscoveryInformationLogoContentType(imageHeaderStream);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, logoContentType);
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + Long.toString(id));
        headers.add("Cache-Control", "no-cache, no-store, must-revalidate");
        headers.add("Pragma", "no-cache");
        headers.add("Expires", "0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(outputResource);
    }
}
