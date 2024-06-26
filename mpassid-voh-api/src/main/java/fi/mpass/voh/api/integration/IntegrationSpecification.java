package fi.mpass.voh.api.integration;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;

import fi.mpass.voh.api.integration.idp.IdentityProvider;
import fi.mpass.voh.api.integration.set.IntegrationSet;
import fi.mpass.voh.api.integration.sp.ServiceProvider;
import fi.mpass.voh.api.organization.Organization;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * IntegrationSpecification implements Specification interface.
 * See
 * https://docs.spring.io/spring-data/jpa/docs/2.7.10/reference/html/#specifications
 */
public class IntegrationSpecification implements Specification<Integration> {
	private final static Logger logger = LoggerFactory.getLogger(IntegrationSpecification.class);

	private IntegrationSpecificationCriteria criteria;

	public IntegrationSpecification(final IntegrationSpecificationCriteria criteria) {
		super();
		this.criteria = criteria;
	}

	public IntegrationSpecificationCriteria getCriteria() {
		return criteria;
	}

	private boolean isIdpType(String type) {
		for (IdentityProvider.Type idpType : IdentityProvider.Type.values()) {
			if (idpType.name().equals(type))
				return true;
		}
		return false;
	}

	private boolean isSpType(String type) {
		for (ServiceProvider.Type spType : ServiceProvider.Type.values()) {
			if (spType.name().equals(type))
				return true;
		}
		return false;
	}

	private boolean isSetType(String type) {
		for (IntegrationSet.Type spType : IntegrationSet.Type.values()) {
			if (spType.name().equals(type))
				return true;
		}
		return false;
	}

	@Override
	public Predicate toPredicate(final Root<Integration> root, final CriteriaQuery<?> query,
			final CriteriaBuilder builder) {
		logger.debug(
				criteria.getOperation() + " " + criteria.getCategory() + " criteria: " + criteria.getKey() + ", value:"
						+ criteria.getValue());
		switch (criteria.getOperation()) {
			case EQUALITY:
				switch (criteria.getCategory()) {
					case IDP: {
						Join<Integration, IdentityProvider> integrationIdp = root.join("configurationEntity").join(
								"idp", JoinType.LEFT);
						return builder.equal(integrationIdp.get(criteria.getKey()), criteria.getValue());
					}
					case SP: {
						Join<Integration, ServiceProvider> integrationSp = root.join("configurationEntity").join("sp",
								JoinType.LEFT);
						return builder.equal(integrationSp.get(criteria.getKey()), criteria.getValue());
					}
					case SET: {
						Join<Integration, IntegrationSet> integrationSet = root.join("configurationEntity").join("set",
								JoinType.LEFT);
						return builder.equal(integrationSet.get(criteria.getKey()), criteria.getValue());
					}
					case ROLE: {
						Join<Integration, ConfigurationEntity> integrationCE = root.join("configurationEntity");
						if (criteria.getValue() != null) {
							// TODO consider refactoring/moving to Criteria
							if (criteria.isStringList()) {
								List<Predicate> predicateList = new ArrayList<>();
								for (String byRole : ((String) criteria.getValue()).split(",")) {
									Predicate typePredicate = builder.equal(integrationCE.get(criteria.getKey()),
											byRole);
									predicateList.add(typePredicate);
								}
								return builder.or(predicateList.toArray(Predicate[]::new));
							} else {
								return builder.equal(integrationCE.get(criteria.getKey()), criteria.getValue());
							}
						}
					}
					case DEPLOYMENT_PHASE: {
						if (criteria.getValue() != null) {
							// TODO consider refactoring/moving to Criteria
							if (criteria.isStringList()) {
								List<Predicate> predicateList = new ArrayList<>();
								for (String byPhase : ((String) criteria.getValue()).split(",")) {
									Predicate phasePredicate = builder.equal(root.get(criteria.getKey()),
											byPhase);
									predicateList.add(phasePredicate);
								}
								return builder.or(predicateList.toArray(Predicate[]::new));
							} else {
								return builder.equal(root.get(criteria.getKey()), criteria.getValue());
							}
						}
					}
					case TYPE: {
						if (criteria.getValue() != null) {
							Join<Integration, IdentityProvider> integrationIdp = root.join("configurationEntity").join(
									"idp",
									JoinType.LEFT);
							Join<Integration, ServiceProvider> integrationSp = root.join("configurationEntity").join(
									"sp",
									JoinType.LEFT);
							Join<Integration, ServiceProvider> integrationSet = root.join("configurationEntity").join(
									"set",
									JoinType.LEFT);

							// TODO consider refactoring/moving to Criteria
							if (criteria.isStringList()) {
								List<Predicate> predicateList = new ArrayList<>();
								for (String byType : ((String) criteria.getValue()).split(",")) {
									if (isIdpType(byType)) {
										Predicate typePredicate = builder.equal(integrationIdp.get(criteria.getKey()),
												byType);
										predicateList.add(typePredicate);
									}
									if (isSpType(byType)) {
										Predicate typePredicate = builder.equal(integrationSp.get(criteria.getKey()),
												byType);
										predicateList.add(typePredicate);
									}
									if (isSetType(byType)) {
										Predicate typePredicate = builder.equal(integrationSet.get(criteria.getKey()),
												byType);
										predicateList.add(typePredicate);
									}
								}
								return builder.or(predicateList.toArray(Predicate[]::new));
							} else {
								if (isIdpType((String) criteria.getValue())) {
									return builder.equal(integrationIdp.get(criteria.getKey()), criteria.getValue());
								}
								if (isSpType((String) criteria.getValue())) {
									return builder.equal(integrationSp.get(criteria.getKey()), criteria.getValue());
								}
								if (isSetType((String) criteria.getValue())) {
									return builder.equal(integrationSet.get(criteria.getKey()), criteria.getValue());
								}
							}
						}
					}
					case ORGANIZATION: {
						if (criteria.getValue() != null) {
							Join<Integration, Organization> integrationOrganization = root.join("organization");
							
							if (criteria.isStringList()) {
								List<Predicate> predicateList = new ArrayList<>();
								for (String organizationOid : (List<String>)criteria.getValue()) {
									Predicate typePredicate = builder.equal(integrationOrganization.get(criteria.getKey()),
											organizationOid);
									predicateList.add(typePredicate);
								}
								return builder.or(predicateList.toArray(Predicate[]::new));
							}
							return builder.equal(integrationOrganization.get(criteria.getKey()), criteria.getValue());
						}
					}
					// Integration, e.g. id
					default:
						return builder.equal(root.get(criteria.getKey()), criteria.getValue());
				}
			case CONTAINS:
				switch (criteria.getCategory()) {
					case SP: {
						Join<Integration, ServiceProvider> integrationSP = root.join("configurationEntity").join("sp",
								JoinType.LEFT);
						return builder.like(integrationSP.get(criteria.getKey()), "%" + criteria.getValue() + "%");
					}
					case ORGANIZATION: {
						Join<Integration, Organization> integrationOrganization = root.join("organization");
						return builder.like(integrationOrganization.get(criteria.getKey()),
								"%" + criteria.getValue() + "%");
					}
					case SET: {
						Join<Integration, IntegrationSet> integrationSet = root.join("configurationEntity").join("set",
								JoinType.LEFT);
						return builder.like(integrationSet.get(criteria.getKey()), "%" + criteria.getValue() + "%");
					}
					default:
						return builder.like(root.get(criteria.getKey()), "%" + criteria.getValue() + "%");
				}
			default:
				return null;
		}
	}
}