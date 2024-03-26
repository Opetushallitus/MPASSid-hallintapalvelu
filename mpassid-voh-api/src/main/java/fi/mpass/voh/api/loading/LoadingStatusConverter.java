package fi.mpass.voh.api.loading;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.stream.*;

@Converter(autoApply = true)
public class LoadingStatusConverter implements AttributeConverter<LoadingStatus, Integer> {
 
    @Override
    public Integer convertToDatabaseColumn(LoadingStatus loadingStatus) {
        if (loadingStatus == null) {
            return 3;
        }
        return loadingStatus.getCode();
    }

    @Override
    public LoadingStatus convertToEntityAttribute(Integer code) {
        if (code == null) {
            return null;
        }

        return Stream.of(LoadingStatus.values())
          .filter(c -> c.getCode().equals(code))
          .findFirst()
          .orElseThrow(IllegalArgumentException::new);
    }
}
