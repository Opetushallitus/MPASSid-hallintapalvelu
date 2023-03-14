create table allowed_service_providers (
    idp_ce_id int8 not null,
    sp_ce_id int8 not null,
    primary key (idp_ce_id, sp_ce_id)
);

alter table
    if exists allowed_service_providers
add
    constraint FKb6sfes3x9ev881rqav6bo5bos foreign key (sp_ce_id) references service_provider;

alter table
    if exists allowed_service_providers
add
    constraint FKcfq08phw4fx6vprfss6eds21o foreign key (idp_ce_id) references identity_provider;