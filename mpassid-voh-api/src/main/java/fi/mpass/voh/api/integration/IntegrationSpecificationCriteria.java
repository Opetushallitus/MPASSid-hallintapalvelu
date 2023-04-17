package fi.mpass.voh.api.integration;

public class IntegrationSpecificationCriteria {

    public enum Operation {
        EQUALITY, CONTAINS
    }

    public enum Category {
        INTEGRATION, IDP, SP, ROLE, TYPE, ORGANIZATION, DEPLOYMENT_PHASE
    }

    private Category category;
    private String key;
    private Operation operation;
    private Object value;
    private boolean or;

    public IntegrationSpecificationCriteria() { }

    public IntegrationSpecificationCriteria(final boolean or, final Category category, final String key, final Operation operation,
            final Object value) {
        this.or = or;
        this.category = category;
        this.key = key;
        this.operation = operation;
        this.value = value;
    }

    public IntegrationSpecificationCriteria(final boolean or, final String key, final Operation operation,
            final Object value) {
        this.or = or;
        this.key = key;
        this.operation = operation;
        this.value = value;
    }

    public Category getCategory() {
        return category;
    }

    public String getKey() {
        return key;
    }

    public Operation getOperation() {
        return operation;
    }

    public Object getValue() {
        return value;
    }

    public boolean isOr() {
        return or;
    }

    public boolean isStringList() {
        if (this.value instanceof String) {
            String v = (String) this.value;
            if (v.contains(",") && v.split(",").length > 1) {
                return true;
            }
        }
        return false;
    }
}