package fi.mpass.voh.api;

import static org.assertj.core.api.Assertions.*;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Iterator;

import org.h2.tools.Server;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.history.Revision;
import org.springframework.data.history.RevisionMetadata.RevisionType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.transaction.support.TransactionTemplate;

import fi.mpass.voh.api.config.OPHRevisionEntity;
import fi.mpass.voh.api.integration.ConfigurationEntity;
import fi.mpass.voh.api.integration.DiscoveryInformation;
import fi.mpass.voh.api.integration.Integration;
import fi.mpass.voh.api.integration.IntegrationRepository;
import fi.mpass.voh.api.integration.idp.Opinsys;
import fi.mpass.voh.api.integration.sp.OidcServiceProvider;
import fi.mpass.voh.api.organization.Organization;
import fi.mpass.voh.api.organization.OrganizationRepository;

@SpringBootTest
@Import(EnversTestConfiguration.class)
class EnversIntegrationTests {

	@Autowired
	IntegrationRepository repository;
	@Autowired
	OrganizationRepository organizationRepository;
	@Autowired
	TransactionTemplate tx;

	@BeforeAll
	public static void init() throws SQLException {
		Server.createWebServer("-web", "-webAllowOthers", "-webPort", "8082").start();
	}

	@Test
	@WithMockUser(value = "testuser", roles = { "APP_MPASSID_KATSELIJA" })
	void testRepository() {

		var updated = prepareIntegrationHistory();

		var revisions = repository.findRevisions(updated.getId());

		var revisionIterator = revisions.iterator();

		checkNextRevision(revisionIterator, "serviceContactAddress@example.net", RevisionType.INSERT, "testuser");
		checkNextRevision(revisionIterator, "foo@bar", RevisionType.UPDATE, "testuser");
		checkNextRevision(revisionIterator, null, RevisionType.DELETE, "testuser");
		assertThat(revisionIterator.hasNext()).isFalse();

	}

	private void checkNextRevision(Iterator<Revision<Integer, Integration>> revisionIterator, String contactAddress,
			RevisionType revisionType, String userId) {

		assertThat(revisionIterator.hasNext()).isTrue();
		var revision = revisionIterator.next();
		assertThat(revision.getEntity().getServiceContactAddress()).isEqualTo(contactAddress);
		assertThat(revision.getMetadata().getRevisionType()).isEqualTo(revisionType);
		OPHRevisionEntity revisionEntity = revision.getMetadata().getDelegate();
		assertThat(revisionEntity.getUserId()).isEqualTo(userId);
	}

	private Integration prepareIntegrationHistory() {

		Integration integration = createIdpIntegration();

		// create
		var saved = tx.execute(__ -> repository.save(integration));
		assertThat(saved).isNotNull();

		saved.setServiceContactAddress("foo@bar");

		// update
		var updated = tx.execute(__ -> repository.save(saved));
		assertThat(updated).isNotNull();

		// delete
		tx.executeWithoutResult(__ -> repository.delete(updated));
		return updated;
	}

	private Integration createIdpIntegration() {

		DiscoveryInformation discoveryInformation = new DiscoveryInformation("Custom Display Name",
				"Custom Title", true);
		Organization organization = new Organization("Organization zyx", "123456-7", "1.2.3.4.5.6.7.8");
		ConfigurationEntity configurationEntity = new ConfigurationEntity();
		Opinsys opinsys = new Opinsys("tenantId");
		configurationEntity.setIdp(opinsys);
		organizationRepository.save(organization);

		Integration integration = new Integration(999L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
				0, discoveryInformation, organization,
				"serviceContactAddress@example.net");

		integration.addPermissionTo(createSpIntegration());

		return integration;
	}

	private Integration createSpIntegration() {

		Organization organization = new Organization("SP Organization zyx", "123456-7", "1.2.3.4.5.6.7.8");
		ConfigurationEntity configurationEntity = new ConfigurationEntity();
		OidcServiceProvider oidc = new OidcServiceProvider("clientId");
		configurationEntity.setSp(oidc);
		organizationRepository.save(organization);

		Integration integration = new Integration(111L, LocalDate.now(), configurationEntity, LocalDate.of(2023, 6, 30),
				0, null, organization,
				"spContactAddress@example.net");

		repository.save(integration);

		return integration;
	}
}