package fi.mpass.voh.api.provisioning;

import java.util.List;
import fi.mpass.voh.api.integration.Integration;

public class IdentityProviders {
    List<Integration> identityProviders;

    public IdentityProviders(List<Integration> identityProviders) {
        this.identityProviders = identityProviders;
    }

    public List<Integration> getIdentityProviders() {
        return identityProviders;
    }

    public void setIdentityProviders(List<Integration> identityProviders) {
        this.identityProviders = identityProviders;
    }
}
