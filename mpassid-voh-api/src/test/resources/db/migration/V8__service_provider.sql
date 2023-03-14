create table service_provider (
    configuration_entity_id int8 not null,
    name varchar(255),
    primary key (configuration_entity_id)
);

alter table
    if exists service_provider
add
    constraint FKo266bgkuqa73072tg338uw1k foreign key (configuration_entity_id) references configuration_entity;