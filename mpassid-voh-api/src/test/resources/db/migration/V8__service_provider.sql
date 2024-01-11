create table service_provider (
    configuration_entity_id int8 not null,
    name varchar(255),
    type varchar(31) not null,
    metadata_json text,
    client_id varchar(2048),
    entity_id varchar(1024),
    primary key (configuration_entity_id)
);

alter table
    if exists service_provider
add
    constraint FKo266bgkuqa73072tg338uw1k foreign key (configuration_entity_id) references configuration_entity;