create table attribute_history (
    rev integer not null,
    revtype smallint,
    configuration_entity_id bigint,
    id bigint not null,
    content varchar(255),
    description varchar(255),
    name varchar(255),
    oid varchar(255),
    type varchar(255),
    primary key (rev, id)
)