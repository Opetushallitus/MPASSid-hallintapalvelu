package fi.mpass.voh.api.integration;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import jakarta.validation.Valid;

import org.apache.http.HttpStatus;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
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
@RequestMapping(path = "api/v2/integration")
public class IntegrationController {

	private final IntegrationService integrationService;

	public IntegrationController(IntegrationService integrationService) {
		this.integrationService = integrationService;
	}

	@Operation(summary = "Get all integrations", ignoreJsonView = true)
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
			@ExampleObject(name = "integrations", externalValue = "https://mpassid-rr-test.csc.fi/integrations.json") }))
	@GetMapping("/list")
	// @JsonView(value = IntegrationView.Default.class)
	public List<Integration> getIntegrations() {
		return integrationService.getIntegrations();
	}

	@Operation(summary = "Search paged integrations", ignoreJsonView = true)
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = PageIntegration.class), mediaType = "application/json", examples = {
					@ExampleObject(name = "searchIntegrations", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
			@ApiResponse(responseCode = "404", description = "No integrations found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping("/search")
	@Validated
	// @JsonView(value = IntegrationView.Default.class)
	public Page<Integration> getIntegrationsSpecSearchPageable(
			@RequestParam(required = false, value = "search") String search,
			@RequestParam(required = false, value = "type") String filterByType,
			@RequestParam(required = false, value = "role") String role,
			@RequestParam(required = false, value = "deploymentPhase") String deploymentPhase,
			@RequestParam(required = false, value = "referenceIntegration") Long referenceIntegration,
			@RequestParam(required = false, value = "status") Integer status,
			Pageable pageable) {
		try {
			if (!(referenceIntegration == null)) {
				return integrationService.getIntegrationsSpecSearchPageable(search, filterByType, role,
						deploymentPhase, referenceIntegration, status,
						pageable);
			} else {
				return integrationService.getIntegrationsSpecSearchPageable(search, filterByType, role,
						deploymentPhase, status,
						pageable);
			}
		} catch (PropertyReferenceException exc) {
			throw new ResponseStatusException(
					HttpStatus.SC_NOT_FOUND, "Integration Not Found", exc);
		}
	}

	@Operation(summary = "Get the specific integration", ignoreJsonView = true)
	@PreAuthorize("@authorize.hasPermission(#root, #id, 'KATSELIJA') or @authorize.hasPermission(#root, #id, 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
					@ExampleObject(name = "integration", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping("{id}")
	// @JsonView(value = IntegrationView.Default.class)
	public Optional<Integration> getIntegration(@PathVariable Long id) {
		return integrationService.getSpecIntegrationById(id);
	}

	@Operation(summary = "Update the specific integration")
	@PreAuthorize("@authorize.hasPermission(#root, #id, 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Integration update successful", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "405", description = "Integration update error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "409", description = "Integration update conflict", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@PutMapping("{id}")
	// @JsonView(value = IntegrationView.Default.class)
	Integration updateIntegration(@Valid @RequestBody Integration integration, @PathVariable Long id) {
		return integrationService.updateIntegration(id, integration);
	}

	@Operation(summary = "Get integrations since a point in time", ignoreJsonView = true)
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json", examples = {
					@ExampleObject(name = "integration", externalValue = "https://mpassid-rr-test.csc.fi/integration-idp.json") })),
			@ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping("/since/{timestamp}")
	// @JsonView(value = IntegrationView.Default.class)
	public List<Integration> getIntegrationsSince(
			@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime timestamp) {
		return integrationService.getIntegrationsSince(timestamp);
	}

	@Operation(summary = "Get a blank integration")
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Integration creation successful", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "405", description = "Integration creation error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping
	// @JsonView(value = IntegrationView.Default.class)
	Integration getBlankIntegration(@RequestParam(required = true, value = "role") String role,
			@RequestParam(required = true, value = "type") String type,
			@RequestParam(required = true, value = "organization") String oid,
			@RequestParam(required = false, value = "set") Long id) {
		return integrationService.createBlankIntegration(role, type, oid, id);
	}

	@Operation(summary = "Inactivate an integration")
	@PreAuthorize("@authorize.hasPermission(#root, #id, 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Integration inactivation successful", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "405", description = "Integration inactivation error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@DeleteMapping("{id}/inactive")
	// @JsonView(value = IntegrationView.Default.class)
	Integration inactivateIntegration(@PathVariable Long id) {
		return integrationService.inactivateIntegration(id);
	}

	@Operation(summary = "Create an integration")
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Integration creation successful", content = @Content(schema = @Schema(implementation = Integration.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "405", description = "Integration creation error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@PostMapping
	// @JsonView(value = IntegrationView.Default.class)
	Integration createIntegration(@Valid @RequestBody Integration integration) {
		return integrationService.createIntegration(integration);
	}

	@Operation(summary = "Get integration discovery information")
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = DiscoveryInformationDTO.class), mediaType = "application/json", examples = {
					@ExampleObject(name = "existingExcluded: given organization's integrations (identifiers) of which discovery information contains excluded schools (filtered by given institution types), existingIncluded: institution codes of the given organization's integrations' discovery information (filtered by given institution types)", value = " { \"existingExcluded\": [\"1000120\"], \"existingIncluded\": [\"00907\", \"05899\"] } ") })),
			@ApiResponse(responseCode = "404", description = "Integration not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping("/discoveryinformation")
	// @JsonView(value = IntegrationView.Default.class)
	public DiscoveryInformationDTO getIntegrationDiscoveryInformation(
			@RequestParam(required = true, value = "organizationOid") String organizationOid,
			@RequestParam(required = false, value = "institutionType") List<Integer> types) {
		return integrationService.getDiscoveryInformation(organizationOid, types);
	}

	@Operation(summary = "Update discovery information logo")
	@PreAuthorize("@authorize.hasPermission(#root, #id, 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "Integration discovery information update successful", content = @Content(schema = @Schema(implementation = String.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "405", description = "Integration discovery information update error", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@PostMapping(path = "{id}/discoveryinformation/logo", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
	public String uploadLogo(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
		return integrationService.saveImage(id, file);
	}

	@Operation(summary = "Get integration discovery information logo")
	@PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
	@ApiResponses(value = {
			@ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = ResponseEntity.class), mediaType = "application/octet-stream")),
			@ApiResponse(responseCode = "403", description = "Forbidden", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json")),
			@ApiResponse(responseCode = "404", description = "Resource not found", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
	})
	@GetMapping("/discoveryinformation/logo/{id}")
	// @JsonView(value = IntegrationView.Default.class)
	public ResponseEntity<Resource> getIntegrationDiscoveryInformationLogo(@PathVariable Long id) {
		InputStreamResource resource = integrationService.getDiscoveryInformationLogo(id);

		HttpHeaders headers = new HttpHeaders();
		headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + Long.toString(id));
		headers.add("Cache-Control", "no-cache, no-store, must-revalidate");
		headers.add("Pragma", "no-cache");
		headers.add("Expires", "0");

		return ResponseEntity.ok()
				.headers(headers)
				// .contentLength()
				.contentType(MediaType.APPLICATION_OCTET_STREAM)
				.body(resource);
	}
}
