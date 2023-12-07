package fi.mpass.voh.api.integration.attribute;

import org.apache.commons.lang3.builder.DiffBuilder;
import org.apache.commons.lang3.builder.DiffResult;
import org.apache.commons.lang3.builder.ToStringStyle;

public class AttributeDiffBuilder {
    public static DiffResult<Attribute> compare(Attribute a1, Attribute a2) {
        if (a1 != null && a2 != null) {
            DiffBuilder<Attribute> diffBuilder = new DiffBuilder<Attribute>(a1, a2, ToStringStyle.DEFAULT_STYLE)
                    .append("name", a1.getName(), a2.getName())
                    .append("type", a1.getType(), a2.getType())
                    .append("content", a1.getContent(), a2.getContent());

            return diffBuilder.build();
        }
        return null;
    }
}
