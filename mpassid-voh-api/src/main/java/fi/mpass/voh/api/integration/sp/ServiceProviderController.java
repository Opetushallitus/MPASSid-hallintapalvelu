package fi.mpass.voh.api.integration.sp;

import java.util.List;
import java.util.Optional;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fi.mpass.voh.api.exception.IntegrationError;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.ExampleObject;

@RestController
@RequestMapping(path = "api/v1/sp")
public class ServiceProviderController {
    
    private final ServiceProviderRepository serviceProviderRepository;

    public ServiceProviderController(ServiceProviderRepository serviceProviderRepository) {
        this.serviceProviderRepository = serviceProviderRepository;
    }

    @Operation(summary = "Get a list of distinct ServiceProvider types")
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "OK",
            content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = String.class)))),
        @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @GetMapping("/types")
    public List<String> getServiceProviderTypes() {
        return this.serviceProviderRepository.findDistinctType();
    }

    @Operation(summary = "Get the specific Service Provider")
    // @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Provides the specific service provider", content = @Content(schema = @Schema(implementation = ServiceProvider.class), mediaType = "application/json", examples = {
                    @ExampleObject(name = "serviceprovider", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
            @ApiResponse(responseCode = "404", description = "ServiceProvider not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @GetMapping("{id}")
    public ServiceProvider getServiceProvider(@PathVariable String id) {
        ServiceProvider oidcSp = serviceProviderRepository.findByClientId(id);
        ServiceProvider samlSp = serviceProviderRepository.findByEntityId(id);
        
        return Optional.ofNullable(oidcSp).orElse(samlSp);
    }
}
