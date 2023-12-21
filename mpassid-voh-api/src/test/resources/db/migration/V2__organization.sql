create table if not exists organization (
    oid varchar(255) not null,
    business_id varchar(255),
    name varchar(255),
    primary key (oid)
);