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
    'solstone_chat_push_subscriptions',
    'solstone_calls',
    'solstone_call_signals'
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

insert into public.solstone_calls(caller_id,callee_id)
values(1001,1002);
insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
select id,1001,'offer','{"type":"offer","sdp":"test only"}'::jsonb from public.solstone_calls;

DO $test$
BEGIN
  IF (SELECT count(*) FROM public.solstone_calls)<>1 OR
     (SELECT count(*) FROM public.solstone_call_signals)<>1 THEN
    RAISE EXCEPTION 'Call signaling fixtures not created';
  END IF;
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


-- Negative security tests: accidental server-code mistakes must not make an
-- unrelated employee a participant in someone else's voice conversation.
DO $negative_calls$
DECLARE
  call_uuid uuid;
BEGIN
  select id into strict call_uuid from public.solstone_calls
    where caller_id=1001 and callee_id=1002;

  BEGIN
    insert into public.solstone_calls(caller_id,callee_id) values(1002,1003);
    raise exception 'Overlap guard did not block a second call';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1003,'candidate','{"candidate":"outsider"}');
    raise exception 'Outsider signal was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1001,'answer','{"type":"answer","sdp":"spoof"}');
    raise exception 'Caller was allowed to forge answer';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1002,'answer','{"type":"answer","sdp":"too early"}');
    raise exception 'Callee was allowed to answer before accepting';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1001,'offer','{"type":"offer","sdp":"duplicate"}');
    raise exception 'Duplicate offer was stored';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  update public.solstone_calls set status='accepted',answered_at=now()
    where id=call_uuid;
  insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1002,'answer','{"type":"answer","sdp":"accepted"}');

  BEGIN
    insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1003,'candidate','{"candidate":"still outsider"}');
    raise exception 'Outsider signal was accepted after answer';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  update public.solstone_calls set status='ended',ended_at=now()
    where id=call_uuid;
  BEGIN
    insert into public.solstone_call_signals(call_id,sender_id,kind,payload)
    values(call_uuid,1001,'candidate','{"candidate":"late"}');
    raise exception 'Signal was accepted for ended call';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  insert into public.solstone_calls(caller_id,callee_id) values(1002,1003);
  IF (select count(*) from public.solstone_calls) <> 2 THEN
    raise exception 'Cleanly ended call did not release busy participants';
  END IF;
END
$negative_calls$;
