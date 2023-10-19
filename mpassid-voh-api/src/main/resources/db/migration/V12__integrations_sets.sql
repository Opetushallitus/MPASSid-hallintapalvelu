create table integrations_sets (
    integration_id int8 not null,
    integration_set_id int8 not null,
    primary key (integration_id, integration_set_id)
);

alter table integrations_sets
add constraint FKem594fbvel5emvwacvxh2sfvi foreign key (integration_set_id) references integration;

alter table integrations_sets
add constraint FKfj6n42co6otdnxm3giy0717th foreign key (integration_id) references integration;