package fi.mpass.voh.api.integration;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import fi.mpass.voh.api.integration.IntegrationSpecificationCriteria.Category;

public class IntegrationSpecificationsBuilder {
    private final List<IntegrationSpecificationCriteria> criteria;

    public IntegrationSpecificationsBuilder() {
        criteria = new ArrayList<>();
    }

    public final IntegrationSpecificationsBuilder withEqualAnd(final Category category, final String key, final Object value) {
        criteria.add(new IntegrationSpecificationCriteria(false, category, key,
                IntegrationSpecificationCriteria.Operation.EQUALITY, value));
        return this;
    }

    public final IntegrationSpecificationsBuilder withEqualOr(final Category category, final String key, final Object value) {
        criteria.add(new IntegrationSpecificationCriteria(true, category, key,
                IntegrationSpecificationCriteria.Operation.EQUALITY, value));
        return this;
    }

    public final IntegrationSpecificationsBuilder withContainOr(final Category category, final String key, final Object value) {
        criteria.add(new IntegrationSpecificationCriteria(true, category, key,
                IntegrationSpecificationCriteria.Operation.CONTAINS, value));
        return this;
    }

    public Specification<Integration> build() {
        if (criteria.size() == 0)
            return null;

        Specification<Integration> result = new IntegrationSpecification(criteria.get(0));

        for (int i = 1; i < criteria.size(); i++) {
            result = criteria.get(i).isOr()
                    ? Specification.where(result).or(new IntegrationSpecification(criteria.get(i)))
                    : Specification.where(result).and(new IntegrationSpecification(criteria.get(i)));
        }

        return result;
    }
}
