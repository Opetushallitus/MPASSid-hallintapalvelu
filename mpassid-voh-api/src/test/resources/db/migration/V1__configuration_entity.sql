create table configuration_entity (
    id int8 generated by default as identity,
    role varchar(64),
    primary key (id)
);