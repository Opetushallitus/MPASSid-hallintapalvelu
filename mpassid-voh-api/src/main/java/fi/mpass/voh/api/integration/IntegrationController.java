package fi.mpass.voh.api.integration;

import java.util.List;
import java.util.Optional;

import org.apache.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Content;

import fi.mpass.voh.api.exception.IntegrationError;

@RestController
@RequestMapping(path = "api/v1/integration")
public class IntegrationController {

    private final IntegrationService integrationService;

    public IntegrationController(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @Operation(summary = "Get all integrations")
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponse(responseCode = "200", description = "Provides a list of integrations", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
            @ExampleObject(name = "integrations", externalValue = "https://mpassid-rr-test.csc.fi/integrations.json") }))
    @GetMapping("/list")
    public List<Integration> getIntegrations() {
        return integrationService.getIntegrations();
    }

    @Operation(summary = "Search paged integrations")
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @GetMapping("/search")
    public Page<Integration> getIntegrationsSpecSearchPageable(
            @RequestParam(required = false, value = "search") String search,
            @RequestParam(required = false, value = "type") String filterByType,
            @RequestParam(required = false, value = "role") String role,
            @RequestParam(required = false, value = "deploymentPhase") String deploymentPhase,
            Pageable pageable) {
        try {
            return integrationService.getIntegrationsSpecSearchPageable(search, filterByType, role, deploymentPhase,
                    pageable);
        } catch (PropertyReferenceException exc) {
            throw new ResponseStatusException(
                    HttpStatus.SC_NOT_FOUND, "Integration Not Found", exc);
        }
    }

    @Operation(summary = "Get the specific integration")
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Provides the specific integration", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
                    @ExampleObject(name = "integrations", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
            @ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @GetMapping("{id}")
    public Optional<Integration> getIntegration(@PathVariable Long id) {
        return integrationService.getSpecIntegrationById(id);
    }
}