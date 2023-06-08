alter table if exists integration add integration_group_id int8;

alter table
    if exists integration
add
    constraint FI_ambam6y84lrdjd40kgx3qfy99 unique (integration_group_id);