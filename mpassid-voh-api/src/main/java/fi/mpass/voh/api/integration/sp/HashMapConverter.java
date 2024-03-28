package fi.mpass.voh.api.integration.sp;

import java.util.HashMap;
import java.util.Map;

import jakarta.persistence.AttributeConverter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class HashMapConverter implements AttributeConverter<Map<String, Object>, String> {
    private static final Logger logger = LoggerFactory.getLogger(HashMapConverter.class);

    ObjectMapper objectMapper;

    public HashMapConverter() {
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String convertToDatabaseColumn(Map<String, Object> hashMap) {

        String hashMapJson = null;
        try {
            hashMapJson = objectMapper.writeValueAsString(hashMap);
        } catch (final JsonProcessingException e) {
            logger.error("JSON writing error", e);
        }
        return hashMapJson;
    }

    @Override
    public Map<String, Object> convertToEntityAttribute(String hashMapJSON) {

        Map<String, Object> hashMap = null;
        try {
            hashMap = objectMapper.readValue(hashMapJSON, 
            	new TypeReference<HashMap<String, Object>>() {});
        } catch (final Exception e) {
            logger.error("JSON reading error", e);
        }
        return hashMap;
    }
}