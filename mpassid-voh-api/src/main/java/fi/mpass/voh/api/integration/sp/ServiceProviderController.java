package fi.mpass.voh.api.integration.sp;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
        @ApiResponse(responseCode = "200", description = "Provides a list of distinct ServiceProvider types",
            content = @Content(mediaType = "application/json",
                            array = @ArraySchema(schema = @Schema(implementation = String.class)), 
                            examples = { @ExampleObject(name = "ServiceProvider types", value = "[ \"oidc\", \"saml\" ]") } )),
        @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @GetMapping("/types")
    public List<String> getServiceProviderTypes() {
        return this.serviceProviderRepository.findDistinctType();
    }
}
