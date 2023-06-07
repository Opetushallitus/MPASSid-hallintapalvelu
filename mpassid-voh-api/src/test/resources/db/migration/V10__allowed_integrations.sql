create table allowed_integrations (
    integration_id1 int8 not null,
    integration_id2 int8 not null,
    primary key (integration_id1, integration_id2)
);

alter table
    if exists allowed_integrations
add
    constraint FKptcetqic78q8oyy3k8dturlvn foreign key (integration_id1) references integration;

alter table
    if exists allowed_integrations
add
    constraint FKptcetqic78q8oyy3k8dt foreign key (integration_id2) references integration;