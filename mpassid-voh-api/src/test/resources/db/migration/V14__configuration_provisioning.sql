create table provisioning (
    deployment_phase int4 not null,
    last_time timestamp,
    primary key (deployment_phase)
);