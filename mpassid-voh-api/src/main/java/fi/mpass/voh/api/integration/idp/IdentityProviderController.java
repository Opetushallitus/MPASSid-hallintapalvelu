package fi.mpass.voh.api.integration.idp;

import java.util.List;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import fi.mpass.voh.api.exception.IntegrationError;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.ExampleObject;

@RestController
@RequestMapping(path = "api/v2/idp")
public class IdentityProviderController {

    private final IdentityProviderRepository identityProviderRepository;
    private final IdentityProviderService identityProviderService;

    public IdentityProviderController(IdentityProviderRepository identityProviderRepository, IdentityProviderService identityProviderService) {
        this.identityProviderRepository = identityProviderRepository;
        this.identityProviderService = identityProviderService;
    }

    @Operation(summary = "Get a list of distinct IdentityProvider types")
    @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA') or @authorize.hasPermission(#root, 'Integration', 'PALVELU_KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'PALVELU_TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(mediaType = "application/json", array = @ArraySchema(schema = @Schema(implementation = String.class)), examples = { @ExampleObject(name = "types", value = "[\"adfs\", \"wilma\", \"gsuite\", \"azure\", \"opinsys\" ]" ) }))
    })
    @GetMapping("/types")
    public List<String> getIdentityProviderTypes() {
        return identityProviderRepository.findDistinctType();
    }

    @Operation(summary = "Update SAML metadata")
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "SAML metadata update successful", content = @Content(schema = @Schema(implementation = String.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "405", description = "SAML metadata update error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@PostMapping(path = "/saml/metadata", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
	public String uploadSAMLMetadata(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        // return metadata url
		return identityProviderService.saveMetadata(id, file);
	}

	@Operation(summary = "Get SAML metadata")
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = ResponseEntity.class), mediaType = "application/octet-stream")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "404", description = "Resource not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping("/saml/metadata/{entityId}")
	public ResponseEntity<Resource> getSAMLMetadata(@PathVariable String entityId) {
		InputStreamResource resource = identityProviderService.getSAMLMetadata(entityId);

		HttpHeaders headers = new HttpHeaders();
		headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + entityId);
		headers.add("Cache-Control", "no-cache, no-store, must-revalidate");
		headers.add("Pragma", "no-cache");
		headers.add("Expires", "0");

		return ResponseEntity.ok()
				.headers(headers)
				.body(resource);
	}
}
