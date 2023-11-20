package fi.mpass.voh.api.integration;

import java.io.IOException;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

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
        gen.writeEndObject();
    }
}