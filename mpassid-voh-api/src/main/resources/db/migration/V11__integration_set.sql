create table integration_set (
    configuration_entity_id int8 not null,
    type varchar(255),
    name varchar(255),
    primary key (configuration_entity_id)
);
alter table if exists integration_set
add constraint FK4iq1c44dqv3or0jcn71a2wxja foreign key (configuration_entity_id) references configuration_entity;