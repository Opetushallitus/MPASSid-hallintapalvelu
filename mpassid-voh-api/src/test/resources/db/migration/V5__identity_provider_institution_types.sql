create table if not exists identity_provider_institution_types (
    configuration_entity_id int8 not null,
    institution_type int4
);

alter table
    if exists identity_provider_institution_types
add
    constraint FKkxp3txtqot8m2975jywlk3wtt foreign key (configuration_entity_id) references configuration_entity;