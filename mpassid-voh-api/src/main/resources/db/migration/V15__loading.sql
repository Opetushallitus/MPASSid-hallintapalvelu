create table loading (
    id int8 generated by default as identity,
    status int4,
    time timestamp,
    type int4,
    primary key (id)
)