package fi.mpass.voh.api.integration.attribute;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;

@RestController
@RequestMapping(path = "api/v2/attribute")
public class AttributeController {

    private final AttributeService attributeService;

    public AttributeController(AttributeService attributeService) {
        this.attributeService = attributeService;
    }

    @Operation(summary = "Get a list of available attribute names")
    @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA') or @authorize.hasPermission(#root, 'Integration', 'PALVELU_TALLENTAJA') or @authorize.hasPermission(#root, 'Integration', 'PALVELU_KATSELIJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = String.class)))),
            @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @GetMapping("/names")
    public List<String> getAttributeNames() {
        // return this.attributeRepository.findDistinctName();
        return this.attributeService.getConfiguredAttributeNames();
    }

    @Operation(summary = "Get a list of configured attributes")
    @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = String.class)))),
            @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @GetMapping("/list")
    public List<Attribute> getAttributes() {
        return this.attributeService.getConfiguredAttributes();
    }

    @Operation(summary = "Test attributes")
    @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json", examples = { @ExampleObject(name = "types", value = "{ \"displayName\": \"displayName\",\n" + //
                                "    \"givenName\": \"givenName\",\n" + //
                                "    \"surname\": \"surname\",\n" + //
                                "    \"onPremisesExtensionAttributes.extensionAttribute14\": \"nickname\"}" ) })),
            @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @GetMapping("/test")
    public Map<String, Object> testAttributes(@RequestParam(required = true, value = "principal") String principalName,
            @RequestParam(required = true, value = "select") List<String> selectedAttributes) {
        return this.attributeService.testAttributes(principalName, selectedAttributes);
    }

    @Operation(summary = "Test attributes authorization")
    @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @PostMapping("/test/authorization")
    public boolean testAttributesAuthorization(@Valid @RequestBody AttributeTestAuthorizationRequestBody requestBody) {
        return this.attributeService.testAttributesAuthorization(requestBody);
    }

    @Operation(summary = "Test attributes authorization with tenant id")
    @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @PostMapping("/test/authorization/tenant")
    public boolean testAttributesAuthorizationWithTenantId(@Valid @RequestBody AttributeTestAuthorizationRequestBody requestBody) {
        return this.attributeService.testAttributesAuthorization(requestBody);
    }
}