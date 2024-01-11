create table identity_provider (
    type varchar(31) not null,
    configuration_entity_id int8 not null,
    flow_name varchar(255),
    idp_id varchar(255),
    logo_url varchar(255),
    entity_id varchar(255),
    tenant_id varchar(255),
    wilma_hostname varchar(255),
    metadata_url varchar(255),
    metadata_valid_until date,
    signing_certificate_valid_until date,
    encryption_certificate_valid_until date,
    primary key (configuration_entity_id)
);

alter table
    if exists identity_provider
add
    constraint FK964vbdbnxq7qqo1cw0qgl9h6d foreign key (configuration_entity_id) references configuration_entity;