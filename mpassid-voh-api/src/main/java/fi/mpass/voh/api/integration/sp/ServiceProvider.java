package fi.mpass.voh.api.integration.sp;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.DiscriminatorType;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Transient;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.annotation.JsonView;
import com.fasterxml.jackson.annotation.JsonSubTypes.Type;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;
import fi.mpass.voh.api.config.IntegrationView;
import fi.mpass.voh.api.integration.ConfigurationEntity;

import org.hibernate.envers.Audited;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Audited
@Entity
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type", discriminatorType = DiscriminatorType.STRING)
@Schema(subTypes = { OidcServiceProvider.class, SamlServiceProvider.class }, discriminatorMapping = {
        @DiscriminatorMapping(value = "oidc", schema = OidcServiceProvider.class),
        @DiscriminatorMapping(value = "saml", schema = SamlServiceProvider.class) })
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({ @Type(value = OidcServiceProvider.class, name = "oidc"),
        @Type(value = SamlServiceProvider.class, name = "saml") })
public abstract class ServiceProvider {
    private final static Logger logger = LoggerFactory.getLogger(ServiceProvider.class);

    public enum Type {
        oidc, saml
    }

    @Id
    @Column(name = "configuration_entity_id")
    @JsonIgnore
    private Long id;

    @OneToOne
    @MapsId
    @JoinColumn(name = "configuration_entity_id")
    @JsonIgnore
    private ConfigurationEntity configurationEntity;

    @Convert(converter = HashMapConverter.class)
    @Column(columnDefinition = "text")
    @JsonIgnore
    private Map<String, Object> metadataJson;

    @Column(name = "type", insertable = false, updatable = false)
    private String type;
    private String name;

    /*
     * Service Provider type specific identifiers used for the default
     * sorting/search implementation should be also declared here
     */
    /*
     * No getter or setter methods declared for these fields, only the corresponding
     * child class contains those methods
     */
    @Schema(example = "https://example.org/6ab309b7-f4d4-455a-9c88-857474ceea64")
    //@Column(unique = true)
    protected String entityId;
    //@Column(unique = true)
    protected String clientId;

    @Transient
    private final ObjectMapper objectMapper = new ObjectMapper();

    protected ServiceProvider() {
    }

    public Long getId() {
        return this.id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ConfigurationEntity getConfigurationEntity() {
        return this.configurationEntity;
    }

    public void setConfigurationEntity(ConfigurationEntity configurationEntity) {
        this.configurationEntity = configurationEntity;
    }

    public String getType() {
        if (this.type != null) {
            return this.type;
        }
        if (this.getClass().getSimpleName().toLowerCase().equals("samlserviceprovider")) {
            return "saml";
        }
        if (this.getClass().getSimpleName().toLowerCase().equals("oidcserviceprovider")) {
            return "oidc";
        }
        return this.getClass().getSimpleName().toLowerCase();
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    //@JsonView(value = IntegrationView.Excluded.class)
    public Map<String, Object> getMetadata() {
        return this.metadataJson;
    }

    private X509Certificate createX509Certificate(String x509) throws CertificateException, IOException {
        CertificateFactory cf = CertificateFactory.getInstance("X.509");

        if (x509.length() > 0) {
            if (!x509.contains("-----BEGIN CERTIFICATE-----")) {
                x509 = "-----BEGIN CERTIFICATE-----\n" + x509;
            }
            if (!x509.contains("-----END CERTIFICATE-----")) {
                x509 = x509 + "\n-----END CERTIFICATE-----\n";
            }
        }

        InputStream x509InputStream = new ByteArrayInputStream(x509.getBytes());

        if (x509InputStream.available() > 0) {
            Certificate cert = cf.generateCertificate(x509InputStream);
            logger.debug(cert.toString());
            return (X509Certificate) cert;
        }
        return null;
    }

    private Map<String, Object> addCertificateAttribute(Map<String, Object> hashMap, String certificate,
            String propertyPrefix) {
        if (certificate.length() > 0) {
            X509Certificate x509Cert;
            try {
                x509Cert = createX509Certificate(certificate);
                if (x509Cert != null) {
                    Date notAfter = x509Cert.getNotAfter();
                    hashMap.put(propertyPrefix + "NotAfter", new SimpleDateFormat("yyyy-MM-dd").format(notAfter));
                    return hashMap;
                }
            } catch (CertificateException | IOException e) {
                hashMap.put(propertyPrefix + "Error", e.getMessage());
                logger.error("Exception: {}", e.toString());
            }
        }
        return hashMap;
    }

    public void setMetadata(Map<String, Object> hashMap) {
        logger.debug("instance type: {}", this.getClass());
        try {
            if (this instanceof SamlServiceProvider) {
                logger.info("SAML entityId: {}", hashMap.get("entityId"));
                List<String> certificateTypes = List.of("encryptionCertificates", "signingCertificates");
                for (String certType : certificateTypes) {
                    if (hashMap.get(certType) instanceof java.util.ArrayList) {
                        int certificateCount = 0;
                        for (String cert : (ArrayList<String>) hashMap.get(certType)) {
                            hashMap = addCertificateAttribute(hashMap, cert, certType + certificateCount);
                            certificateCount++;
                        }
                    } else {
                        hashMap = addCertificateAttribute(hashMap, (String) hashMap.get(certType), certType);
                    }
                }
                ((SamlServiceProvider) this).setEntityId((String) hashMap.get("entityId"));
            }
            if (this instanceof OidcServiceProvider) {
                logger.info("OIDC clientId: {}", hashMap.get("client_id"));
                ((OidcServiceProvider) this).setClientId((String) hashMap.get("client_id"));
            }
            this.metadataJson = hashMap;
        } catch (Exception e) {
            Map<String, Object> errorHashMap = new HashMap<>();
            errorHashMap.put("Error", e.getMessage());
            this.metadataJson = errorHashMap;
        }
    }
}
