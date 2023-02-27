package fi.mpass.voh.api.integration.attribute;

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
@RequestMapping(path = "api/v1/attribute")
public class AttributeController {

    private final AttributeRepository attributeRepository;

    public AttributeController(AttributeRepository attributeRepository) {
        this.attributeRepository = attributeRepository;
    }

    @Operation(summary = "Get a list of available attribute names")
    @PreAuthorize("hasPermission('Integration', 'KATSELIJA') or hasPermission('Integration', 'TALLENTAJA')")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Provides a list of available attribute names",
                content = @Content(mediaType = "application/json",
                                array = @ArraySchema(schema = @Schema(implementation = String.class)), 
                                examples = { @ExampleObject(name = "Attribute names", value = "[ \"foo\", \"bar\", \"zoo\" ]") } )),
            @ApiResponse(responseCode = "403", description = "Forbidden operation")
    })
    @GetMapping("/names")
    public List<String> getAttributeNames() {
        return this.attributeRepository.findDistinctName();
    }
}