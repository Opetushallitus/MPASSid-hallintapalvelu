create table integrations_groups (
    integration_id int8 not null,
    integration_group_id int8 not null,
    primary key (integration_id, integration_group_id)
);

alter table
    if exists integrations_groups
add
    constraint FKp3m07ygo6ql887106nvu2xsbl foreign key (integration_group_id) references integration_group;

alter table
    if exists integrations_groups
add
    constraint FKmff25kw8ydo5eit3mit7onusr foreign key (integration_id) references integration;