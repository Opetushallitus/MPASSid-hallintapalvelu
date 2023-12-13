package fi.mpass.voh.api.integration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang3.builder.DiffBuilder;
import org.apache.commons.lang3.builder.DiffResult;
import org.apache.commons.lang3.builder.ToStringStyle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import fi.mpass.voh.api.integration.attribute.Attribute;
import fi.mpass.voh.api.integration.idp.Adfs;
import fi.mpass.voh.api.integration.idp.Azure;
import fi.mpass.voh.api.integration.idp.Gsuite;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.idp.Wilma;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.integration.sp.SamlServiceProvider;

public class IntegrationDiffBuilder {
    private final static Logger logger = LoggerFactory.getLogger(IntegrationDiffBuilder.class);

    private static DiffBuilder<Integration> diffBuildAttributes(DiffBuilder<Integration> diffBuilder, Set<Attribute> a1,
            Set<Attribute> a2) {

        // compare integration attributes
        if (a1 != null && a2 != null) {
            Map<String, Attribute> map2 = a2.stream().collect(Collectors.toMap(Attribute::getName, a -> a));
            for (Attribute attr1 : a1) {
                if (map2.get(attr1.getName()) != null) {
                    diffBuilder.append("configurationEntity.attributes." + attr1.getName(), attr1.getName(),
                            (map2.get(attr1.getName())).getName());
                    diffBuilder.append("configurationEntity.attributes." + attr1.getName() + ".type",
                            attr1.getType(),
                            (map2.get(attr1.getName())).getType());
                    diffBuilder.append("configurationEntity.attributes." + attr1.getName() + ".content",
                            attr1.getContent(), (map2.get(attr1.getName())).getContent());

                    map2.remove(attr1.getName());
                } else {
                    logger.debug("Removed attribute " + attr1.getName() + " in input");
                    diffBuilder.append("configurationEntity.attributes." + attr1.getName(), attr1.getContent(), "");
                }

            }
            if (map2.size() > 0) {
                // during iteration the attributes were removed from the map2, if anything
                // remains, those are new attributes
                logger.debug("input has " + map2.size() + " new attributes");
                map2.forEach((name, attr) -> {
                    diffBuilder.append("configurationEntity.attributes." + name, "", name);
                    diffBuilder.append("configurationEntity.attributes." + name + ".type", "", attr.getType());
                    diffBuilder.append("configurationEntity.attributes." + name + ".content", "",
                            attr.getContent());
                });
            }
        }
        // the whole attributes array was removed from input
        if (a1 != null && a2 == null) {
            diffBuilder.append("configurationEntity.attributes.", "toberemoved", "");
        }

        return diffBuilder;
    }

    /* compare integration sets */
    public static DiffResult<Integration> compareSet(Integration i1, Integration i2) {
        if (i1.getConfigurationEntity().getSet() != null && i2.getConfigurationEntity().getSet() != null) {
            DiffBuilder<Integration> diffBuilder = new DiffBuilder<Integration>(i1, i2, ToStringStyle.DEFAULT_STYLE)
                    .append("id", i1.getId(), i2.getId())
                    .append("configurationEntity.set.name", i1.getConfigurationEntity().getSet().getName(),
                            i2.getConfigurationEntity().getSet().getName());

            if (i1.getOrganization() != null && i2.getOrganization() != null) {
                diffBuilder.append("organization.oid", i1.getOrganization().getOid(), i2.getOrganization().getOid());
            }
            if (i1.getOrganization() == null && i2.getOrganization() != null) {
                diffBuilder.append("organization.oid", "", i2.getOrganization().getOid());
            }

            diffBuilder = diffBuildAttributes(diffBuilder, i1.getConfigurationEntity().getAttributes(),
                    i2.getConfigurationEntity().getAttributes());

            return diffBuilder.build();
        }
        return null;
    }

    /* compare integration sps */
    public static DiffResult<Integration> compareSp(Integration i1, Integration i2) {
        if (i1.getConfigurationEntity().getSp() != null && i2.getConfigurationEntity().getSp() != null) {
            DiffBuilder<Integration> diffBuilder = new DiffBuilder<Integration>(i1, i2, ToStringStyle.DEFAULT_STYLE)
                    .append("id", i1.getId(), i2.getId())
                    .append("configurationEntity.sp.name", i1.getConfigurationEntity().getSp().getName(),
                            i2.getConfigurationEntity().getSp().getName());

            // compare type specific id
            if (i1.getConfigurationEntity().getSp() instanceof SamlServiceProvider) {
                diffBuilder.append("configurationEntity.sp.entityId",
                        ((SamlServiceProvider) i1.getConfigurationEntity().getSp()).getEntityId(),
                        ((SamlServiceProvider) i2.getConfigurationEntity().getSp()).getEntityId());
            }

            if (i1.getConfigurationEntity().getSp() instanceof OidcServiceProvider) {
                diffBuilder.append("configurationEntity.sp.clientId",
                        ((OidcServiceProvider) i1.getConfigurationEntity().getSp()).getClientId(),
                        ((OidcServiceProvider) i2.getConfigurationEntity().getSp()).getClientId());
            }

            // compare sp metadata
            Map<String, Object> metadata = i1.getConfigurationEntity().getSp().getMetadata();
            Set<String> i2Keys = i2.getConfigurationEntity().getSp().getMetadata().keySet();
            for (Map.Entry<String, Object> entry : metadata.entrySet()) {
                diffBuilder.append("configurationEntity.sp.metadata." + entry.getKey(),
                        i1.getConfigurationEntity().getSp().getMetadata().get(entry.getKey()),
                        i2.getConfigurationEntity().getSp().getMetadata().get(entry.getKey()));
                i2Keys.remove(entry.getKey());
            }
            // rest of the i2Keys are new metadata entries in input
            for (String key : i2Keys) {
                diffBuilder.append("configurationEntity.sp.metadata." + key, "",
                        i2.getConfigurationEntity().getSp().getMetadata().get(key));
            }

            // compare associated integration sets
            if (i1.getIntegrationSets() != null && i2.getIntegrationSets() != null) {
                List<Long> i1Ids = new ArrayList<Long>();
                for (Integration i : i1.getIntegrationSets()) {
                    i1Ids.add(i.getId());
                }
                i1Ids.sort(null);
                List<Long> i2Ids = new ArrayList<Long>();
                for (Integration i : i2.getIntegrationSets()) {
                    i2Ids.add(i.getId());
                }
                i2Ids.sort(null);
                diffBuilder.append("integrationSets", i1Ids, i2Ids);
            }

            if (i1.getOrganization() != null && i2.getOrganization() != null) {
                diffBuilder.append("organization.oid", i1.getOrganization().getOid(), i2.getOrganization().getOid());
            }
            if (i1.getOrganization() == null && i2.getOrganization() != null) {
                diffBuilder.append("organization.oid", "", i2.getOrganization().getOid());
            }

            diffBuilder = diffBuildAttributes(diffBuilder, i1.getConfigurationEntity().getAttributes(),
                    i2.getConfigurationEntity().getAttributes());

            return diffBuilder.build();
        }
        return null;
    }

    /* compare integration idps */
    public static DiffResult<Integration> compareIdp(Integration i1, Integration i2) {
        if (i1.getConfigurationEntity().getIdp() != null && i2.getConfigurationEntity().getIdp() != null) {
            DiffBuilder<Integration> diffBuilder = new DiffBuilder<Integration>(i1, i2, ToStringStyle.DEFAULT_STYLE)
                    .append("id", i1.getId(), i2.getId())
                    .append("configurationEntity.idp.flowName", i1.getConfigurationEntity().getIdp().getFlowName(),
                            i2.getConfigurationEntity().getIdp().getFlowName())
                    .append("configurationEntity.idp.idpId", i1.getConfigurationEntity().getIdp().getIdpId(),
                            i2.getConfigurationEntity().getIdp().getIdpId())
                    .append("configurationEntity.idp.logoUrl", i1.getConfigurationEntity().getIdp().getLogoUrl(),
                            i2.getConfigurationEntity().getIdp().getLogoUrl());

            // compare type specifics
            if (i1.getConfigurationEntity().getIdp() instanceof Azure) {
                diffBuilder.append("configurationEntity.idp.entityId",
                        ((Azure) i1.getConfigurationEntity().getIdp()).getEntityId(),
                        ((Azure) i2.getConfigurationEntity().getIdp()).getEntityId());

                diffBuilder.append("configurationEntity.idp.metadataUrl",
                        ((Azure) i1.getConfigurationEntity().getIdp()).getMetadataUrl(),
                        ((Azure) i2.getConfigurationEntity().getIdp()).getMetadataUrl());
            }

            if (i1.getConfigurationEntity().getIdp() instanceof Adfs) {
                diffBuilder.append("configurationEntity.idp.entityId",
                        ((Adfs) i1.getConfigurationEntity().getIdp()).getEntityId(),
                        ((Adfs) i2.getConfigurationEntity().getIdp()).getEntityId());

                diffBuilder.append("configurationEntity.idp.metadataUrl",
                        ((Adfs) i1.getConfigurationEntity().getIdp()).getMetadataUrl(),
                        ((Adfs) i2.getConfigurationEntity().getIdp()).getMetadataUrl());
            }

            if (i1.getConfigurationEntity().getIdp() instanceof Gsuite) {
                diffBuilder.append("configurationEntity.idp.entityId",
                        ((Gsuite) i1.getConfigurationEntity().getIdp()).getEntityId(),
                        ((Gsuite) i2.getConfigurationEntity().getIdp()).getEntityId());

                diffBuilder.append("configurationEntity.idp.metadataUrl",
                        ((Gsuite) i1.getConfigurationEntity().getIdp()).getMetadataUrl(),
                        ((Gsuite) i2.getConfigurationEntity().getIdp()).getMetadataUrl());
            }

            if (i1.getConfigurationEntity().getIdp() instanceof Opinsys) {
                diffBuilder.append("configurationEntity.idp.tenantId",
                        ((Opinsys) i1.getConfigurationEntity().getIdp()).getTenantId(),
                        ((Opinsys) i2.getConfigurationEntity().getIdp()).getTenantId());
            }

            if (i1.getConfigurationEntity().getIdp() instanceof Wilma) {
                diffBuilder.append("configurationEntity.idp.hostname",
                        ((Wilma) i1.getConfigurationEntity().getIdp()).getHostname(),
                        ((Wilma) i2.getConfigurationEntity().getIdp()).getHostname());
            }

            if (i1.getConfigurationEntity().getIdp().getInstitutionTypes() != null
                    && i2.getConfigurationEntity().getIdp().getInstitutionTypes() != null) {
                diffBuilder.append("configurationEntity.idp.institutionTypes",
                        i1.getConfigurationEntity().getIdp().getInstitutionTypes(),
                        i2.getConfigurationEntity().getIdp().getInstitutionTypes());
            }

            if (i1.getDiscoveryInformation() != null && i2.getDiscoveryInformation() != null) {
                diffBuilder.append("discoveryInformation.title",
                        i1.getDiscoveryInformation().getTitle(),
                        i2.getDiscoveryInformation().getTitle());
                diffBuilder.append("discoveryInformation.customDisplayName",
                        i1.getDiscoveryInformation().getCustomDisplayName(),
                        i2.getDiscoveryInformation().getCustomDisplayName());
                diffBuilder.append("discoveryInformation.showSchools",
                        i1.getDiscoveryInformation().getShowSchools(),
                        i2.getDiscoveryInformation().getShowSchools());
                diffBuilder.append("discoveryInformation.schools",
                        i1.getDiscoveryInformation().getSchools(),
                        i2.getDiscoveryInformation().getSchools());
                diffBuilder.append("discoveryInformation.excludedSchools",
                        i1.getDiscoveryInformation().getExcludedSchools(),
                        i2.getDiscoveryInformation().getExcludedSchools());
            }

            if (i1.getOrganization() != null && i2.getOrganization() != null) {
                diffBuilder.append("organization.oid", i1.getOrganization().getOid(), i2.getOrganization().getOid());
            }
            if (i1.getOrganization() == null && i2.getOrganization() != null) {
                diffBuilder.append("organization.oid", "", i2.getOrganization().getOid());
            }

            diffBuilder = diffBuildAttributes(diffBuilder, i1.getConfigurationEntity().getAttributes(),
                    i2.getConfigurationEntity().getAttributes());

            return diffBuilder.build();
        }
        return null;
    }
}
