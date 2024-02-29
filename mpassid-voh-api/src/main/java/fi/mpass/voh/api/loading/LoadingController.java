package fi.mpass.voh.api.loading;

import javax.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import fi.mpass.voh.api.exception.IntegrationError;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@SecurityRequirement(name = "loading")
@RequestMapping(path = "api/v2/loading")
public class LoadingController {

    private final LoadingService loadingService;

    public LoadingController(LoadingService loadingService) {
        this.loadingService = loadingService;
    }

    @Operation(summary = "Get status of the most recently initiated integration loadings per type")
    @PreAuthorize("hasPermission('Loading', 'ADMIN')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(array = @ArraySchema(schema = @Schema(implementation = LoadingStatus.class)), mediaType = "application/json"))
    @GetMapping("/status")
    public Loading getLoadingStatus() {
        return loadingService.getLoadingStatus();
    }

    @Operation(summary = "Start integration loading")
    @PreAuthorize("hasPermission('Loading', 'ADMIN')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = Loading.class), mediaType = "application/json")),
            @ApiResponse(responseCode = "409", description = "Loading conflict", content = @Content(schema = @Schema(implementation = IntegrationError.class), mediaType = "application/json"))
    })
    @PostMapping("/start")
    public Loading start(@Valid @RequestBody Loading loading) {
        return loadingService.start(loading);
    }
}
