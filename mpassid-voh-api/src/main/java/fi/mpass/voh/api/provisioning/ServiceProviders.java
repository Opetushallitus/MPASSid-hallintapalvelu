package fi.mpass.voh.api.provisioning;

import java.util.List;

import fi.mpass.voh.api.integration.Integration;

public class ServiceProviders {
    List<Integration> serviceProviders;

    public ServiceProviders(List<Integration> serviceProviders) {
        this.serviceProviders = serviceProviders;
    }

    public List<Integration> getServiceProviders() {
        return serviceProviders;
    }

    public void setServiceProviders(List<Integration> serviceProviders) {
        this.serviceProviders = serviceProviders;
    }
}
