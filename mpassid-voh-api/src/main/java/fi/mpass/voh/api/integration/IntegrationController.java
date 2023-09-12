package fi.mpass.voh.api.integration;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import javax.validation.Valid;

import org.apache.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.annotation.JsonView;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Content;
import fi.mpass.voh.api.config.IntegrationView;
import fi.mpass.voh.api.exception.IntegrationError;

@RestController
@RequestMapping(path = "api/v1/integration")
public class IntegrationController {

    private final IntegrationService integrationService;

    public IntegrationController(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @Operation(summary = "Get all integrations", ignoreJsonView = true)
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
            @ExampleObject(name = "integrations", externalValue = "https://mpassid-rr-test.csc.fi/integrations.json") }))
    @GetMapping("/list")
    @JsonView(value = IntegrationView.Default.class)
    public List<Integration> getIntegrations() {
        return integrationService.getIntegrations();
    }

    @Operation(summary = "Search paged integrations", ignoreJsonView = true)
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
                    @ExampleObject(name = "searchIntegrations", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
            @ApiResponse(responseCode = "404", description = "No integrations found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @GetMapping("/search")
    @JsonView(value = IntegrationView.Default.class)
    public Page<Integration> getIntegrationsSpecSearchPageable(
            @RequestParam(required = false, value = "search") String search,
            @RequestParam(required = false, value = "type") String filterByType,
            @RequestParam(required = false, value = "role") String role,
            @RequestParam(required = false, value = "deploymentPhase") String deploymentPhase,
            @RequestParam(required = false, value = "referenceIntegration") Long referenceIntegration,
            Pageable pageable) {
        try {
            if (!(referenceIntegration == null)) {
                return integrationService.getIntegrationsSpecSearchPageable(search, filterByType, role, deploymentPhase, referenceIntegration,
                        pageable);
            } else {
                return integrationService.getIntegrationsSpecSearchPageable(search, filterByType, role, deploymentPhase,
                        pageable);
            }
        } catch (PropertyReferenceException exc) {
            throw new ResponseStatusException(
                    HttpStatus.SC_NOT_FOUND, "Integration Not Found", exc);
        }
    }

    @Operation(summary = "Get the specific integration", ignoreJsonView = true)
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
                    @ExampleObject(name = "integration", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
            @ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @GetMapping("{id}")
    @JsonView(value = IntegrationView.Default.class)
    public Optional<Integration> getIntegration(@PathVariable Long id) {
        return integrationService.getSpecIntegrationById(id);
    }

    @Operation(summary = "Update the specific integration")
    @PreAuthorize("hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Integration update successful", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
            @ApiResponse(responseCode = "405", description = "Integration update error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
            @ApiResponse(responseCode = "409", description = "Integration update conflict", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @PutMapping("{id}")
    @JsonView(value = IntegrationView.Default.class)
    Integration updateIntegration(@Valid @RequestBody Integration integration, @PathVariable Long id) {
        return integrationService.updateIntegration(id, integration);
    }

    @Operation(summary = "Get integrations since a point in time", ignoreJsonView = true)
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
                    @ExampleObject(name = "integration", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
            @ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @GetMapping("/since/{timestamp}")
    @JsonView(value = IntegrationView.Default.class)
    public List<Integration> getIntegrationsSince(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime timestamp) {
        return integrationService.getIntegrationsSince(timestamp);
    }
}
