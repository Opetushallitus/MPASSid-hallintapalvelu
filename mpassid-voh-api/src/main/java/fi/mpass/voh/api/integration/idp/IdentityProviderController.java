package fi.mpass.voh.api.integration.idp;

import java.util.List;

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
@RequestMapping(path = "api/v1/idp")
public class IdentityProviderController {

    private final IdentityProviderRepository identityProviderRepository;

    public IdentityProviderController(IdentityProviderRepository identuIdentityProviderRepository) {
        this.identityProviderRepository = identuIdentityProviderRepository;
    }

    @Operation(summary = "Get a list of distinct IdentityProvider types")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = String.class)), examples = { @ExampleObject(name = "types", value = "[\"adfs\", \"wilma\", \"gsuite\", \"azure\", \"opinsys\" ]" ) }))
    })
    @GetMapping("/types")
    public List<String> getIdentityProviderTypes() {
        return identityProviderRepository.findDistinctType();
    }
}
