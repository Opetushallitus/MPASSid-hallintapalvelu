create table discovery_information_excluded_schools (
    discovery_information_id int8 not null,
    schools varchar(255)
);

alter table
    if exists discovery_information_excluded_schools
add
    constraint FKbj8qlmph13pc9pm5t18mqkmj4 foreign key (discovery_information_id) references discovery_information;