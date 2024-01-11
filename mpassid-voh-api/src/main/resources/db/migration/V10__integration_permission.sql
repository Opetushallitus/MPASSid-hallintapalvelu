create table integration_permission (
       last_updated_on timestamp,
        to_id bigint not null,
        from_id bigint not null,
        primary key (from_id, to_id)
);

alter table integration_permission 
       add constraint FKmh3e376cku1r7yhts2w105j43 
       foreign key (from_id) 
       references integration;
    
alter table integration_permission 
       add constraint FKr9u752vqukatl0v7peudnnggr 
       foreign key (to_id) 
       references integration;