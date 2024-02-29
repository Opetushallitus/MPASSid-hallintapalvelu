package fi.mpass.voh.api.loading;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;

import java.util.stream.*;

@Converter(autoApply = true)
public class LoadingTypeConverter implements AttributeConverter<LoadingType, Integer> {
 
    @Override
    public Integer convertToDatabaseColumn(LoadingType loadingType) {
        if (loadingType == null) {
            return 0;
        }
        return loadingType.getCode();
    }

    @Override
    public LoadingType convertToEntityAttribute(Integer code) {
        if (code == null) {
            return null;
        }

        return Stream.of(LoadingType.values())
          .filter(c -> c.getCode().equals(code))
          .findFirst()
          .orElseThrow(IllegalArgumentException::new);
    }
}
