alter table if exists service_provider add metadata_json text;
alter table if exists service_provider add client_id varchar(2048);
alter table if exists service_provider add entity_id varchar(1024);

alter table
    if exists service_provider
add
    constraint FI_cmbam6y84lsmep40kgx3qfy08 unique (client_id);

alter table
    if exists service_provider
add
    constraint FI_ambam6y84lsmep40kgx3qfy99 unique (entity_id);