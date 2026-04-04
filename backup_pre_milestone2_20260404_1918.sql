--
-- PostgreSQL database dump
--

\restrict bQTJ9VstHbgQY11pixqnfAJ6D2QamXcR1dpRYw5QY1O22AEHggFyBqrOUXBWv45

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: Game; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Game" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" uuid NOT NULL,
    "paymentStatus" text DEFAULT 'UNPAID'::text NOT NULL,
    "robuxshipStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "midtransOrderId" text,
    "robuxshipOrderId" text,
    "customerPriceIdr" integer NOT NULL,
    "midtransFeeIdr" integer,
    "robuxshipCostUsd" numeric(10,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "robloxGamepassId" text,
    "robloxUsername" text NOT NULL,
    "robuxAmount" integer,
    "productId" uuid
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "gameId" uuid,
    name text NOT NULL,
    "productType" text NOT NULL,
    "priceIdr" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "imageUrl" text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Review" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" uuid NOT NULL,
    "orderId" uuid NOT NULL,
    "productId" uuid,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SystemConfig; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemConfig" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SystemLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemLog" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "orderId" uuid,
    "serviceName" text NOT NULL,
    "eventType" text NOT NULL,
    "payloadData" jsonb NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    name text,
    role text DEFAULT 'customer'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
138f1bdd-cd7d-4560-8085-71e4733c72e7	\N	\N	\N	\N	google			2026-03-12 06:15:07.430105+00	2026-03-12 06:15:07.430105+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
b226db77-b57b-443b-a2d6-e44720780905	\N	\N	\N	\N	google			2026-03-12 06:17:38.379038+00	2026-03-12 06:17:38.379038+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
04218495-b55f-4b1b-8b75-842745abd170	\N	\N	\N	\N	google			2026-03-12 06:26:56.021912+00	2026-03-12 06:26:56.021912+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
6f898487-beb4-4b3e-a229-00cfc768d2ce	\N	\N	\N	\N	google			2026-03-12 06:30:46.82774+00	2026-03-12 06:30:46.82774+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
938e8c59-582a-4ddf-a2c0-4925487cd923	\N	\N	\N	\N	google			2026-03-21 09:32:11.622653+00	2026-03-21 09:32:11.622653+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
b8533ced-a7eb-4b44-b55c-77ae543ff2e7	\N	\N	\N	\N	google			2026-03-21 09:37:05.673266+00	2026-03-21 09:37:05.673266+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
458c5093-4bc4-4f4a-a8b5-e5ed649c6ea2	\N	\N	\N	\N	google			2026-03-21 09:37:14.375224+00	2026-03-21 09:37:14.375224+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
34fc612f-b5df-4935-9773-bb5ba4fffe8c	\N	\N	\N	\N	google			2026-03-21 09:38:39.767854+00	2026-03-21 09:38:39.767854+00	oauth	\N	\N	http://localhost:5173/auth/callback	\N	\N	f
cf3158ee-d412-4712-975d-6935870d5d94	\N	\N	\N	\N	google			2026-03-21 09:38:50.891172+00	2026-03-21 09:38:50.891172+00	oauth	\N	\N	https://eltopup.id/auth/callback	\N	\N	f
fd9a77e1-9715-4619-bf31-79b48cdb48b4	\N	\N	\N	\N	google			2026-03-21 12:16:39.595917+00	2026-03-21 12:16:39.595917+00	oauth	\N	\N	https://eltopup.id/auth/callback	\N	\N	f
840adcd7-9088-47db-8e01-5ce9ab98080a	\N	\N	\N	\N	google			2026-03-21 13:26:31.095336+00	2026-03-21 13:26:31.095336+00	oauth	\N	\N	https://eltopup.id/auth/callback	\N	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
c252cc9e-616a-4d42-ab16-6e37a1cb7fc6	c252cc9e-616a-4d42-ab16-6e37a1cb7fc6	{"sub": "c252cc9e-616a-4d42-ab16-6e37a1cb7fc6", "email": "tester@eltopup.id", "email_verified": false, "phone_verified": false}	email	2026-03-03 16:45:18.196276+00	2026-03-03 16:45:18.19633+00	2026-03-03 16:45:18.19633+00	71632118-ee4d-4f2e-a3b7-f90277342d90
7849b8bf-d369-4ffc-a245-b9924c5105f6	7849b8bf-d369-4ffc-a245-b9924c5105f6	{"sub": "7849b8bf-d369-4ffc-a245-b9924c5105f6", "email": "test@eltopup.id", "email_verified": false, "phone_verified": false}	email	2026-03-03 17:54:20.697914+00	2026-03-03 17:54:20.698532+00	2026-03-03 17:54:20.698532+00	6b4bf3ab-f63f-4610-b79c-d840a305f8c2
d27d2a11-cb52-4c0b-91b1-4e10d026cb40	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	{"sub": "d27d2a11-cb52-4c0b-91b1-4e10d026cb40", "email": "test123@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-03-05 07:37:27.951492+00	2026-03-05 07:37:27.95212+00	2026-03-05 07:37:27.95212+00	956bdb1c-8904-488b-87c1-99d7c57e2f3b
6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	{"sub": "6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221", "email": "test1772881979@eltopup.com", "full_name": "Test User", "email_verified": false, "phone_verified": false}	email	2026-03-07 11:13:02.203525+00	2026-03-07 11:13:02.203586+00	2026-03-07 11:13:02.203586+00	c20028aa-c3f4-449c-a32a-7f4fc1a85a48
115055755886422513835	3b189625-6cb4-44b2-9ecb-8aea02ac3ec7	{"iss": "https://accounts.google.com", "sub": "115055755886422513835", "name": "Stephanie Mae", "email": "stphaniemae@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocLUq9pwJshoH-sM6FYOHxuMqomlbEl8hjMgibx8rem-YdbdfJc=s96-c", "full_name": "Stephanie Mae", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocLUq9pwJshoH-sM6FYOHxuMqomlbEl8hjMgibx8rem-YdbdfJc=s96-c", "provider_id": "115055755886422513835", "email_verified": true, "phone_verified": false}	google	2026-03-12 06:30:05.136746+00	2026-03-12 06:30:05.136795+00	2026-03-12 06:30:05.136795+00	02392d93-421e-4e79-8d3f-1d125eec969c
107753681651091904894	a7b8ec78-5519-4f14-9202-134fabd34db2	{"iss": "https://accounts.google.com", "sub": "107753681651091904894", "name": "Svarin", "email": "svarin.fn@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocKuBxVnPVe6wwiW-UeRduF6DNaB6SHkl64kH2yLbGcN6KHwQQ=s96-c", "full_name": "Svarin", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocKuBxVnPVe6wwiW-UeRduF6DNaB6SHkl64kH2yLbGcN6KHwQQ=s96-c", "provider_id": "107753681651091904894", "email_verified": true, "phone_verified": false}	google	2026-03-21 09:39:25.84968+00	2026-03-21 09:39:25.849726+00	2026-03-21 12:11:23.678199+00	aa95e588-9c85-4488-a118-f5712f323da9
107319164970327002538	ad6814b4-9516-4c60-9f17-8b4cc98a1803	{"iss": "https://accounts.google.com", "sub": "107319164970327002538", "name": "Bryant Azraqi Mohammad", "email": "azraqibryant@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJlqpj3UZpYPRvX3RBdaLhMk2UGsgwnT_Cg8qn2xChRn5cFO0SPmQ=s96-c", "full_name": "Bryant Azraqi Mohammad", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJlqpj3UZpYPRvX3RBdaLhMk2UGsgwnT_Cg8qn2xChRn5cFO0SPmQ=s96-c", "provider_id": "107319164970327002538", "email_verified": true, "phone_verified": false}	google	2026-03-12 06:20:35.499382+00	2026-03-12 06:20:35.499456+00	2026-04-02 05:04:51.781712+00	f8455133-b7b4-474f-8ce8-914ccda6e4c9
0778a121-ebbd-4329-b9be-fb6902f76e71	0778a121-ebbd-4329-b9be-fb6902f76e71	{"sub": "0778a121-ebbd-4329-b9be-fb6902f76e71", "email": "test1774085802@eltopup.com", "full_name": "Test User", "email_verified": false, "phone_verified": false}	email	2026-03-21 09:36:43.335518+00	2026-03-21 09:36:43.335575+00	2026-03-21 09:36:43.335575+00	77e1ce78-5fee-494c-be65-b6ca74181a95
108593555893094133109	da6bc60b-76c7-4b3e-affd-3baf7aab3c20	{"iss": "https://accounts.google.com", "sub": "108593555893094133109", "name": "Maulana Ibrahim", "email": "mau.ibra5@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJM-vNoywM8j51iadsUEqKduzGCgXWqE0YXbOi19BgKkiSJWw=s96-c", "full_name": "Maulana Ibrahim", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJM-vNoywM8j51iadsUEqKduzGCgXWqE0YXbOi19BgKkiSJWw=s96-c", "provider_id": "108593555893094133109", "email_verified": true, "phone_verified": false}	google	2026-03-25 13:32:44.772708+00	2026-03-25 13:32:44.772761+00	2026-03-25 13:32:44.772761+00	5741d263-af7f-4b10-b86a-79643d5147aa
112363312217700356531	fd0f41c9-2cf8-47bd-a429-ef83a345317b	{"iss": "https://accounts.google.com", "sub": "112363312217700356531", "name": "abya hjasbuer", "email": "abayhasbuer33@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocLumu26aq9Vh42coK7E4MXpBkv5QCBkrXbeqR_Ps1Blgxgmyw=s96-c", "full_name": "abya hjasbuer", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocLumu26aq9Vh42coK7E4MXpBkv5QCBkrXbeqR_Ps1Blgxgmyw=s96-c", "provider_id": "112363312217700356531", "email_verified": true, "phone_verified": false}	google	2026-03-29 14:31:25.049048+00	2026-03-29 14:31:25.049098+00	2026-03-29 14:31:25.049098+00	9dc8af60-f19b-4d4c-9c69-cbd45a21280c
117807686941342501650	531b6779-0911-4e08-8cc4-b6193432e79e	{"iss": "https://accounts.google.com", "sub": "117807686941342501650", "name": "rayi puspita", "email": "rayipuspita99@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocL-HXdnFPRnSJVWUPZpje18m5f3KB_DWIqBZRTibndtfO0ex6Cf=s96-c", "full_name": "rayi puspita", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocL-HXdnFPRnSJVWUPZpje18m5f3KB_DWIqBZRTibndtfO0ex6Cf=s96-c", "provider_id": "117807686941342501650", "email_verified": true, "phone_verified": false}	google	2026-04-02 12:22:07.943427+00	2026-04-02 12:22:07.943475+00	2026-04-02 12:22:07.943475+00	9db3fa52-204a-46c2-ba30-6c96427d9617
117152051030528972535	178e575a-9471-4cb4-ae2d-e28c8743fac8	{"iss": "https://accounts.google.com", "sub": "117152051030528972535", "name": "18224067 Bryant Azraqi Mohammad", "email": "18224067@std.stei.itb.ac.id", "picture": "https://lh3.googleusercontent.com/a/ACg8ocKHWCKCMoz0xMP4YrpJSxp37cXEXddQp4rF5P9kdPWhLc0HAg=s96-c", "full_name": "18224067 Bryant Azraqi Mohammad", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocKHWCKCMoz0xMP4YrpJSxp37cXEXddQp4rF5P9kdPWhLc0HAg=s96-c", "provider_id": "117152051030528972535", "custom_claims": {"hd": "std.stei.itb.ac.id"}, "email_verified": true, "phone_verified": false}	google	2026-04-02 18:05:07.760457+00	2026-04-02 18:05:07.760512+00	2026-04-02 18:05:18.13288+00	95bf7c2d-665b-4b7c-abf5-28081faae9cd
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
6419682d-3259-49e8-867f-8fbc90a60c29	2026-03-03 16:45:18.226351+00	2026-03-03 16:45:18.226351+00	password	7713782d-5144-4265-a7d5-407f231e0d68
28ebbd8c-3667-4e92-9bb8-a4451b00f263	2026-03-03 17:54:20.754934+00	2026-03-03 17:54:20.754934+00	password	c3479d51-7fb8-40e2-bf0b-8222f680858c
8a40d9a0-5828-4190-ae51-2f06500f2169	2026-03-03 17:54:33.449379+00	2026-03-03 17:54:33.449379+00	password	852d5cb9-5a04-41a0-b912-0eab45158c33
8ef8a69a-4162-4598-919f-6014af275057	2026-03-03 18:04:05.164472+00	2026-03-03 18:04:05.164472+00	password	978265e8-2374-49b0-a514-1297ae742c8e
2234a03f-991f-4b23-8a8c-f9e2b041e779	2026-03-03 18:07:34.664034+00	2026-03-03 18:07:34.664034+00	password	f7aa352c-dff4-4970-be25-b5b52449f1a1
49c8444b-5b10-4445-9142-255223257976	2026-03-03 18:08:56.089894+00	2026-03-03 18:08:56.089894+00	password	2616d660-4713-48d5-b00a-c10e054e8e01
c01c6dac-2d59-45cd-a4f7-1e6b0136966e	2026-03-03 18:19:00.609897+00	2026-03-03 18:19:00.609897+00	password	8d514b5b-ad61-488a-b417-ba9dbfcfa2e3
3842c5a6-19bf-4999-b00b-5bfbc4e4360a	2026-03-03 18:31:13.177239+00	2026-03-03 18:31:13.177239+00	password	938b473d-d733-4372-999f-aa8f6a6af365
0a2e9880-04e6-4fa0-9bdb-96bd38f2ee7f	2026-03-05 07:37:28.007867+00	2026-03-05 07:37:28.007867+00	password	630303f9-f575-465e-9395-f80f66f53cff
0f7128e8-7de8-42aa-8556-56c58a12cdab	2026-03-05 09:25:11.057929+00	2026-03-05 09:25:11.057929+00	password	8ec32c3b-a698-4bc3-bd7b-c7cda57ea46a
414e7bd5-c69d-4120-a007-53c0b801f7d3	2026-03-05 09:25:31.079037+00	2026-03-05 09:25:31.079037+00	password	ebbff507-2595-477a-964c-1ec1f4d4e659
5263df3c-9d13-4923-b430-d5d6ec01e4e7	2026-03-07 11:13:02.243405+00	2026-03-07 11:13:02.243405+00	password	2913599d-b1cb-4df3-903b-1228a8ac3eae
dbc036c0-24bc-4190-8345-6b9e0fc865cc	2026-03-07 11:13:12.928461+00	2026-03-07 11:13:12.928461+00	password	41c11af0-c8cf-4877-884d-b917426f0c93
8981bb69-6dda-452c-aca0-5f337d694bb8	2026-03-12 05:37:01.05118+00	2026-03-12 05:37:01.05118+00	password	848d91d2-27e3-4d4b-b010-6610e3918ac1
fd4cfe2b-6add-462a-98f1-71139e0a1acc	2026-03-12 06:20:35.539313+00	2026-03-12 06:20:35.539313+00	oauth	5c40350e-2241-4425-8c52-a2f2d3c204a3
27f4e9a7-110b-499b-9e50-47463c88646c	2026-03-12 06:30:05.200674+00	2026-03-12 06:30:05.200674+00	oauth	a4239961-7865-4bd9-8c0d-f1ab2855d178
c2997863-850d-457d-803a-fa1ed1e4e48f	2026-03-16 20:20:31.62795+00	2026-03-16 20:20:31.62795+00	oauth	8dee4d0d-eecb-4929-9c50-92fc5fe42491
88bc4e47-c520-4602-b84b-510770436009	2026-03-16 20:21:16.009279+00	2026-03-16 20:21:16.009279+00	oauth	c4a2926f-2d55-43c0-bf99-f740661c66b8
956d3104-b8eb-4fb0-93be-eb29af1544f5	2026-03-16 20:26:17.402285+00	2026-03-16 20:26:17.402285+00	oauth	7c720f4c-ec2c-456c-a78c-363d3e117224
4a1897ef-6c31-4d0e-92f0-ac29bfe08a30	2026-03-16 20:59:25.09274+00	2026-03-16 20:59:25.09274+00	oauth	29d4fe20-6e73-4db2-bf04-db19417010d0
9e8fdb7d-ee3a-4e3c-99d6-a6ca1d9e719e	2026-03-16 21:01:44.518543+00	2026-03-16 21:01:44.518543+00	oauth	c0486d91-6cd1-4ada-9b70-83a56a6dd15f
b29e99fa-6d0c-43ef-8374-8904fbc8ed10	2026-03-16 21:03:28.437201+00	2026-03-16 21:03:28.437201+00	oauth	5b90b143-a94f-408b-9364-68dd8cb304f5
51d5c5ce-b577-4024-ab8b-e329691b25b3	2026-03-16 21:03:55.517032+00	2026-03-16 21:03:55.517032+00	oauth	e8539269-d043-4416-b95a-935664947ef6
b96281db-b06d-4686-bae7-a8d8749373c2	2026-03-16 21:05:35.734821+00	2026-03-16 21:05:35.734821+00	oauth	3f0b1735-501c-4a44-b6da-df9b949b3971
e19a9eff-7921-43c5-bb5a-af931038e8e2	2026-03-16 21:07:59.223634+00	2026-03-16 21:07:59.223634+00	oauth	ec46c6a7-4a0e-456b-9d3a-aade6ad5fd85
c5c5cc21-e520-46d8-8e2a-aeb16dc8888c	2026-03-16 21:13:25.998699+00	2026-03-16 21:13:25.998699+00	oauth	233e6598-b43e-4202-bd7d-c44e52fa079f
43802363-f85c-4e1d-859b-8a1a4d9646aa	2026-03-16 21:24:32.371307+00	2026-03-16 21:24:32.371307+00	oauth	286cb6bb-3775-4c5c-9488-27afac5112ff
7b52e633-cad5-4ce8-8d56-39188732e605	2026-03-16 21:26:05.871689+00	2026-03-16 21:26:05.871689+00	oauth	9f82f75f-9fc6-4a8b-a276-34bb6504202c
e2ac838b-3129-43ab-a301-e468b7d229d6	2026-03-16 21:26:22.204471+00	2026-03-16 21:26:22.204471+00	oauth	c7e06422-28c1-4867-a85b-78ee44ab6d63
f8ea338a-dfda-4fd5-b687-c2c2a8fc474c	2026-03-16 21:27:36.186466+00	2026-03-16 21:27:36.186466+00	oauth	7eeec39f-1213-47be-9642-4dc0b009f113
a2405cec-79e3-4f72-81ac-98cbe251f92f	2026-03-16 21:30:08.310732+00	2026-03-16 21:30:08.310732+00	oauth	e418d12f-67c3-4ad7-88b5-07b63b2c681a
e803327b-2ae8-4c55-bd36-10851899f665	2026-03-16 21:33:24.442156+00	2026-03-16 21:33:24.442156+00	oauth	0538959b-fb10-4b9b-8d27-97379431dbce
b8d4512b-211c-47cb-a312-271d6beba3f3	2026-03-16 21:42:32.83511+00	2026-03-16 21:42:32.83511+00	oauth	1c29283d-4733-4949-913e-c7f1baa8a402
0bd5aba4-544e-4fdc-a536-694bd485f336	2026-03-21 09:36:43.383616+00	2026-03-21 09:36:43.383616+00	password	b81cca00-1cd7-4602-8553-56fce5cb9c6a
2529399a-bdaa-4dcc-b9a8-094a8ebc4420	2026-03-21 09:36:44.562476+00	2026-03-21 09:36:44.562476+00	password	668bb1b9-58e6-41c4-91e9-bd7b41b2ce75
81fbf90e-0f73-41d7-8b83-18734ec5b193	2026-03-21 09:39:25.859208+00	2026-03-21 09:39:25.859208+00	oauth	30aadb9b-b1a6-4460-be5b-7141d428f79e
30940cf0-d64b-4ceb-8b17-59aa94ab666b	2026-03-21 09:40:47.384134+00	2026-03-21 09:40:47.384134+00	oauth	9ba8f2cc-0d3c-4943-931a-930e8fe09765
96132642-7934-43b6-82fc-8d51adf159cf	2026-03-21 09:41:29.800594+00	2026-03-21 09:41:29.800594+00	oauth	99142843-ec84-4449-9e2e-180a531bce50
662fc0d5-459f-425b-8642-0ea7686a395d	2026-03-21 10:14:12.032069+00	2026-03-21 10:14:12.032069+00	oauth	233e6a71-9652-4b4b-9384-994ea5f340e6
45965b54-bd23-4405-b08a-d4e5abdb475b	2026-03-21 10:48:22.267313+00	2026-03-21 10:48:22.267313+00	oauth	21916e23-e05f-4008-ac6a-409dd18a5f38
312af738-d1d2-45b6-8d99-fb636a256c50	2026-03-21 12:11:23.713701+00	2026-03-21 12:11:23.713701+00	oauth	0c0ac861-7910-41aa-80a9-30f10efa14dc
d524484c-5fa4-4d81-ba9f-7962719b0eaa	2026-03-21 12:37:52.196806+00	2026-03-21 12:37:52.196806+00	oauth	f69ee439-face-4314-81f4-f7852fc90a12
e850745e-9471-4c20-a5d9-b85c07ad740e	2026-03-21 13:22:37.279239+00	2026-03-21 13:22:37.279239+00	oauth	5502b205-b6d8-4aba-9518-3b8d0257b64d
35be8449-6dfb-489e-bd36-dc29f538ebb0	2026-03-21 14:04:48.508039+00	2026-03-21 14:04:48.508039+00	oauth	59065f2c-527c-4d29-a2fd-a8f5fda5572b
104dbdc4-6c76-45bb-98c2-bb3583bde126	2026-03-21 14:38:33.835315+00	2026-03-21 14:38:33.835315+00	oauth	c78aca06-6070-4ca1-a061-e3f396e3ec8c
540d3a39-5edc-49c7-8b2e-9147f3f2594d	2026-03-22 04:28:47.33056+00	2026-03-22 04:28:47.33056+00	oauth	c6077ecd-a4bd-413c-83ab-989dd8658292
3a611280-14d1-4d69-99e2-a2b8ed79ab71	2026-03-22 08:16:36.888134+00	2026-03-22 08:16:36.888134+00	oauth	5e717d3e-9f0a-4751-8be5-026820d3434e
73fab138-1d5b-4ab1-8ca7-79032710a214	2026-03-25 13:32:44.828057+00	2026-03-25 13:32:44.828057+00	oauth	50954602-03c3-416b-a047-25969e727514
dc59c22e-218e-424d-a8f5-80ba5ab7def9	2026-03-29 14:31:25.102649+00	2026-03-29 14:31:25.102649+00	oauth	39c49074-5fba-4406-bd94-4ac06189bfd6
c24379fe-3ff2-4359-ba73-6d7e2a2a607d	2026-04-01 06:41:09.849227+00	2026-04-01 06:41:09.849227+00	oauth	5b01fc0a-5824-4889-9598-07de053989c1
26905d3c-3d99-4e9e-a0ce-3ef7788fa4f1	2026-04-01 06:57:44.025145+00	2026-04-01 06:57:44.025145+00	oauth	e906d7dd-acfd-4cb2-bc45-5b4ad922cf46
b1a3fbba-9e4e-4c51-a5ff-dd3ce0061cb5	2026-04-01 08:55:38.953582+00	2026-04-01 08:55:38.953582+00	oauth	3a4c4403-85ef-49e5-a6b3-45429164231f
5c20650f-997a-4fa6-9344-3e87e9737dee	2026-04-02 05:04:51.870438+00	2026-04-02 05:04:51.870438+00	oauth	d86c92de-2003-4434-b091-dbbb223d8d86
432cf6e1-2928-43e5-8a53-4c3757567c4c	2026-04-02 12:22:07.988339+00	2026-04-02 12:22:07.988339+00	oauth	ddb4a3f9-370a-4f1a-b130-bbfa6e7b0614
5622efa3-4fb0-42a5-8d49-77a4b4b56f79	2026-04-02 18:05:07.803845+00	2026-04-02 18:05:07.803845+00	oauth	e4a529f5-4dd3-42bb-93ac-ad72fed4f494
ad3ac255-ed15-4471-a2fa-12810535d9c3	2026-04-02 18:05:18.143582+00	2026-04-02 18:05:18.143582+00	oauth	7bc54364-cca6-4785-bbc6-35a2d85c67f9
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	1	clepr74mfzcm	c252cc9e-616a-4d42-ab16-6e37a1cb7fc6	f	2026-03-03 16:45:18.216033+00	2026-03-03 16:45:18.216033+00	\N	6419682d-3259-49e8-867f-8fbc90a60c29
00000000-0000-0000-0000-000000000000	2	6gnc5wjcyaty	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 17:54:20.74319+00	2026-03-03 17:54:20.74319+00	\N	28ebbd8c-3667-4e92-9bb8-a4451b00f263
00000000-0000-0000-0000-000000000000	3	xejr5a5g6t6s	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 17:54:33.447496+00	2026-03-03 17:54:33.447496+00	\N	8a40d9a0-5828-4190-ae51-2f06500f2169
00000000-0000-0000-0000-000000000000	4	azla3ahaq4s2	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 18:04:05.156861+00	2026-03-03 18:04:05.156861+00	\N	8ef8a69a-4162-4598-919f-6014af275057
00000000-0000-0000-0000-000000000000	5	qbzm7jupmlke	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 18:07:34.655405+00	2026-03-03 18:07:34.655405+00	\N	2234a03f-991f-4b23-8a8c-f9e2b041e779
00000000-0000-0000-0000-000000000000	6	lrq57dv66wln	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 18:08:56.086295+00	2026-03-03 18:08:56.086295+00	\N	49c8444b-5b10-4445-9142-255223257976
00000000-0000-0000-0000-000000000000	7	srb34bjmnfnt	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 18:19:00.60198+00	2026-03-03 18:19:00.60198+00	\N	c01c6dac-2d59-45cd-a4f7-1e6b0136966e
00000000-0000-0000-0000-000000000000	8	cfdo6o3dn3s4	7849b8bf-d369-4ffc-a245-b9924c5105f6	f	2026-03-03 18:31:13.16013+00	2026-03-03 18:31:13.16013+00	\N	3842c5a6-19bf-4999-b00b-5bfbc4e4360a
00000000-0000-0000-0000-000000000000	9	ll34judqw5zr	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	f	2026-03-05 07:37:27.998205+00	2026-03-05 07:37:27.998205+00	\N	0a2e9880-04e6-4fa0-9bdb-96bd38f2ee7f
00000000-0000-0000-0000-000000000000	10	imfeolqcosq2	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	f	2026-03-05 09:25:11.019567+00	2026-03-05 09:25:11.019567+00	\N	0f7128e8-7de8-42aa-8556-56c58a12cdab
00000000-0000-0000-0000-000000000000	11	ttbhglh77jll	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	f	2026-03-05 09:25:31.073354+00	2026-03-05 09:25:31.073354+00	\N	414e7bd5-c69d-4120-a007-53c0b801f7d3
00000000-0000-0000-0000-000000000000	12	x7e6vzrxox5o	6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	f	2026-03-07 11:13:02.234888+00	2026-03-07 11:13:02.234888+00	\N	5263df3c-9d13-4923-b430-d5d6ec01e4e7
00000000-0000-0000-0000-000000000000	13	nc5mxxbo5vbo	6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	f	2026-03-07 11:13:12.926708+00	2026-03-07 11:13:12.926708+00	\N	dbc036c0-24bc-4190-8345-6b9e0fc865cc
00000000-0000-0000-0000-000000000000	14	a7cjtlz5t55m	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	f	2026-03-12 05:37:01.01686+00	2026-03-12 05:37:01.01686+00	\N	8981bb69-6dda-452c-aca0-5f337d694bb8
00000000-0000-0000-0000-000000000000	15	g5zgl3g72rfg	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-12 06:20:35.528951+00	2026-03-12 06:20:35.528951+00	\N	fd4cfe2b-6add-462a-98f1-71139e0a1acc
00000000-0000-0000-0000-000000000000	16	aydkhub76tbq	3b189625-6cb4-44b2-9ecb-8aea02ac3ec7	f	2026-03-12 06:30:05.175624+00	2026-03-12 06:30:05.175624+00	\N	27f4e9a7-110b-499b-9e50-47463c88646c
00000000-0000-0000-0000-000000000000	17	6vgh4o5xbnul	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 20:20:31.616356+00	2026-03-16 20:20:31.616356+00	\N	c2997863-850d-457d-803a-fa1ed1e4e48f
00000000-0000-0000-0000-000000000000	18	il3cypgmneuy	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 20:21:16.002864+00	2026-03-16 20:21:16.002864+00	\N	88bc4e47-c520-4602-b84b-510770436009
00000000-0000-0000-0000-000000000000	19	a4hg2zy4c7jg	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 20:26:17.395215+00	2026-03-16 20:26:17.395215+00	\N	956d3104-b8eb-4fb0-93be-eb29af1544f5
00000000-0000-0000-0000-000000000000	20	yvxwwypsx6se	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 20:59:25.082569+00	2026-03-16 20:59:25.082569+00	\N	4a1897ef-6c31-4d0e-92f0-ac29bfe08a30
00000000-0000-0000-0000-000000000000	21	quu6sj2xcjsi	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:01:44.510197+00	2026-03-16 21:01:44.510197+00	\N	9e8fdb7d-ee3a-4e3c-99d6-a6ca1d9e719e
00000000-0000-0000-0000-000000000000	22	6agpsr6itqf4	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:03:28.427071+00	2026-03-16 21:03:28.427071+00	\N	b29e99fa-6d0c-43ef-8374-8904fbc8ed10
00000000-0000-0000-0000-000000000000	23	dlkxthl6n2r4	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:03:55.515317+00	2026-03-16 21:03:55.515317+00	\N	51d5c5ce-b577-4024-ab8b-e329691b25b3
00000000-0000-0000-0000-000000000000	24	egc6nqy4xklr	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:05:35.732957+00	2026-03-16 21:05:35.732957+00	\N	b96281db-b06d-4686-bae7-a8d8749373c2
00000000-0000-0000-0000-000000000000	25	pzdsn3krxcxt	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:07:59.22174+00	2026-03-16 21:07:59.22174+00	\N	e19a9eff-7921-43c5-bb5a-af931038e8e2
00000000-0000-0000-0000-000000000000	26	teurqqpwekjy	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:13:25.991629+00	2026-03-16 21:13:25.991629+00	\N	c5c5cc21-e520-46d8-8e2a-aeb16dc8888c
00000000-0000-0000-0000-000000000000	27	2jtnnjfl4nyo	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:24:32.366104+00	2026-03-16 21:24:32.366104+00	\N	43802363-f85c-4e1d-859b-8a1a4d9646aa
00000000-0000-0000-0000-000000000000	28	5ubmclfd7dmc	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:26:05.869719+00	2026-03-16 21:26:05.869719+00	\N	7b52e633-cad5-4ce8-8d56-39188732e605
00000000-0000-0000-0000-000000000000	29	2yelvurbqil3	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:26:22.202009+00	2026-03-16 21:26:22.202009+00	\N	e2ac838b-3129-43ab-a301-e468b7d229d6
00000000-0000-0000-0000-000000000000	30	d4zz3l53ygcn	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:27:36.184614+00	2026-03-16 21:27:36.184614+00	\N	f8ea338a-dfda-4fd5-b687-c2c2a8fc474c
00000000-0000-0000-0000-000000000000	31	tnjxdvd3rkjx	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:30:08.307386+00	2026-03-16 21:30:08.307386+00	\N	a2405cec-79e3-4f72-81ac-98cbe251f92f
00000000-0000-0000-0000-000000000000	32	5t7lbwrjb6vy	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:33:24.438098+00	2026-03-16 21:33:24.438098+00	\N	e803327b-2ae8-4c55-bd36-10851899f665
00000000-0000-0000-0000-000000000000	33	xs2kk34idi25	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-16 21:42:32.829982+00	2026-03-16 21:42:32.829982+00	\N	b8d4512b-211c-47cb-a312-271d6beba3f3
00000000-0000-0000-0000-000000000000	34	2tzzib3zmwil	0778a121-ebbd-4329-b9be-fb6902f76e71	f	2026-03-21 09:36:43.369954+00	2026-03-21 09:36:43.369954+00	\N	0bd5aba4-544e-4fdc-a536-694bd485f336
00000000-0000-0000-0000-000000000000	35	hlvor4robx65	0778a121-ebbd-4329-b9be-fb6902f76e71	f	2026-03-21 09:36:44.561103+00	2026-03-21 09:36:44.561103+00	\N	2529399a-bdaa-4dcc-b9a8-094a8ebc4420
00000000-0000-0000-0000-000000000000	36	5vdl3dqkdate	a7b8ec78-5519-4f14-9202-134fabd34db2	f	2026-03-21 09:39:25.857147+00	2026-03-21 09:39:25.857147+00	\N	81fbf90e-0f73-41d7-8b83-18734ec5b193
00000000-0000-0000-0000-000000000000	37	6or4wehdn2el	a7b8ec78-5519-4f14-9202-134fabd34db2	f	2026-03-21 09:40:47.381421+00	2026-03-21 09:40:47.381421+00	\N	30940cf0-d64b-4ceb-8b17-59aa94ab666b
00000000-0000-0000-0000-000000000000	38	5cyk33fmrgn2	a7b8ec78-5519-4f14-9202-134fabd34db2	f	2026-03-21 09:41:29.799342+00	2026-03-21 09:41:29.799342+00	\N	96132642-7934-43b6-82fc-8d51adf159cf
00000000-0000-0000-0000-000000000000	39	sfe7l22vjznd	a7b8ec78-5519-4f14-9202-134fabd34db2	f	2026-03-21 10:14:12.020599+00	2026-03-21 10:14:12.020599+00	\N	662fc0d5-459f-425b-8642-0ea7686a395d
00000000-0000-0000-0000-000000000000	40	h4uxpgwtynrf	a7b8ec78-5519-4f14-9202-134fabd34db2	f	2026-03-21 10:48:22.25619+00	2026-03-21 10:48:22.25619+00	\N	45965b54-bd23-4405-b08a-d4e5abdb475b
00000000-0000-0000-0000-000000000000	41	xcukpwyysuru	a7b8ec78-5519-4f14-9202-134fabd34db2	f	2026-03-21 12:11:23.702194+00	2026-03-21 12:11:23.702194+00	\N	312af738-d1d2-45b6-8d99-fb636a256c50
00000000-0000-0000-0000-000000000000	42	z6guxxu4vwg6	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-21 12:37:52.18674+00	2026-03-21 12:37:52.18674+00	\N	d524484c-5fa4-4d81-ba9f-7962719b0eaa
00000000-0000-0000-0000-000000000000	43	g7ciz65p7cgc	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-21 13:22:37.26731+00	2026-03-21 13:22:37.26731+00	\N	e850745e-9471-4c20-a5d9-b85c07ad740e
00000000-0000-0000-0000-000000000000	44	wsk4q6e7w2nh	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-21 14:04:48.495576+00	2026-03-21 14:04:48.495576+00	\N	35be8449-6dfb-489e-bd36-dc29f538ebb0
00000000-0000-0000-0000-000000000000	45	jzeb5yqngkx4	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-21 14:38:33.818021+00	2026-03-21 14:38:33.818021+00	\N	104dbdc4-6c76-45bb-98c2-bb3583bde126
00000000-0000-0000-0000-000000000000	46	fxsisnwyws6n	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-22 04:28:47.300203+00	2026-03-22 04:28:47.300203+00	\N	540d3a39-5edc-49c7-8b2e-9147f3f2594d
00000000-0000-0000-0000-000000000000	47	ius2ugsk7qog	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-03-22 08:16:36.877174+00	2026-03-22 08:16:36.877174+00	\N	3a611280-14d1-4d69-99e2-a2b8ed79ab71
00000000-0000-0000-0000-000000000000	48	djlns2lnvnbf	da6bc60b-76c7-4b3e-affd-3baf7aab3c20	f	2026-03-25 13:32:44.811796+00	2026-03-25 13:32:44.811796+00	\N	73fab138-1d5b-4ab1-8ca7-79032710a214
00000000-0000-0000-0000-000000000000	49	ul2d2a3jj2de	fd0f41c9-2cf8-47bd-a429-ef83a345317b	f	2026-03-29 14:31:25.088893+00	2026-03-29 14:31:25.088893+00	\N	dc59c22e-218e-424d-a8f5-80ba5ab7def9
00000000-0000-0000-0000-000000000000	50	6qouoou4rcbg	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-04-01 06:41:09.837055+00	2026-04-01 06:41:09.837055+00	\N	c24379fe-3ff2-4359-ba73-6d7e2a2a607d
00000000-0000-0000-0000-000000000000	51	35ehrxuosqsx	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-04-01 06:57:44.010276+00	2026-04-01 06:57:44.010276+00	\N	26905d3c-3d99-4e9e-a0ce-3ef7788fa4f1
00000000-0000-0000-0000-000000000000	52	5t2mokpquum6	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-04-01 08:55:38.943235+00	2026-04-01 08:55:38.943235+00	\N	b1a3fbba-9e4e-4c51-a5ff-dd3ce0061cb5
00000000-0000-0000-0000-000000000000	53	wkxtcpshctrl	ad6814b4-9516-4c60-9f17-8b4cc98a1803	f	2026-04-02 05:04:51.840984+00	2026-04-02 05:04:51.840984+00	\N	5c20650f-997a-4fa6-9344-3e87e9737dee
00000000-0000-0000-0000-000000000000	54	w64qj274l2zl	531b6779-0911-4e08-8cc4-b6193432e79e	f	2026-04-02 12:22:07.972434+00	2026-04-02 12:22:07.972434+00	\N	432cf6e1-2928-43e5-8a53-4c3757567c4c
00000000-0000-0000-0000-000000000000	55	ctg2oxt6gyoy	178e575a-9471-4cb4-ae2d-e28c8743fac8	f	2026-04-02 18:05:07.789604+00	2026-04-02 18:05:07.789604+00	\N	5622efa3-4fb0-42a5-8d49-77a4b4b56f79
00000000-0000-0000-0000-000000000000	56	2fraqqhf6nka	178e575a-9471-4cb4-ae2d-e28c8743fac8	f	2026-04-02 18:05:18.138215+00	2026-04-02 18:05:18.138215+00	\N	ad3ac255-ed15-4471-a2fa-12810535d9c3
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
6419682d-3259-49e8-867f-8fbc90a60c29	c252cc9e-616a-4d42-ab16-6e37a1cb7fc6	2026-03-03 16:45:18.208705+00	2026-03-03 16:45:18.208705+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
28ebbd8c-3667-4e92-9bb8-a4451b00f263	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 17:54:20.730582+00	2026-03-03 17:54:20.730582+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
8a40d9a0-5828-4190-ae51-2f06500f2169	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 17:54:33.446064+00	2026-03-03 17:54:33.446064+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
8ef8a69a-4162-4598-919f-6014af275057	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 18:04:05.144255+00	2026-03-03 18:04:05.144255+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
2234a03f-991f-4b23-8a8c-f9e2b041e779	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 18:07:34.644758+00	2026-03-03 18:07:34.644758+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
49c8444b-5b10-4445-9142-255223257976	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 18:08:56.084485+00	2026-03-03 18:08:56.084485+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
c01c6dac-2d59-45cd-a4f7-1e6b0136966e	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 18:19:00.592665+00	2026-03-03 18:19:00.592665+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
3842c5a6-19bf-4999-b00b-5bfbc4e4360a	7849b8bf-d369-4ffc-a245-b9924c5105f6	2026-03-03 18:31:13.142347+00	2026-03-03 18:31:13.142347+00	\N	aal1	\N	\N	curl/8.7.1	182.253.177.133	\N	\N	\N	\N	\N
0a2e9880-04e6-4fa0-9bdb-96bd38f2ee7f	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	2026-03-05 07:37:27.984959+00	2026-03-05 07:37:27.984959+00	\N	aal1	\N	\N	axios/1.13.6	167.205.0.222	\N	\N	\N	\N	\N
0f7128e8-7de8-42aa-8556-56c58a12cdab	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	2026-03-05 09:25:10.996939+00	2026-03-05 09:25:10.996939+00	\N	aal1	\N	\N	axios/1.13.6	114.122.68.0	\N	\N	\N	\N	\N
414e7bd5-c69d-4120-a007-53c0b801f7d3	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	2026-03-05 09:25:31.072218+00	2026-03-05 09:25:31.072218+00	\N	aal1	\N	\N	axios/1.13.6	114.122.72.72	\N	\N	\N	\N	\N
5263df3c-9d13-4923-b430-d5d6ec01e4e7	6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	2026-03-07 11:13:02.22241+00	2026-03-07 11:13:02.22241+00	\N	aal1	\N	\N	axios/1.13.6	103.171.152.248	\N	\N	\N	\N	\N
dbc036c0-24bc-4190-8345-6b9e0fc865cc	6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	2026-03-07 11:13:12.923661+00	2026-03-07 11:13:12.923661+00	\N	aal1	\N	\N	axios/1.13.6	103.171.152.248	\N	\N	\N	\N	\N
8981bb69-6dda-452c-aca0-5f337d694bb8	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	2026-03-12 05:37:00.97564+00	2026-03-12 05:37:00.97564+00	\N	aal1	\N	\N	axios/1.13.6	167.205.0.224	\N	\N	\N	\N	\N
fd4cfe2b-6add-462a-98f1-71139e0a1acc	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-12 06:20:35.515665+00	2026-03-12 06:20:35.515665+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	167.205.0.224	\N	\N	\N	\N	\N
27f4e9a7-110b-499b-9e50-47463c88646c	3b189625-6cb4-44b2-9ecb-8aea02ac3ec7	2026-03-12 06:30:05.153148+00	2026-03-12 06:30:05.153148+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	167.205.0.224	\N	\N	\N	\N	\N
c2997863-850d-457d-803a-fa1ed1e4e48f	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 20:20:31.604316+00	2026-03-16 20:20:31.604316+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
88bc4e47-c520-4602-b84b-510770436009	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 20:21:16.000335+00	2026-03-16 20:21:16.000335+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
956d3104-b8eb-4fb0-93be-eb29af1544f5	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 20:26:17.39083+00	2026-03-16 20:26:17.39083+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
4a1897ef-6c31-4d0e-92f0-ac29bfe08a30	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 20:59:25.075068+00	2026-03-16 20:59:25.075068+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
9e8fdb7d-ee3a-4e3c-99d6-a6ca1d9e719e	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:01:44.502486+00	2026-03-16 21:01:44.502486+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
b29e99fa-6d0c-43ef-8374-8904fbc8ed10	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:03:28.417339+00	2026-03-16 21:03:28.417339+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
51d5c5ce-b577-4024-ab8b-e329691b25b3	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:03:55.514252+00	2026-03-16 21:03:55.514252+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
b96281db-b06d-4686-bae7-a8d8749373c2	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:05:35.731693+00	2026-03-16 21:05:35.731693+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
e19a9eff-7921-43c5-bb5a-af931038e8e2	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:07:59.220295+00	2026-03-16 21:07:59.220295+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
c5c5cc21-e520-46d8-8e2a-aeb16dc8888c	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:13:25.983318+00	2026-03-16 21:13:25.983318+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
43802363-f85c-4e1d-859b-8a1a4d9646aa	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:24:32.362113+00	2026-03-16 21:24:32.362113+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
7b52e633-cad5-4ce8-8d56-39188732e605	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:26:05.867322+00	2026-03-16 21:26:05.867322+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
e2ac838b-3129-43ab-a301-e468b7d229d6	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:26:22.200992+00	2026-03-16 21:26:22.200992+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
f8ea338a-dfda-4fd5-b687-c2c2a8fc474c	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:27:36.183305+00	2026-03-16 21:27:36.183305+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
a2405cec-79e3-4f72-81ac-98cbe251f92f	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:30:08.303941+00	2026-03-16 21:30:08.303941+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
e803327b-2ae8-4c55-bd36-10851899f665	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:33:24.436039+00	2026-03-16 21:33:24.436039+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
b8d4512b-211c-47cb-a312-271d6beba3f3	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-16 21:42:32.824667+00	2026-03-16 21:42:32.824667+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.129.23.216	\N	\N	\N	\N	\N
0bd5aba4-544e-4fdc-a536-694bd485f336	0778a121-ebbd-4329-b9be-fb6902f76e71	2026-03-21 09:36:43.358002+00	2026-03-21 09:36:43.358002+00	\N	aal1	\N	\N	axios/1.13.6	103.121.182.22	\N	\N	\N	\N	\N
2529399a-bdaa-4dcc-b9a8-094a8ebc4420	0778a121-ebbd-4329-b9be-fb6902f76e71	2026-03-21 09:36:44.559495+00	2026-03-21 09:36:44.559495+00	\N	aal1	\N	\N	axios/1.13.6	103.121.182.22	\N	\N	\N	\N	\N
81fbf90e-0f73-41d7-8b83-18734ec5b193	a7b8ec78-5519-4f14-9202-134fabd34db2	2026-03-21 09:39:25.855844+00	2026-03-21 09:39:25.855844+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
30940cf0-d64b-4ceb-8b17-59aa94ab666b	a7b8ec78-5519-4f14-9202-134fabd34db2	2026-03-21 09:40:47.377944+00	2026-03-21 09:40:47.377944+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
96132642-7934-43b6-82fc-8d51adf159cf	a7b8ec78-5519-4f14-9202-134fabd34db2	2026-03-21 09:41:29.798442+00	2026-03-21 09:41:29.798442+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
662fc0d5-459f-425b-8642-0ea7686a395d	a7b8ec78-5519-4f14-9202-134fabd34db2	2026-03-21 10:14:12.016199+00	2026-03-21 10:14:12.016199+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
45965b54-bd23-4405-b08a-d4e5abdb475b	a7b8ec78-5519-4f14-9202-134fabd34db2	2026-03-21 10:48:22.249795+00	2026-03-21 10:48:22.249795+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
312af738-d1d2-45b6-8d99-fb636a256c50	a7b8ec78-5519-4f14-9202-134fabd34db2	2026-03-21 12:11:23.689726+00	2026-03-21 12:11:23.689726+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
d524484c-5fa4-4d81-ba9f-7962719b0eaa	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-21 12:37:52.178948+00	2026-03-21 12:37:52.178948+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
e850745e-9471-4c20-a5d9-b85c07ad740e	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-21 13:22:37.258891+00	2026-03-21 13:22:37.258891+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
35be8449-6dfb-489e-bd36-dc29f538ebb0	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-21 14:04:48.486831+00	2026-03-21 14:04:48.486831+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
104dbdc4-6c76-45bb-98c2-bb3583bde126	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-21 14:38:33.80801+00	2026-03-21 14:38:33.80801+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
540d3a39-5edc-49c7-8b2e-9147f3f2594d	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-22 04:28:47.273967+00	2026-03-22 04:28:47.273967+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	103.121.182.22	\N	\N	\N	\N	\N
3a611280-14d1-4d69-99e2-a2b8ed79ab71	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-03-22 08:16:36.865887+00	2026-03-22 08:16:36.865887+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/146.0.7680.151 Mobile/15E148 Safari/604.1	182.2.185.59	\N	\N	\N	\N	\N
73fab138-1d5b-4ab1-8ca7-79032710a214	da6bc60b-76c7-4b3e-affd-3baf7aab3c20	2026-03-25 13:32:44.792766+00	2026-03-25 13:32:44.792766+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	114.10.42.138	\N	\N	\N	\N	\N
dc59c22e-218e-424d-a8f5-80ba5ab7def9	fd0f41c9-2cf8-47bd-a429-ef83a345317b	2026-03-29 14:31:25.073403+00	2026-03-29 14:31:25.073403+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	180.252.128.150	\N	\N	\N	\N	\N
c24379fe-3ff2-4359-ba73-6d7e2a2a607d	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-04-01 06:41:09.819273+00	2026-04-01 06:41:09.819273+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	167.205.0.222	\N	\N	\N	\N	\N
26905d3c-3d99-4e9e-a0ce-3ef7788fa4f1	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-04-01 06:57:43.999631+00	2026-04-01 06:57:43.999631+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	167.205.0.221	\N	\N	\N	\N	\N
b1a3fbba-9e4e-4c51-a5ff-dd3ce0061cb5	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-04-01 08:55:38.930538+00	2026-04-01 08:55:38.930538+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	114.10.148.211	\N	\N	\N	\N	\N
5c20650f-997a-4fa6-9344-3e87e9737dee	ad6814b4-9516-4c60-9f17-8b4cc98a1803	2026-04-02 05:04:51.807188+00	2026-04-02 05:04:51.807188+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	167.205.0.221	\N	\N	\N	\N	\N
432cf6e1-2928-43e5-8a53-4c3757567c4c	531b6779-0911-4e08-8cc4-b6193432e79e	2026-04-02 12:22:07.961934+00	2026-04-02 12:22:07.961934+00	\N	aal1	\N	\N	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	182.6.6.174	\N	\N	\N	\N	\N
5622efa3-4fb0-42a5-8d49-77a4b4b56f79	178e575a-9471-4cb4-ae2d-e28c8743fac8	2026-04-02 18:05:07.774322+00	2026-04-02 18:05:07.774322+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	182.253.176.221	\N	\N	\N	\N	\N
ad3ac255-ed15-4471-a2fa-12810535d9c3	178e575a-9471-4cb4-ae2d-e28c8743fac8	2026-04-02 18:05:18.136634+00	2026-04-02 18:05:18.136634+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36	182.253.176.221	\N	\N	\N	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	d27d2a11-cb52-4c0b-91b1-4e10d026cb40	authenticated	authenticated	test123@gmail.com	$2a$10$EVm8QWAkFCs3TzKqeJkrDuD8XIJ9K6VgeNZgtgmVlfZaHWpMbPXPS	2026-03-05 07:37:27.963781+00	\N		\N		\N			\N	2026-03-12 05:37:00.974393+00	{"provider": "email", "providers": ["email"]}	{"sub": "d27d2a11-cb52-4c0b-91b1-4e10d026cb40", "email": "test123@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-03-05 07:37:27.929867+00	2026-03-12 05:37:01.044675+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	c252cc9e-616a-4d42-ab16-6e37a1cb7fc6	authenticated	authenticated	tester@eltopup.id	$2a$10$zhb2bqar0s3eoYIUzKGqCeMDeVXhy0gS1oC4yeBs4jqsd/IvNuk26	2026-03-03 16:45:18.199312+00	\N		\N		\N			\N	2026-03-03 16:45:18.208614+00	{"provider": "email", "providers": ["email"]}	{"sub": "c252cc9e-616a-4d42-ab16-6e37a1cb7fc6", "email": "tester@eltopup.id", "email_verified": true, "phone_verified": false}	\N	2026-03-03 16:45:18.184343+00	2026-03-03 16:45:18.22583+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	ad6814b4-9516-4c60-9f17-8b4cc98a1803	authenticated	authenticated	azraqibryant@gmail.com	\N	2026-03-12 06:20:35.507821+00	\N		\N		\N			\N	2026-04-02 05:04:51.807097+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "107319164970327002538", "name": "Bryant Azraqi Mohammad", "email": "azraqibryant@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJlqpj3UZpYPRvX3RBdaLhMk2UGsgwnT_Cg8qn2xChRn5cFO0SPmQ=s96-c", "full_name": "Bryant Azraqi Mohammad", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJlqpj3UZpYPRvX3RBdaLhMk2UGsgwnT_Cg8qn2xChRn5cFO0SPmQ=s96-c", "provider_id": "107319164970327002538", "email_verified": true, "phone_verified": false}	\N	2026-03-12 06:20:35.473612+00	2026-04-02 05:04:51.869155+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	7849b8bf-d369-4ffc-a245-b9924c5105f6	authenticated	authenticated	test@eltopup.id	$2a$10$OM8lCWiTPN9n1SUOkVGmzeJBxhY1dzf4KsJY12o7Nb6gQyjdPSKiG	2026-03-03 17:54:20.710367+00	\N		\N		\N			\N	2026-03-03 18:31:13.142239+00	{"provider": "email", "providers": ["email"]}	{"sub": "7849b8bf-d369-4ffc-a245-b9924c5105f6", "email": "test@eltopup.id", "email_verified": true, "phone_verified": false}	\N	2026-03-03 17:54:20.673925+00	2026-03-03 18:31:13.173904+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	authenticated	authenticated	test1772881979@eltopup.com	$2a$10$4bdb9Xfn4PrPiAia3CLS2OO183bkMv7I1SEr/Pk/ckwYyaKtILuC6	2026-03-07 11:13:02.211111+00	\N		\N		\N			\N	2026-03-07 11:13:12.923547+00	{"provider": "email", "providers": ["email"]}	{"sub": "6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221", "email": "test1772881979@eltopup.com", "full_name": "Test User", "email_verified": true, "phone_verified": false}	\N	2026-03-07 11:13:02.178728+00	2026-03-07 11:13:12.928101+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	3b189625-6cb4-44b2-9ecb-8aea02ac3ec7	authenticated	authenticated	stphaniemae@gmail.com	\N	2026-03-12 06:30:05.146501+00	\N		\N		\N			\N	2026-03-12 06:30:05.153038+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "115055755886422513835", "name": "Stephanie Mae", "email": "stphaniemae@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocLUq9pwJshoH-sM6FYOHxuMqomlbEl8hjMgibx8rem-YdbdfJc=s96-c", "full_name": "Stephanie Mae", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocLUq9pwJshoH-sM6FYOHxuMqomlbEl8hjMgibx8rem-YdbdfJc=s96-c", "provider_id": "115055755886422513835", "email_verified": true, "phone_verified": false}	\N	2026-03-12 06:30:05.108167+00	2026-03-12 06:30:05.194513+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	a7b8ec78-5519-4f14-9202-134fabd34db2	authenticated	authenticated	svarin.fn@gmail.com	\N	2026-03-21 09:39:25.853202+00	\N		\N		\N			\N	2026-03-21 12:11:23.68963+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "107753681651091904894", "name": "Svarin", "email": "svarin.fn@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocKuBxVnPVe6wwiW-UeRduF6DNaB6SHkl64kH2yLbGcN6KHwQQ=s96-c", "full_name": "Svarin", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocKuBxVnPVe6wwiW-UeRduF6DNaB6SHkl64kH2yLbGcN6KHwQQ=s96-c", "provider_id": "107753681651091904894", "email_verified": true, "phone_verified": false}	\N	2026-03-21 09:39:25.843214+00	2026-03-21 12:11:23.71311+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	da6bc60b-76c7-4b3e-affd-3baf7aab3c20	authenticated	authenticated	mau.ibra5@gmail.com	\N	2026-03-25 13:32:44.784472+00	\N		\N		\N			\N	2026-03-25 13:32:44.792652+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "108593555893094133109", "name": "Maulana Ibrahim", "email": "mau.ibra5@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJM-vNoywM8j51iadsUEqKduzGCgXWqE0YXbOi19BgKkiSJWw=s96-c", "full_name": "Maulana Ibrahim", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJM-vNoywM8j51iadsUEqKduzGCgXWqE0YXbOi19BgKkiSJWw=s96-c", "provider_id": "108593555893094133109", "email_verified": true, "phone_verified": false}	\N	2026-03-25 13:32:44.746308+00	2026-03-25 13:32:44.827477+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	0778a121-ebbd-4329-b9be-fb6902f76e71	authenticated	authenticated	test1774085802@eltopup.com	$2a$10$yQpIRvaR78D8sovKk1kCBesZ6gTlnUFHwmquXuFqHq4fMdfxH.6jy	2026-03-21 09:36:43.344494+00	\N		\N		\N			\N	2026-03-21 09:36:44.559368+00	{"provider": "email", "providers": ["email"]}	{"sub": "0778a121-ebbd-4329-b9be-fb6902f76e71", "email": "test1774085802@eltopup.com", "full_name": "Test User", "email_verified": true, "phone_verified": false}	\N	2026-03-21 09:36:43.309094+00	2026-03-21 09:36:44.562159+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	fd0f41c9-2cf8-47bd-a429-ef83a345317b	authenticated	authenticated	abayhasbuer33@gmail.com	\N	2026-03-29 14:31:25.065232+00	\N		\N		\N			\N	2026-03-29 14:31:25.072911+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "112363312217700356531", "name": "abya hjasbuer", "email": "abayhasbuer33@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocLumu26aq9Vh42coK7E4MXpBkv5QCBkrXbeqR_Ps1Blgxgmyw=s96-c", "full_name": "abya hjasbuer", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocLumu26aq9Vh42coK7E4MXpBkv5QCBkrXbeqR_Ps1Blgxgmyw=s96-c", "provider_id": "112363312217700356531", "email_verified": true, "phone_verified": false}	\N	2026-03-29 14:31:25.024164+00	2026-03-29 14:31:25.099586+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	178e575a-9471-4cb4-ae2d-e28c8743fac8	authenticated	authenticated	18224067@std.stei.itb.ac.id	\N	2026-04-02 18:05:07.767657+00	\N		\N		\N			\N	2026-04-02 18:05:18.136549+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "117152051030528972535", "name": "18224067 Bryant Azraqi Mohammad", "email": "18224067@std.stei.itb.ac.id", "picture": "https://lh3.googleusercontent.com/a/ACg8ocKHWCKCMoz0xMP4YrpJSxp37cXEXddQp4rF5P9kdPWhLc0HAg=s96-c", "full_name": "18224067 Bryant Azraqi Mohammad", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocKHWCKCMoz0xMP4YrpJSxp37cXEXddQp4rF5P9kdPWhLc0HAg=s96-c", "provider_id": "117152051030528972535", "custom_claims": {"hd": "std.stei.itb.ac.id"}, "email_verified": true, "phone_verified": false}	\N	2026-04-02 18:05:07.740734+00	2026-04-02 18:05:18.143206+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	531b6779-0911-4e08-8cc4-b6193432e79e	authenticated	authenticated	rayipuspita99@gmail.com	\N	2026-04-02 12:22:07.95284+00	\N		\N		\N			\N	2026-04-02 12:22:07.961808+00	{"provider": "google", "providers": ["google"]}	{"iss": "https://accounts.google.com", "sub": "117807686941342501650", "name": "rayi puspita", "email": "rayipuspita99@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocL-HXdnFPRnSJVWUPZpje18m5f3KB_DWIqBZRTibndtfO0ex6Cf=s96-c", "full_name": "rayi puspita", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocL-HXdnFPRnSJVWUPZpje18m5f3KB_DWIqBZRTibndtfO0ex6Cf=s96-c", "provider_id": "117807686941342501650", "email_verified": true, "phone_verified": false}	\N	2026-04-02 12:22:07.92443+00	2026-04-02 12:22:07.987783+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: Game; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Game" (id, name, slug, "imageUrl", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Order" (id, "userId", "paymentStatus", "robuxshipStatus", "midtransOrderId", "robuxshipOrderId", "customerPriceIdr", "midtransFeeIdr", "robuxshipCostUsd", "createdAt", "updatedAt", "robloxGamepassId", "robloxUsername", "robuxAmount", "productId") FROM stdin;
3b9f5e1f-48e0-405e-ae98-d19d0d3f4ec3	a7b8ec78-5519-4f14-9202-134fabd34db2	UNPAID	PENDING	3b9f5e1f-48e0-405e-ae98-d19d0d3f4ec3	\N	11393	\N	0.00	2026-03-21 10:58:23.729	2026-03-21 10:58:24.417	1615183352	bandchong	100	\N
b6b57de6-e0ea-4d9c-8169-5e2f590ef609	a7b8ec78-5519-4f14-9202-134fabd34db2	UNPAID	PENDING	b6b57de6-e0ea-4d9c-8169-5e2f590ef609	\N	11393	\N	0.00	2026-03-21 11:02:08.56	2026-03-21 11:02:08.966	1615183352	bandchong	100	\N
ff93bec5-2a68-46bd-ba6d-91b1ac6a5de5	a7b8ec78-5519-4f14-9202-134fabd34db2	UNPAID	PENDING	ff93bec5-2a68-46bd-ba6d-91b1ac6a5de5	\N	11393	\N	0.00	2026-03-21 11:06:39.007	2026-03-21 11:06:39.479	1615183352	bandchong	100	\N
7662b897-33ae-4411-b9f5-e4ea0391f7a6	ad6814b4-9516-4c60-9f17-8b4cc98a1803	EXPIRED	PENDING	7662b897-33ae-4411-b9f5-e4ea0391f7a6	\N	11393	\N	0.00	2026-03-21 13:23:02.044	2026-03-22 13:26:09.779	1615183352	bandchong	100	\N
9445e316-4020-4bc8-a6a9-9ad7795051fc	ad6814b4-9516-4c60-9f17-8b4cc98a1803	EXPIRED	PENDING	9445e316-4020-4bc8-a6a9-9ad7795051fc	\N	11393	\N	0.00	2026-03-21 14:05:52.284	2026-03-21 14:22:17.958	1615183352	bandchong	100	\N
7f66fc2b-303c-4377-a974-48f25f5b752d	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	COMPLETED	7f66fc2b-303c-4377-a974-48f25f5b752d	4d680f0a-86b5-4191-bd14-ac33324c3bc7	11393	\N	0.00	2026-03-21 14:23:13.169	2026-03-21 14:24:17.679	1615183352	bandchong	100	\N
b104b907-45a2-497a-bb69-111f9efe6105	ad6814b4-9516-4c60-9f17-8b4cc98a1803	UNPAID	PENDING	b104b907-45a2-497a-bb69-111f9efe6105	\N	11393	\N	0.00	2026-03-21 14:41:44.561	2026-03-21 14:41:47.78	1615183352	bandchong	100	\N
449cebbf-3e3a-456c-a0b4-c23bbfe3f282	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	COMPLETED	449cebbf-3e3a-456c-a0b4-c23bbfe3f282	8b0003a8-b662-4b70-96bd-699a19bac7d9	11393	\N	0.00	2026-03-21 14:44:24.709	2026-03-21 14:46:38.353	1615183352	bandchong	100	\N
e952ff7f-8d41-47a9-b4cc-4629350d4e9c	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	COMPLETED	e952ff7f-8d41-47a9-b4cc-4629350d4e9c	e194df9f-8185-47f4-b256-26f50e7acef9	39913	\N	0.00	2026-03-22 04:33:52.002	2026-03-22 04:35:06.18	1760535520	Ditarjuna	350	\N
8c650111-8c93-4bce-85c4-1ff199d63c02	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	COMPLETED	8c650111-8c93-4bce-85c4-1ff199d63c02	9edda7d7-f8be-498a-9032-24661e8f970a	11393	\N	0.00	2026-04-02 19:03:40.532	2026-04-02 19:05:11.373	1615183352	bandchong	100	\N
fba9adff-accf-488b-91a6-baaa81b9db2a	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	PENDING	fba9adff-accf-488b-91a6-baaa81b9db2a	e09a98c9-21ff-43a8-95d7-92c2ebf5f82c	11393	\N	0.00	2026-03-21 14:13:21.774	2026-03-22 11:28:38.527	1615183352	bandchong	100	\N
9f03eb65-beb4-4965-a107-7f464eda439e	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	PENDING	9f03eb65-beb4-4965-a107-7f464eda439e	362b9388-686f-41eb-a9a3-7fe70f1ecde3	11393	\N	0.00	2026-03-21 13:27:01.041	2026-03-22 11:28:38.531	1615183352	bandchong	100	\N
3a66b19c-30bb-4ead-b138-9d377d4c2df8	ad6814b4-9516-4c60-9f17-8b4cc98a1803	PAID	PENDING	3a66b19c-30bb-4ead-b138-9d377d4c2df8	c13841e4-6de9-43c1-a7b1-567dec5400ad	11393	\N	0.00	2026-03-21 14:07:45.538	2026-03-22 11:28:38.555	1615183352	bandchong	100	\N
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Product" (id, "gameId", name, "productType", "priceIdr", "isActive", "imageUrl", description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Review" (id, "userId", "orderId", "productId", rating, comment, "createdAt") FROM stdin;
\.


--
-- Data for Name: SystemConfig; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemConfig" (id, key, value, description, "updatedAt") FROM stdin;
\.


--
-- Data for Name: SystemLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemLog" (id, "orderId", "serviceName", "eventType", "payloadData", status, "createdAt") FROM stdin;
f7eefa03-5733-4d7d-b82c-de77c1dae562	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "RR", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-03-16 21:47:17.015
f587fbf7-2dc2-4535-a722-f53699990620	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "test", "requestedNet": 50, "requiredGross": 72}	ERROR	2026-03-21 09:37:03.739
b28dc6fc-e04a-43e1-acbb-15fccbd68fc2	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "bandchong", "requestedNet": 50, "requiredGross": 72}	ERROR	2026-03-21 09:45:17.237
1dab4aab-3e19-4e28-ace9-be5cc9cb1673	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "bandchong", "requestedNet": 50, "requiredGross": 72}	ERROR	2026-03-21 09:45:26.892
4013cdf0-3ad8-4262-b095-12ff2f788490	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-03-21 10:44:51.946
4f6770d4-a2d3-44ea-92ff-e70ca2316286	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-03-21 10:48:43.696
70a1746c-e083-470b-b62b-ea4e720fb9ac	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Request failed with status code 401", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-03-21 10:49:17.142
962fb070-651e-4ae9-a361-2f9722b2a346	3b9f5e1f-48e0-405e-ae98-d19d0d3f4ec3	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 10:58:23.89
a4faf1a4-4ec5-4491-9131-a2acd96a223a	3b9f5e1f-48e0-405e-ae98-d19d0d3f4ec3	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/3c5a2b03-82c9-42ba-9b4b-2530672c5770", "midtransOrderId": "3b9f5e1f-48e0-405e-ae98-d19d0d3f4ec3"}	SUCCESS	2026-03-21 10:58:24.535
efe6be3c-aff7-439c-a888-df68e126d1b0	b6b57de6-e0ea-4d9c-8169-5e2f590ef609	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 11:02:08.688
5317d6b8-4781-4366-9100-525fad8afe44	b6b57de6-e0ea-4d9c-8169-5e2f590ef609	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/5a42b61a-462d-47b4-bfa5-0bfa9245b320", "midtransOrderId": "b6b57de6-e0ea-4d9c-8169-5e2f590ef609"}	SUCCESS	2026-03-21 11:02:09.088
82b780b3-bd2c-4c31-a81c-8b359180bff4	ff93bec5-2a68-46bd-ba6d-91b1ac6a5de5	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 11:06:39.123
bdeceab2-4111-487a-af21-1695d80c5528	ff93bec5-2a68-46bd-ba6d-91b1ac6a5de5	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/ab37832f-add2-4976-bda5-f0d3e36697b3", "midtransOrderId": "ff93bec5-2a68-46bd-ba6d-91b1ac6a5de5"}	SUCCESS	2026-03-21 11:06:39.696
cbf76cbd-43bc-4531-83f2-bbf3953ab58f	7662b897-33ae-4411-b9f5-e4ea0391f7a6	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 13:23:03.174
175cc60c-62ff-4a83-82f3-4cc2053ea80b	7662b897-33ae-4411-b9f5-e4ea0391f7a6	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/f267ec6d-8e6b-4ab8-b916-b58a0d0ead18", "midtransOrderId": "7662b897-33ae-4411-b9f5-e4ea0391f7a6"}	SUCCESS	2026-03-21 13:23:06.363
89686c57-ea4e-4787-9d3b-3118a95d144f	9f03eb65-beb4-4965-a107-7f464eda439e	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 13:27:02.374
e257683b-4b17-465c-b6e7-bc59ba31a4d2	9f03eb65-beb4-4965-a107-7f464eda439e	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/b3daad8b-8ff9-4b19-a492-785d750a3c1c", "midtransOrderId": "9f03eb65-beb4-4965-a107-7f464eda439e"}	SUCCESS	2026-03-21 13:27:05.487
d2515463-bfbf-4202-8269-aac43509adb6	9445e316-4020-4bc8-a6a9-9ad7795051fc	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 14:05:53.475
f63f741b-f5e8-419d-b4e4-bba8e2ac3bd6	9445e316-4020-4bc8-a6a9-9ad7795051fc	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/e1bbe60d-d231-4957-9d15-1f6a2d9f2692", "midtransOrderId": "9445e316-4020-4bc8-a6a9-9ad7795051fc"}	SUCCESS	2026-03-21 14:05:56.729
54dc5986-d0ca-4872-8e14-c5850d48ab3d	3a66b19c-30bb-4ead-b138-9d377d4c2df8	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 14:07:46.701
d3df296f-4d5a-49d9-b691-52c9fdb0d7bd	3a66b19c-30bb-4ead-b138-9d377d4c2df8	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/d0128f6e-9bb7-4e41-8e84-61cf41e30041", "midtransOrderId": "3a66b19c-30bb-4ead-b138-9d377d4c2df8"}	SUCCESS	2026-03-21 14:07:49.874
728c71ee-2485-4493-adc3-f0beb152a650	fba9adff-accf-488b-91a6-baaa81b9db2a	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 14:13:22.938
db531db0-1b9b-4de8-8996-34d7ac10bfe8	fba9adff-accf-488b-91a6-baaa81b9db2a	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/5050bcbd-55d3-41c6-8b94-ec51788e53db", "midtransOrderId": "fba9adff-accf-488b-91a6-baaa81b9db2a"}	SUCCESS	2026-03-21 14:13:26.3
1e1abf30-51b9-4edd-b657-f5cd3e75e6a4	7f66fc2b-303c-4377-a974-48f25f5b752d	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 14:23:14.53
71870cbc-3b8f-4912-a648-6b9124345d55	7f66fc2b-303c-4377-a974-48f25f5b752d	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/d0ac5a59-799b-4898-b852-94985d01eebe", "midtransOrderId": "7f66fc2b-303c-4377-a974-48f25f5b752d"}	SUCCESS	2026-03-21 14:23:17.685
432d4941-dc1e-434f-a693-db5328035a5e	7f66fc2b-303c-4377-a974-48f25f5b752d	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "4d680f0a-86b5-4191-bd14-ac33324c3bc7", "price": 0.572, "amount": 143, "method": "Gamepass", "status": "pending", "username": "bandchong", "gamepassId": 1615183352, "giftingDetails": null, "externalOrderId": "7f66fc2b-303c-4377-a974-48f25f5b752d"}, "success": true}	SUCCESS	2026-03-21 14:24:04.045
65f171d5-765a-4d00-adcb-173732c01b00	b104b907-45a2-497a-bb69-111f9efe6105	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 14:41:45.681
0037f293-e7bc-4d71-ba3d-fafb1182cf39	b104b907-45a2-497a-bb69-111f9efe6105	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/11d813b8-c027-4381-bb05-40d0e329e808", "midtransOrderId": "b104b907-45a2-497a-bb69-111f9efe6105"}	SUCCESS	2026-03-21 14:41:48.879
74c54959-3adb-4124-b1eb-814257b6f95f	449cebbf-3e3a-456c-a0b4-c23bbfe3f282	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-03-21 14:44:25.804
8951aafd-0af3-41bb-a542-eded14e161ab	449cebbf-3e3a-456c-a0b4-c23bbfe3f282	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/110cfad7-6103-40f0-9d76-2f3364d55d3f", "midtransOrderId": "449cebbf-3e3a-456c-a0b4-c23bbfe3f282"}	SUCCESS	2026-03-21 14:44:28.915
14aaf600-4a62-404c-8005-b5dd08c33b25	449cebbf-3e3a-456c-a0b4-c23bbfe3f282	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "8b0003a8-b662-4b70-96bd-699a19bac7d9", "price": 0.572, "amount": 143, "method": "Gamepass", "status": "pending", "username": "bandchong", "gamepassId": 1615183352, "giftingDetails": null, "externalOrderId": "449cebbf-3e3a-456c-a0b4-c23bbfe3f282"}, "success": true}	SUCCESS	2026-03-21 14:46:26.407
0de46ec0-90bc-4b12-bd5e-d264d1b3c33c	e952ff7f-8d41-47a9-b4cc-4629350d4e9c	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 350, "priceIdr": 39913, "username": "Ditarjuna", "gamepassId": "1760535520", "grossRobux": 501}	SUCCESS	2026-03-22 04:33:53.104
fc9e57d7-50bd-4de7-9694-e3a279ae6ebc	e952ff7f-8d41-47a9-b4cc-4629350d4e9c	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/9ad1f07e-260c-4351-813a-dcf852b92c85", "midtransOrderId": "e952ff7f-8d41-47a9-b4cc-4629350d4e9c"}	SUCCESS	2026-03-22 04:33:56.208
9eec2b5b-38e9-4c43-aae1-8fc80c911cd2	e952ff7f-8d41-47a9-b4cc-4629350d4e9c	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "e194df9f-8185-47f4-b256-26f50e7acef9", "price": 1.9038, "amount": 501, "method": "Gamepass", "status": "pending", "username": "Ditarjuna", "gamepassId": 1760535520, "giftingDetails": null, "externalOrderId": "e952ff7f-8d41-47a9-b4cc-4629350d4e9c"}, "success": true}	SUCCESS	2026-03-22 04:35:03.196
e16c6c09-ac83-4eaa-a48a-9683293bca1e	fba9adff-accf-488b-91a6-baaa81b9db2a	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "e09a98c9-21ff-43a8-95d7-92c2ebf5f82c", "price": 0.6006, "amount": 143, "method": "Gamepass", "status": "pending", "username": "bandchong", "gamepassId": 1615183352, "giftingDetails": null, "externalOrderId": "fba9adff-accf-488b-91a6-baaa81b9db2a"}, "success": true}	SUCCESS	2026-03-22 11:28:39.609
8c0abedb-908b-4fef-8952-12613be1a266	9f03eb65-beb4-4965-a107-7f464eda439e	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "362b9388-686f-41eb-a9a3-7fe70f1ecde3", "price": 0.6006, "amount": 143, "method": "Gamepass", "status": "pending", "username": "bandchong", "gamepassId": 1615183352, "giftingDetails": null, "externalOrderId": "9f03eb65-beb4-4965-a107-7f464eda439e"}, "success": true}	SUCCESS	2026-03-22 11:28:39.637
a7daee44-fb1d-425a-b057-e4234d5af550	3a66b19c-30bb-4ead-b138-9d377d4c2df8	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "c13841e4-6de9-43c1-a7b1-567dec5400ad", "price": 0.6006, "amount": 143, "method": "Gamepass", "status": "pending", "username": "bandchong", "gamepassId": 1615183352, "giftingDetails": null, "externalOrderId": "3a66b19c-30bb-4ead-b138-9d377d4c2df8"}, "success": true}	SUCCESS	2026-03-22 11:28:39.677
6f6d98fb-6993-4db2-bd44-ad33b5b903c3	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass validation failed.", "username": "manlyovercoat", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-03-29 14:32:15.136
df9a8a60-ddce-48bf-860c-f24705b84e4a	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass validation failed.", "username": "manlyovercoat", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-03-29 14:32:23.769
b5afecc0-db8e-45f1-9f0f-b8308a399399	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass validation failed.", "username": "bandchong", "requestedNet": 700, "requiredGross": 1001}	ERROR	2026-04-02 05:32:26.099
189e68a0-a326-4391-ab1e-7c3623c0c565	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass validation failed.", "username": "rayvart", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 12:23:25.369
afdf1cfa-837e-4380-9b1a-0521dc8e4b63	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass validation failed.", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 18:57:00.869
5a1603fb-076e-49c3-ac02-e026d4ccc11a	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass validation failed.", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 18:57:32.697
d02883c5-17d3-4ce7-9b62-36e8cca36cbb	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "Gamepass not valid: All matching gamepasses have regional pricing enabled", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 19:03:18.82
977eca50-8e43-4e9b-8049-ba98fa9d9943	8c650111-8c93-4bce-85c4-1ff199d63c02	ROBUXSHIP	VALIDATE_GAMEPASS_SUCCESS	{"netRobux": 100, "priceIdr": 11393, "username": "bandchong", "gamepassId": "1615183352", "grossRobux": 143}	SUCCESS	2026-04-02 19:03:40.656
9bd7d928-e470-4539-8396-2c48e6d92988	8c650111-8c93-4bce-85c4-1ff199d63c02	MIDTRANS	CREATE_SNAP_SUCCESS	{"redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/7cb50c89-c593-4504-b152-5ed1783d7027", "midtransOrderId": "8c650111-8c93-4bce-85c4-1ff199d63c02"}	SUCCESS	2026-04-02 19:03:41.184
ae5e94f4-a063-4a0b-92c6-2c1461c21721	8c650111-8c93-4bce-85c4-1ff199d63c02	ROBUXSHIP	CREATE_ORDER_SUCCESS	{"data": {"id": "9edda7d7-f8be-498a-9032-24661e8f970a", "price": 0.572, "amount": 143, "method": "Gamepass", "status": "pending", "username": "bandchong", "gamepassId": 1615183352, "giftingDetails": null, "externalOrderId": "8c650111-8c93-4bce-85c4-1ff199d63c02"}, "success": true}	SUCCESS	2026-04-02 19:05:03.903
cf9ae530-47c1-4725-aa31-d5372485e15b	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "All matching gamepasses have regional pricing enabled", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 19:19:51.609
3df68eb5-ae69-421e-9672-6dce9b48949e	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "All matching gamepasses have regional pricing enabled", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 19:20:02.203
617a5130-3bce-4deb-927c-0bd37d8429c0	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "No gamepass found with price of 715 R$", "username": "bandchong", "requestedNet": 500, "requiredGross": 715}	ERROR	2026-04-02 19:20:35.816
0f0e0d22-5fd8-47ab-a2c6-57fb92e31216	\N	ROBUXSHIP	VALIDATE_GAMEPASS_FAILED	{"error": "All matching gamepasses have regional pricing enabled", "username": "bandchong", "requestedNet": 100, "requiredGross": 143}	ERROR	2026-04-02 19:47:46.835
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, email, name, role, "createdAt", "updatedAt") FROM stdin;
7849b8bf-d369-4ffc-a245-b9924c5105f6	test@eltopup.id	User	customer	2026-03-03 18:04:17.313	2026-03-03 18:04:17.313
d27d2a11-cb52-4c0b-91b1-4e10d026cb40	test123@gmail.com	User	customer	2026-03-05 07:37:28.734	2026-03-05 07:37:28.734
6a1cdc64-6fc6-4c9a-ac1a-35c3d3a42221	test1772881979@eltopup.com	Test User	customer	2026-03-07 11:13:00.401	2026-03-07 11:13:00.401
3b189625-6cb4-44b2-9ecb-8aea02ac3ec7	stphaniemae@gmail.com	Stephanie Mae	customer	2026-03-12 06:30:05.535	2026-03-12 06:30:05.535
0778a121-ebbd-4329-b9be-fb6902f76e71	test1774085802@eltopup.com	Test User	customer	2026-03-21 09:36:43.932	2026-03-21 09:36:43.932
a7b8ec78-5519-4f14-9202-134fabd34db2	svarin.fn@gmail.com	User	customer	2026-03-21 09:39:30.53	2026-03-21 09:39:30.53
da6bc60b-76c7-4b3e-affd-3baf7aab3c20	mau.ibra5@gmail.com	User	customer	2026-03-25 13:32:51.62	2026-03-25 13:32:51.62
531b6779-0911-4e08-8cc4-b6193432e79e	rayipuspita99@gmail.com	User	customer	2026-04-02 12:22:13.005	2026-04-02 12:22:13.005
178e575a-9471-4cb4-ae2d-e28c8743fac8	18224067@std.stei.itb.ac.id	18224067 Bryant Azraqi Mohammad	customer	2026-04-02 18:06:01.624	2026-04-02 19:19:23.02
ad6814b4-9516-4c60-9f17-8b4cc98a1803	azraqibryant@gmail.com	Bryant Azraqi Mohammad	customer	2026-03-12 06:20:36.046	2026-04-03 11:33:20.628
fd0f41c9-2cf8-47bd-a429-ef83a345317b	abayhasbuer33@gmail.com	abya hjasbuer	customer	2026-03-29 14:31:31.058	2026-04-04 10:50:36.248
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-03-03 12:22:34
20211116045059	2026-03-03 12:22:34
20211116050929	2026-03-03 12:22:34
20211116051442	2026-03-03 12:22:34
20211116212300	2026-03-03 12:22:34
20211116213355	2026-03-03 12:22:34
20211116213934	2026-03-03 12:22:35
20211116214523	2026-03-03 12:22:35
20211122062447	2026-03-03 12:22:35
20211124070109	2026-03-03 12:22:35
20211202204204	2026-03-03 12:22:35
20211202204605	2026-03-03 12:22:35
20211210212804	2026-03-03 12:22:35
20211228014915	2026-03-03 12:22:35
20220107221237	2026-03-03 12:22:35
20220228202821	2026-03-03 12:22:35
20220312004840	2026-03-03 12:22:35
20220603231003	2026-03-03 12:22:35
20220603232444	2026-03-03 12:22:35
20220615214548	2026-03-03 12:22:35
20220712093339	2026-03-03 14:00:31
20220908172859	2026-03-03 14:00:31
20220916233421	2026-03-03 14:00:31
20230119133233	2026-03-03 14:00:31
20230128025114	2026-03-03 14:00:31
20230128025212	2026-03-03 14:00:31
20230227211149	2026-03-03 14:00:31
20230228184745	2026-03-03 14:00:31
20230308225145	2026-03-03 14:00:31
20230328144023	2026-03-03 14:00:31
20231018144023	2026-03-03 14:00:31
20231204144023	2026-03-03 14:00:31
20231204144024	2026-03-03 14:00:31
20231204144025	2026-03-03 14:00:31
20240108234812	2026-03-03 14:00:31
20240109165339	2026-03-03 14:00:31
20240227174441	2026-03-03 14:00:31
20240311171622	2026-03-03 14:00:31
20240321100241	2026-03-03 14:00:31
20240401105812	2026-03-03 14:00:31
20240418121054	2026-03-03 14:00:31
20240523004032	2026-03-03 14:00:31
20240618124746	2026-03-03 14:00:31
20240801235015	2026-03-03 14:00:31
20240805133720	2026-03-03 14:00:31
20240827160934	2026-03-03 14:00:32
20240919163303	2026-03-03 14:00:32
20240919163305	2026-03-03 14:00:32
20241019105805	2026-03-03 14:00:32
20241030150047	2026-03-03 14:00:32
20241108114728	2026-03-03 14:00:32
20241121104152	2026-03-03 14:00:32
20241130184212	2026-03-03 14:00:32
20241220035512	2026-03-03 14:00:32
20241220123912	2026-03-03 14:00:32
20241224161212	2026-03-03 14:00:32
20250107150512	2026-03-03 14:00:32
20250110162412	2026-03-03 14:00:32
20250123174212	2026-03-03 14:00:32
20250128220012	2026-03-03 14:00:32
20250506224012	2026-03-03 14:00:32
20250523164012	2026-03-03 14:00:32
20250714121412	2026-03-03 14:00:32
20250905041441	2026-03-03 14:00:32
20251103001201	2026-03-03 14:00:32
20251120212548	2026-03-03 14:00:32
20251120215549	2026-03-03 14:00:32
20260218120000	2026-03-03 14:00:32
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-03-03 12:22:34.649613
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-03-03 12:22:34.732702
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-03-03 12:22:34.758807
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-03-03 12:22:34.960156
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-03-03 12:22:35.813644
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-03-03 12:22:35.818753
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-03-03 12:22:35.827244
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-03-03 12:22:35.830391
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-03-03 12:22:35.832905
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-03-03 12:22:35.835563
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-03-03 12:22:35.851081
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-03-03 12:22:35.862627
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-03-03 12:22:35.865883
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-03-03 12:22:35.869049
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-03-03 12:23:36.979217
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-03-03 12:23:37.111272
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-03-03 12:23:37.118995
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-03-03 12:23:37.122995
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-03-03 12:23:37.136129
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-03-03 12:23:37.155879
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-03-03 12:23:37.166706
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-03-03 12:23:37.181175
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-03-03 12:23:37.20961
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-03-03 12:23:37.219868
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-03-03 12:23:37.227548
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-03-03 12:23:37.231261
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-03-03 12:23:37.235672
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-03-03 12:23:37.238859
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-03-03 12:23:37.241302
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-03-03 12:23:37.244013
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-03-03 12:23:37.246278
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-03-03 12:23:37.248474
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-03-03 12:23:37.250784
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-03-03 12:23:37.253224
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-03-03 12:23:37.255678
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-03-03 12:23:37.25823
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-03-03 12:23:37.260517
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-03-03 12:23:37.262821
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-03-03 12:23:37.266751
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-03-03 12:23:37.28087
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-03-03 12:23:37.283438
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-03-03 12:23:37.286045
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-03-03 12:23:37.288399
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-03-03 12:23:37.290655
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-03-03 12:23:37.292948
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-03-03 12:23:37.297402
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-03-03 12:23:37.309873
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-03-03 12:23:37.31302
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-03-03 12:23:37.315616
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-03-03 12:23:37.332613
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-03-03 12:23:37.335691
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-03-03 12:23:37.9121
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-03-03 12:23:37.913843
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-03-03 12:23:37.923825
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-03-03 12:23:37.925823
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-03-03 12:23:37.927489
56	fix-optimized-search-function	cb58526ebc23048049fd5bf2fd148d18b04a2073	2026-03-03 12:23:37.931429
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 56, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: Game Game_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Game"
    ADD CONSTRAINT "Game_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: SystemConfig SystemConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemConfig"
    ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY (id);


--
-- Name: SystemLog SystemLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemLog"
    ADD CONSTRAINT "SystemLog_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: Game_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Game_name_key" ON public."Game" USING btree (name);


--
-- Name: Game_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Game_slug_key" ON public."Game" USING btree (slug);


--
-- Name: Order_midtransOrderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_midtransOrderId_key" ON public."Order" USING btree ("midtransOrderId");


--
-- Name: Order_robuxshipOrderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_robuxshipOrderId_key" ON public."Order" USING btree ("robuxshipOrderId");


--
-- Name: Review_orderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Review_orderId_key" ON public."Review" USING btree ("orderId");


--
-- Name: SystemConfig_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SystemConfig_key_key" ON public."SystemConfig" USING btree (key);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: Order Order_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_gameId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES public."Game"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Review Review_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SystemLog SystemLog_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemLog"
    ADD CONSTRAINT "SystemLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict bQTJ9VstHbgQY11pixqnfAJ6D2QamXcR1dpRYw5QY1O22AEHggFyBqrOUXBWv45

