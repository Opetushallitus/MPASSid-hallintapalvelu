create table if not exists attribute (
    id int8 generated by default as identity,
    description varchar(255),
    name varchar(255),
    content varchar(255),
    oid varchar(255),
    type varchar(255),
    configuration_entity_id int8,
    primary key (id)
);

alter table if exists attribute add constraint FK64k69o8d0t028xejkrjaevc7n foreign key (configuration_entity_id) references configuration_entity;