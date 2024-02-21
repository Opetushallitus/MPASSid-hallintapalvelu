create table integration_loading_status (
    loading_id int8 not null,
    status varchar(255),
    integration_id int8 not null,
    primary key (loading_id, integration_id)
)