package fi.mpass.voh.api.provisioning;

import java.util.List;

import javax.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@SecurityRequirement(name = "provisioning")
@RequestMapping(path = "api/v1/provisioning")
public class ProvisioningController {

    private final ProvisioningService provisioningService;
    private final IntegrationService integrationService;

    public ProvisioningController(ProvisioningService provisionService, IntegrationService integrationService) {
        this.provisioningService = provisionService;
        this.integrationService = integrationService;
    }

    @Operation(summary = "Get provisioning configuration status")
    @PreAuthorize("hasPermission('Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(array = @ArraySchema(schema = @Schema(implementation = ConfigurationStatus.class)), mediaType = "application/json"))
    @GetMapping("/configuration/status")
    public List<ConfigurationStatus> getProvisioningConfigurationStatus() {
        return provisioningService.getConfigurationStatuses();
    }

    @Operation(summary = "Update provisioning status")
    @PutMapping
    @PreAuthorize("hasPermission('Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Provisioning.class), mediaType = "application/json"))
    public Provisioning updateProvisioningStatus(@Valid @RequestBody Provisioning provisioning) {
        return provisioningService.updateProvisioning(provisioning);
    }

    @Operation(summary = "Get all integrations")
    @PreAuthorize("hasPermission('Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json"))
    @GetMapping("/list")
    public List<Integration> getIntegrations() {
        return integrationService.getIntegrations();
    }

    @Operation(summary = "Get all identity providers")
    @PreAuthorize("hasPermission('Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = IdentityProviders.class), mediaType = "application/json"))
    @GetMapping("/identityproviders")
    public IdentityProviders getIdentityProviders() {
        return new IdentityProviders(integrationService.getIdentityProviders());
    }

    @Operation(summary = "Get all service providers")
    @PreAuthorize("hasPermission('Provisioning', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = ServiceProviders.class), mediaType = "application/json"))
    @GetMapping("/serviceproviders")
    public ServiceProviders getServiceProviders() {
        return new ServiceProviders(integrationService.getServiceProviders());
    }
}
