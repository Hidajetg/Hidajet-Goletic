DO $test$
DECLARE
  tbl text;
  count_rooms integer;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'solstone_chat_rooms',
    'solstone_chat_members',
    'solstone_chat_messages',
    'solstone_chat_pending_uploads',
    'solstone_chat_reads',
    'solstone_chat_translations',
    'solstone_chat_push_subscriptions'
  ] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class
            WHERE oid=('public.'||tbl)::regclass) THEN
      RAISE EXCEPTION 'RLS not enabled on %',tbl;
    END IF;
    IF has_table_privilege('anon','public.'||tbl,'SELECT') OR
       has_table_privilege('anon','public.'||tbl,'INSERT') OR
       has_table_privilege('anon','public.'||tbl,'UPDATE') OR
       has_table_privilege('anon','public.'||tbl,'DELETE') OR
       has_table_privilege('authenticated','public.'||tbl,'SELECT') THEN
      RAISE EXCEPTION 'Chat table accidentally exposed: %',tbl;
    END IF;
    IF NOT has_table_privilege('service_role','public.'||tbl,'SELECT') THEN
      RAISE EXCEPTION 'Server role cannot access %',tbl;
    END IF;
  END LOOP;

  SELECT count(*) INTO count_rooms
  FROM storage.buckets WHERE id='solstone-team-chat' AND public=false
     AND file_size_limit=20971520;
  IF count_rooms<>1 THEN RAISE EXCEPTION 'Private 20MB bucket not created'; END IF;
END
$test$;

insert into public.solstone_chat_rooms(kind,site_id,created_by)
values ('site',2001,1003);
insert into public.solstone_chat_rooms(kind,private_pair,created_by)
values ('private','1001:1002',1001);
insert into public.solstone_chat_rooms(kind,created_by)
values ('announcements',1003);

insert into public.solstone_chat_members(room_id,worker_id)
select id,1001 from public.solstone_chat_rooms where kind='private';
insert into public.solstone_chat_members(room_id,worker_id)
select id,1002 from public.solstone_chat_rooms where kind='private';

insert into public.solstone_chat_messages(room_id,sender_id,body)
select id,1001,'Hello from sample worker'
from public.solstone_chat_rooms where kind='private';

insert into public.solstone_chat_translations(message_id,target_lang,translated_text)
select id,'ba','Zdravo' from public.solstone_chat_messages;

insert into public.solstone_chat_reads(room_id,worker_id)
select id,1002 from public.solstone_chat_rooms where kind='private';

insert into public.solstone_chat_push_subscriptions(worker_id,endpoint)
values(1001,'https://fcm.googleapis.com/fcm/send/solstone-test-subscription');

DO $test$
BEGIN
  IF (SELECT count(*) FROM public.solstone_chat_push_subscriptions)<>1 THEN
    RAISE EXCEPTION 'Push subscription insert failed';
  END IF;
  IF (SELECT count(*) FROM public.solstone_chat_rooms)<>3 THEN
    RAISE EXCEPTION 'Room shape insert failed';
  END IF;
  IF (SELECT count(*) FROM public.solstone_chat_translations)<>1 THEN
    RAISE EXCEPTION 'Translation cache insert failed';
  END IF;
  IF (SELECT count(*) FROM public.solstone_chat_reads)<>1 THEN
    RAISE EXCEPTION 'Unread receipt insert failed';
  END IF;
END
$test$;
