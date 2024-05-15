package fi.mpass.voh.api.config.ui;

import java.util.List;

// import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.media.ArraySchema;

@RestController
@RequestMapping(path = "api/v2/ui/configuration")
public class UserInterfaceConfigurationController {

    private final DefaultUserInterfaceConfiguration defaultUserInterfaceConfiguration;

    private final DataUserInterfaceConfiguration dataUserInterfaceConfiguration;

    public UserInterfaceConfigurationController(DefaultUserInterfaceConfiguration defaultUserInterfaceConfiguration,
            DataUserInterfaceConfiguration dataUserInterfaceConfiguration) {
        this.defaultUserInterfaceConfiguration = defaultUserInterfaceConfiguration;
        this.dataUserInterfaceConfiguration = dataUserInterfaceConfiguration;
    }

    @Operation(summary = "Get user interface configuration", ignoreJsonView = true)
    // @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or
    // @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(array = @ArraySchema(schema = @Schema(implementation = String.class)), mediaType = "application/json"))
    @GetMapping("/data")
    public List<UserInterfaceConfiguration> getDataUserInterfaceConfiguration() {
        return dataUserInterfaceConfiguration.getUserInterfaceConfigurations();
    }

    @Operation(summary = "Get user interface configuration", ignoreJsonView = true)
    // @PreAuthorize("@authorize.hasPermission(#root, 'Integration', 'KATSELIJA') or
    // @authorize.hasPermission(#root, 'Integration', 'TALLENTAJA')")
    @ApiResponse(responseCode = "200", description = "OK", content = @Content(schema = @Schema(implementation = UserInterfaceConfiguration.class), mediaType = "application/json"))
    @GetMapping("/default")
    public UserInterfaceConfiguration getDefaultUserInterfaceConfiguration() {
        return defaultUserInterfaceConfiguration;
    }
}
