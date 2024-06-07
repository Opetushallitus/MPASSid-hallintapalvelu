package fi.mpass.voh.api.config.ui;

import java.util.LinkedHashMap;
import java.util.List;

public class UserInterfaceConfiguration {

    private String oid;
    private String type;
    private String name;
    private boolean mandatory;
    private int deploymentPhase;

    private List<String> validation;
    private List<LinkedHashMap<String, ?>> integrationType;

    public UserInterfaceConfiguration() { }

    public String getOid() {
        return oid;
    }

    public void setOid(String oid) {
        this.oid = oid;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isMandatory() {
        return mandatory;
    }

    public void setMandatory(boolean mandatory) {
        this.mandatory = mandatory;
    }

    public int getDeploymentPhase() {
        return deploymentPhase;
    }

    public void setDeploymentPhase(int deploymentPhase) {
        this.deploymentPhase = deploymentPhase;
    }

    public List<String> getValidation() {
        return validation;
    }

    public void setValidation(List<String> validation) {
        this.validation = validation;
    }

    public List<LinkedHashMap<String, ?>> getIntegrationType() {
        return integrationType;
    }

    public void setIntegrationType(List<LinkedHashMap<String, ?>> integrationType) {
        this.integrationType = integrationType;
    }
}
