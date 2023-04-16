create table discovery_information_schools (
    discovery_information_id int8 not null,
    schools varchar(255)
);

alter table
    if exists discovery_information_schools
add
    constraint FKg3i3i7lvp2up28a8f7os9cnoc foreign key (discovery_information_id) references discovery_information;