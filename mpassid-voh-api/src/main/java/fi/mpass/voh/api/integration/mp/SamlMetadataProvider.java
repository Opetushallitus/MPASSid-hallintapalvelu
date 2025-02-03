package fi.mpass.voh.api.integration.mp;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import net.shibboleth.utilities.java.support.component.ComponentInitializationException;
import net.shibboleth.utilities.java.support.xml.BasicParserPool;
import net.shibboleth.utilities.java.support.xml.ParserPool;
import net.shibboleth.utilities.java.support.xml.XMLParserException;

import org.opensaml.core.config.ConfigurationService;
import org.opensaml.core.xml.XMLObject;
import org.opensaml.core.xml.config.XMLObjectProviderRegistry;
import org.opensaml.core.xml.io.Unmarshaller;
import org.opensaml.core.xml.io.UnmarshallerFactory;
import org.opensaml.core.xml.io.UnmarshallingException;
import org.opensaml.saml.saml2.metadata.IDPSSODescriptor;
import org.opensaml.saml.saml2.metadata.KeyDescriptor;
import org.opensaml.saml.saml2.metadata.impl.EntityDescriptorImpl;
import org.opensaml.security.credential.UsageType;
import org.opensaml.xmlsec.signature.X509Certificate;
import org.opensaml.xmlsec.signature.X509Data;

import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;

import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SamlMetadataProvider {
    private final Logger logger = LoggerFactory.getLogger(SamlMetadataProvider.class);

    XMLObjectProviderRegistry registry;

    private String metadata;

    private LocalDate metadataValidUntil;
    private LocalDate signingCertificateValidUntil;
    private LocalDate encryptionCertificateValidUntil;
    private String entityId;

    private final RestClient restClient;

    public SamlMetadataProvider(String metadataUrl) {

        registry = ConfigurationService.get(XMLObjectProviderRegistry.class);
        if (registry == null) {
            logger.debug("XMLObjectProviderRegistry did not exist in ConfigurationService, will be created");
            registry = new XMLObjectProviderRegistry();
            ConfigurationService.register(XMLObjectProviderRegistry.class, registry);
        }
        registry.setParserPool(getParserPool());

        restClient = RestClient.builder().requestFactory(new HttpComponentsClientHttpRequestFactory()).build();

        // catching an exception here vs. propagating it further to handle the error in,
        // e.g., an integration loader
        try {
            metadata = restClient.get()
                    .uri(metadataUrl)
                    .retrieve()
                    .body(String.class);
        } catch (Exception ex) {
            logger.error(ex.getMessage());
            metadata = null;
        }

        if (metadata != null) {
            extract();
        } else {
            logger.error("No extraction done from {}", metadataUrl);
        }
    }

    public SamlMetadataProvider(InputStream inputStream) {

        registry = ConfigurationService.get(XMLObjectProviderRegistry.class);
        if (registry == null) {
            logger.debug("XMLObjectProviderRegistry did not exist in ConfigurationService, will be created");
            registry = new XMLObjectProviderRegistry();
            ConfigurationService.register(XMLObjectProviderRegistry.class, registry);
        }
        registry.setParserPool(getParserPool());

        restClient = null;
        try {
            // TODO size sanity check
            metadata = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            logger.error(e.getMessage());
            metadata = null;
        }

        if (metadata != null) {
            extract();
        } else {
            logger.error("No extraction done");
        }
    }

    // TODO move to OpenSAMLConfig
    private ParserPool getParserPool() {
        BasicParserPool parserPool = new BasicParserPool();
        parserPool.setMaxPoolSize(100);
        parserPool.setCoalescing(true);
        parserPool.setIgnoreComments(true);
        parserPool.setIgnoreElementContentWhitespace(true);
        parserPool.setNamespaceAware(true);
        parserPool.setExpandEntityReferences(false);
        parserPool.setXincludeAware(false);

        final Map<String, Boolean> features = new HashMap<String, Boolean>();

        features.put("http://xml.org/sax/features/external-general-entities",
                Boolean.FALSE);
        features.put("http://xml.org/sax/features/external-parameter-entities",
                Boolean.FALSE);
        features.put("http://apache.org/xml/features/disallow-doctype-decl",
                Boolean.TRUE);
        features.put(
                "http://apache.org/xml/features/validation/schema/normalized-value",
                Boolean.FALSE);
        features.put("http://javax.xml.XMLConstants/feature/secure-processing",
                Boolean.TRUE);

        parserPool.setBuilderFeatures(features);
        // parserPool.setBuilderAttributes(new HashMap<String, Object>());

        try {
            parserPool.initialize();
        } catch (ComponentInitializationException e) {
            logger.error(e.getMessage(), e);
        }

        return parserPool;
    }

    public XMLObject doGetMetadata() {
        InputStream stream = new ByteArrayInputStream(metadata.getBytes(StandardCharsets.UTF_8));
        XMLObject metadata = null;

        try {
            Document document = registry.getParserPool().parse(stream);
            Element element = document.getDocumentElement();
            logger.trace(element.toString());

            UnmarshallerFactory umFactory = registry.getUnmarshallerFactory();
            Unmarshaller unmarshaller = umFactory.getUnmarshaller(element);
            if (unmarshaller == null) {
                logger.error("Unable to unmarshall message, no unmarshaller registered for message element");
            } else {
                metadata = unmarshaller.unmarshall(element);
            }
        } catch (XMLParserException e) {
            logger.error("Parsing exception: " + e);
        } catch (UnmarshallingException e) {
            logger.error("Unmarshalling exception: " + e);
        }
        return metadata;
    }

    private void extract() {
        XMLObject xmlMetadata;
        try {
            xmlMetadata = doGetMetadata();
            if (xmlMetadata == null) {
                logger.debug("xmlMetadata is null");
                return;
            }

            if (((EntityDescriptorImpl) xmlMetadata).getEntityID() != null) {
                this.entityId = ((EntityDescriptorImpl) xmlMetadata).getEntityID();
            }

            if (((EntityDescriptorImpl) xmlMetadata).getValidUntil() != null) {
                this.metadataValidUntil = LocalDate.ofInstant(((EntityDescriptorImpl) xmlMetadata).getValidUntil(),
                        ZoneId.systemDefault());
            }

            IDPSSODescriptor idpssoDescriptor = ((EntityDescriptorImpl) xmlMetadata)
                    .getIDPSSODescriptor("urn:oasis:names:tc:SAML:2.0:protocol");

            for (KeyDescriptor keyDescriptor : idpssoDescriptor.getKeyDescriptors()) {
                UsageType usageType = keyDescriptor.getUse();
                List<X509Data> x509Datas = keyDescriptor.getKeyInfo().getX509Datas();
                for (X509Data x509Data : x509Datas) {
                    for (X509Certificate x509Certificate : x509Data.getX509Certificates()) {
                        java.security.cert.X509Certificate x509Cert = createX509Certificate(x509Certificate.getValue());
                        if (x509Cert != null) {
                            Date notAfter = x509Cert.getNotAfter();
                            LocalDate notAfterLocalDate = notAfter.toInstant().atZone(ZoneId.systemDefault())
                                    .toLocalDate();
                            if (usageType == UsageType.SIGNING) {
                                if (this.signingCertificateValidUntil == null
                                        || this.signingCertificateValidUntil.isBefore(notAfterLocalDate)) {
                                    this.signingCertificateValidUntil = notAfterLocalDate;
                                }
                            }
                            if (usageType == UsageType.ENCRYPTION) {
                                if (this.encryptionCertificateValidUntil == null
                                        || this.encryptionCertificateValidUntil.isBefore(notAfterLocalDate)) {
                                    this.encryptionCertificateValidUntil = notAfterLocalDate;
                                }
                            }
                        }
                    }
                }
            }
        } catch (CertificateException | IOException e) {
            logger.error("Certificate exception: " + e);
        }
    }

    private java.security.cert.X509Certificate createX509Certificate(String x509)
            throws CertificateException, IOException {
        CertificateFactory cf = CertificateFactory.getInstance("X.509");

        String prefix = "-----BEGIN CERTIFICATE-----";
        String postfix = "-----END CERTIFICATE-----";

        if (x509.length() > 0) {
            if (!x509.contains(prefix)) {
                x509 = prefix + "\n" + x509;
            }
            if (!x509.contains(postfix)) {
                x509 = x509 + "\n" + postfix + "\n";
            }
        }

        InputStream x509InputStream = new ByteArrayInputStream(x509.getBytes());

        if (x509InputStream.available() > 0) {
            Certificate cert = cf.generateCertificate(x509InputStream);
            logger.trace(cert.toString());
            return (java.security.cert.X509Certificate) cert;
        }
        return null;
    }

    public LocalDate getMetadataValidUntil() {
        return this.metadataValidUntil;
    }

    public LocalDate getSigningCertificateValidUntil() {
        return this.signingCertificateValidUntil;
    }

    public LocalDate getEncryptionCertificateValidUntil() {
        return this.encryptionCertificateValidUntil;
    }

    public String getEntityId() {
        return this.entityId;
    }
}
