-- Disposable CI-only PostgreSQL fixtures. Never use in a real Supabase project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema storage;
create table storage.buckets(
  id text primary key, name text not null, public boolean not null,
  file_size_limit bigint, allowed_mime_types text[]
);

create table public.workers(
  id bigint primary key, name text not null,
  role text not null, active boolean not null default true
);
create table public.baustellen(
  id bigint primary key, naziv text not null,
  status text not null default 'Aktiv'
);
create table public.work_calendar(
  id bigint primary key, datum date not null,
  worker_name text not null, baustelle_id bigint
);

insert into public.workers (id,name,role) values
  (1001,'Sample Worker A','worker'),
  (1002,'Sample Worker B','worker'),
  (1003,'Sample Admin','admin');
insert into public.baustellen (id,naziv) values (2001,'Sample Site');
