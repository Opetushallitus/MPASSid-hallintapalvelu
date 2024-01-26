package fi.mpass.voh.api.integration;

import java.io.IOException;
import java.util.List;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.SamlServiceProvider;

public class IntegrationPermissionSerializer extends StdSerializer<Integration> {

    public IntegrationPermissionSerializer() {
        this(null);
    }

    public IntegrationPermissionSerializer(Class<Integration> i) {
        super(i);
    }

    @Override
    public void serialize(Integration value, JsonGenerator gen, SerializerProvider provider) throws IOException {
        gen.writeStartObject();
        gen.writeObjectField("id", value.getId());
        if (value.getIntegrationSets() != null) {
            // get sorted service provider integration sets
            List<Integration> integrations = value.getIntegrationSetsList();
            // "integrations" : [
            gen.writeArrayFieldStart("integrations");
            for (Integration integration : integrations) {
                if (integration.getConfigurationEntity().getSp().getType() != null) {
                    gen.writeStartObject();
                    gen.writeObjectField("type", integration.getConfigurationEntity().getSp().getType());
                    if (integration.getConfigurationEntity().getSp().getType().equals("oidc")) {
                        OidcServiceProvider oidc = (OidcServiceProvider) integration.getConfigurationEntity().getSp();
                        if (oidc != null) {
                            gen.writeObjectField("clientId", oidc.getClientId());
                        }
                    }
                    if (integration.getConfigurationEntity().getSp().getType().equals("saml")) {
                        SamlServiceProvider saml = (SamlServiceProvider) integration.getConfigurationEntity().getSp();
                        if (saml != null) {
                            gen.writeObjectField("entityId", saml.getEntityId());
                        }
                    }
                    gen.writeEndObject();
                }
            }
            gen.writeEndArray();
            // ]
        }
        gen.writeEndObject();
    }
}