--
-- PostgreSQL database dump
--

\restrict zypbKSTQ027fMhk8smc6zrX1F7tWv56AgHW4sYhRj5FBwnQwfUqpVwAGiZOXOei

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.3

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_invitations (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_used boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.account_invitations OWNER TO postgres;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    badge_name character varying(100) NOT NULL,
    description text,
    icon_name character varying(50),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alerts (
    id uuid NOT NULL,
    alert_type character varying(18) NOT NULL,
    severity character varying(8) NOT NULL,
    recipient_user_id uuid NOT NULL,
    related_entity_type character varying(18) NOT NULL,
    related_entity_id uuid NOT NULL,
    email_status character varying(9) NOT NULL,
    status character varying(9) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    resolved_at timestamp with time zone
);


ALTER TABLE public.alerts OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    audience character varying(50) DEFAULT 'all'::character varying NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: approval_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_steps (
    id uuid NOT NULL,
    approval_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    step_order integer NOT NULL,
    status character varying(50) NOT NULL,
    comments text,
    acted_at timestamp with time zone,
    escalated_to_admin boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.approval_steps OWNER TO postgres;

--
-- Name: approval_timeline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_timeline (
    id uuid NOT NULL,
    entity_type character varying(21) NOT NULL,
    entity_id uuid NOT NULL,
    actor_id uuid NOT NULL,
    action character varying(9) NOT NULL,
    comment text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.approval_timeline OWNER TO postgres;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approvals (
    id uuid NOT NULL,
    entity_type character varying(21) NOT NULL,
    entity_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    decided_by uuid,
    decision character varying(19) NOT NULL,
    reason text,
    created_at timestamp with time zone NOT NULL,
    decided_at timestamp with time zone
);


ALTER TABLE public.approvals OWNER TO postgres;

--
-- Name: attendance_breaks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_breaks (
    id uuid NOT NULL,
    attendance_session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    break_type character varying(6) NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_minutes integer,
    note text,
    is_paid boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.attendance_breaks OWNER TO postgres;

--
-- Name: attendance_corrections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_corrections (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    original_check_in_at timestamp with time zone,
    original_check_out_at timestamp with time zone,
    requested_check_in_at timestamp with time zone,
    requested_check_out_at timestamp with time zone,
    reason text NOT NULL,
    status character varying(19) NOT NULL,
    manager_comment text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.attendance_corrections OWNER TO postgres;

--
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    check_in_at timestamp with time zone NOT NULL,
    check_out_at timestamp with time zone,
    work_mode character varying(6) NOT NULL,
    session_status character varying(10) NOT NULL,
    is_late_login boolean NOT NULL,
    is_early_logout boolean NOT NULL,
    total_hours double precision,
    attendance_classification character varying(12) NOT NULL,
    is_corrected boolean NOT NULL,
    correction_requested boolean NOT NULL,
    correction_reason text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    worked_minutes integer,
    late_minutes integer,
    early_checkout_minutes integer,
    is_overtime boolean DEFAULT false NOT NULL,
    checkout_after_shift_reason text,
    checkout_after_shift_note text,
    expected_shift_start_at timestamp with time zone,
    expected_shift_end_at timestamp with time zone,
    total_break_minutes integer DEFAULT 0 NOT NULL,
    dinner_break_minutes integer DEFAULT 0 NOT NULL,
    prayer_break_minutes integer DEFAULT 0 NOT NULL,
    other_break_minutes integer DEFAULT 0 NOT NULL,
    early_checkout_reason text
);


ALTER TABLE public.attendance_sessions OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    action_type character varying(128) NOT NULL,
    entity_type character varying(128) NOT NULL,
    entity_id uuid NOT NULL,
    old_value json,
    new_value json,
    metadata json,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: call_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_participants (
    id uuid NOT NULL,
    call_session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    joined_at timestamp with time zone,
    left_at timestamp with time zone
);


ALTER TABLE public.call_participants OWNER TO postgres;

--
-- Name: call_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_sessions (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    started_by_id uuid NOT NULL,
    call_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    started_at timestamp with time zone,
    accepted_at timestamp with time zone,
    ended_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.call_sessions OWNER TO postgres;

--
-- Name: call_signals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_signals (
    id uuid NOT NULL,
    call_session_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    signal_type character varying(50) NOT NULL,
    payload_json text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone
);


ALTER TABLE public.call_signals OWNER TO postgres;

--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversation_participants (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(6) NOT NULL,
    last_read_at timestamp with time zone,
    is_muted boolean NOT NULL,
    joined_at timestamp with time zone NOT NULL,
    left_at timestamp with time zone
);


ALTER TABLE public.conversation_participants OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid NOT NULL,
    type character varying(15) NOT NULL,
    title character varying(255),
    created_by_id uuid NOT NULL,
    related_entity_type character varying(100),
    related_entity_id uuid,
    is_archived boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    who_can_send_messages character varying(50) DEFAULT 'all_members'::character varying NOT NULL,
    who_can_edit_group_info character varying(50) DEFAULT 'admins_only'::character varying NOT NULL,
    who_can_add_members character varying(50) DEFAULT 'admins_only'::character varying NOT NULL
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_stats (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    total_hours double precision NOT NULL,
    is_late_login boolean NOT NULL,
    is_early_logout boolean NOT NULL,
    is_overtime boolean NOT NULL,
    is_absent boolean NOT NULL,
    leave_type character varying(8),
    is_wfh boolean NOT NULL,
    primary_session_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.daily_stats OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    admin_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: eod_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eod_reports (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    report_date date NOT NULL,
    login_time timestamp with time zone,
    logout_time timestamp with time zone,
    total_hours integer NOT NULL,
    tasks_worked_on integer NOT NULL,
    completed_tasks integer NOT NULL,
    pending_tasks integer NOT NULL,
    blocked_tasks integer NOT NULL,
    duties_performed integer NOT NULL,
    productivity_score integer NOT NULL,
    status character varying(50) NOT NULL,
    manager_comments text,
    highlights_summary text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.eod_reports OWNER TO postgres;

--
-- Name: eod_revisions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.eod_revisions (
    id uuid NOT NULL,
    eod_report_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    manager_comments text,
    snapshot_data text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.eod_revisions OWNER TO postgres;

--
-- Name: goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.goals (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    target_metric character varying(50) NOT NULL,
    target_value integer NOT NULL,
    current_value integer NOT NULL,
    deadline date,
    status character varying(11) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.goals OWNER TO postgres;

--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    holiday_date date NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    description character varying(255),
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_requests (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    leave_type character varying(8) NOT NULL,
    status character varying(19) NOT NULL,
    is_half_day boolean NOT NULL,
    half_day_period character varying(11),
    reason text NOT NULL,
    current_approver_id uuid,
    escalated_from_id uuid,
    escalated_at timestamp with time zone,
    escalation_count integer NOT NULL,
    manager_comment text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.leave_requests OWNER TO postgres;

--
-- Name: manager_daily_summaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manager_daily_summaries (
    id uuid NOT NULL,
    manager_id uuid NOT NULL,
    summary_date date NOT NULL,
    team_members_active integer NOT NULL,
    missing_checkouts integer NOT NULL,
    pending_approvals integer NOT NULL,
    tasks_completed integer NOT NULL,
    overdue_tasks integer NOT NULL,
    blocked_tasks integer NOT NULL,
    eod_pending_approvals integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.manager_daily_summaries OWNER TO postgres;

--
-- Name: meeting_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meeting_participants (
    id uuid NOT NULL,
    meeting_id uuid NOT NULL,
    user_id uuid NOT NULL,
    response_status character varying(50) NOT NULL,
    notification_sent_at timestamp with time zone,
    reminder_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.meeting_participants OWNER TO postgres;

--
-- Name: meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meetings (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    organizer_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    meeting_link character varying(1024),
    location character varying(255),
    status character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.meetings OWNER TO postgres;

--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_attachments (
    id uuid NOT NULL,
    message_id uuid,
    conversation_id uuid NOT NULL,
    uploader_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    original_file_name character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    storage_path text NOT NULL,
    storage_name character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.message_attachments OWNER TO postgres;

--
-- Name: message_mentions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_mentions (
    id uuid NOT NULL,
    message_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL
);


ALTER TABLE public.message_mentions OWNER TO postgres;

--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_reactions (
    id uuid NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji character varying(50) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.message_reactions OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    message_type character varying(13) NOT NULL,
    parent_message_id uuid,
    is_edited boolean NOT NULL,
    is_deleted boolean NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: monthly_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_reports (
    id uuid NOT NULL,
    report_month date NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    total_hours integer NOT NULL,
    tasks_completed integer NOT NULL,
    late_logins integer NOT NULL,
    early_logouts integer NOT NULL,
    productivity_score integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.monthly_reports OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    notification_type character varying(17) NOT NULL,
    related_entity_type character varying(100),
    related_entity_id uuid,
    is_read boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    is_used boolean NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: performance_metrics_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.performance_metrics_daily (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    metric_date date NOT NULL,
    total_session_minutes integer NOT NULL,
    productive_minutes integer NOT NULL,
    output_score numeric(6,4),
    efficiency_score numeric(6,4),
    utilization_score numeric(6,4),
    consistency_score numeric(6,4),
    composite_score numeric(6,4),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.performance_metrics_daily OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    key character varying(100) NOT NULL,
    description text
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: personal_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_notes (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    note_date date NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.personal_notes OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    owner_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    priority character varying(8) NOT NULL,
    approval_status character varying(19) NOT NULL,
    project_status character varying(16) NOT NULL,
    due_date date,
    approved_at timestamp with time zone,
    rejected_reason text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid NOT NULL,
    role character varying(50) NOT NULL,
    permission_key character varying(100) NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    grace_period_minutes integer NOT NULL,
    working_days character varying(50) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    description character varying(255),
    timezone character varying(50) DEFAULT 'Asia/Karachi'::character varying NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: support_ticket_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_ticket_comments (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    author_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.support_ticket_comments OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid NOT NULL,
    ticket_number integer NOT NULL,
    created_by_id uuid NOT NULL,
    assigned_to_id uuid,
    subject character varying(255) NOT NULL,
    category character varying(15) NOT NULL,
    priority character varying(6) NOT NULL,
    description text NOT NULL,
    status character varying(16) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: support_tickets_ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.support_tickets ALTER COLUMN ticket_number ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.support_tickets_ticket_number_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_comments (
    id uuid NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.task_comments OWNER TO postgres;

--
-- Name: task_timer_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.task_timer_sessions (
    id uuid NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(9) NOT NULL,
    started_at timestamp with time zone NOT NULL,
    last_resumed_at timestamp with time zone NOT NULL,
    paused_at timestamp with time zone,
    accumulated_seconds integer NOT NULL,
    pause_reason character varying(19),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.task_timer_sessions OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid NOT NULL,
    project_id uuid NOT NULL,
    assigned_to uuid NOT NULL,
    created_by uuid NOT NULL,
    parent_id uuid,
    title character varying(255) NOT NULL,
    description text,
    complexity_level integer,
    expected_duration_minutes integer,
    actual_duration_minutes integer,
    priority character varying(8) NOT NULL,
    status character varying(11) NOT NULL,
    blocked_reason text,
    due_date date,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    manager_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.time_logs (
    id uuid NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_minutes integer,
    source_type character varying(6) NOT NULL,
    notes text,
    status character varying(9) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.time_logs OWNER TO postgres;

--
-- Name: user_permission_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permission_overrides (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission_key character varying(100) NOT NULL,
    granted boolean NOT NULL
);


ALTER TABLE public.user_permission_overrides OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(15) NOT NULL,
    manager_id uuid,
    department character varying(255),
    department_id uuid,
    shift_id uuid,
    designation character varying(255),
    status character varying(9) NOT NULL,
    created_by uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    phone character varying(50) DEFAULT NULL::character varying
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: weekly_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_reports (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_hours integer NOT NULL,
    tasks_completed integer NOT NULL,
    pending_tasks integer NOT NULL,
    blocked_tasks integer NOT NULL,
    late_logins integer NOT NULL,
    early_logouts integer NOT NULL,
    eod_submission_rate integer NOT NULL,
    productivity_score integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.weekly_reports OWNER TO postgres;

--
-- Data for Name: account_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_invitations (id, user_id, token_hash, expires_at, is_used, created_at, updated_at) FROM stdin;
0b781f58-40b3-4c28-9290-14bebc1528ed	70e267f7-da33-4956-a164-e1c3eae128e8	9bf96608ac855f71a61cd018a43363d9ba02f2b32507a3e4ae2ea5ce2a73cbcf	2026-05-14 14:35:29.156624+00	t	2026-05-07 14:35:29.157246+00	2026-05-07 14:36:17.704647+00
d57b8010-5224-41c4-a325-bf10d0ce445b	134eabbc-7a90-4dd3-b652-16f243b9ef5b	d532f27a70483daa2723779d129d9280c36522ffc14bab67312e3c54a900284e	2026-05-14 16:42:38.170484+00	t	2026-05-07 16:42:38.17086+00	2026-05-07 18:55:38.714276+00
f0e879d6-4ace-4df0-aaf1-c65a581cf729	44a8944f-d5ef-470d-a8d7-712a61a347df	b592327e78aa2e8a7be68bebe69554ad2449723408bee664a88c1c7de72eb38c	2026-05-14 16:42:02.335079+00	t	2026-05-07 16:42:02.336299+00	2026-05-07 18:56:54.326937+00
27bc42cc-4759-42a4-8cf1-4c5357592f87	18ed9428-247b-4318-9399-ae4173674715	b211c6c894a029006f07bd16f36764bcc0b77e009ba248f0b75c11ec721a3e63	2026-05-29 17:49:32.024551+00	f	2026-05-22 17:49:32.025416+00	2026-05-22 17:49:32.025418+00
0cc29582-8155-4bd5-8798-25dcd4b54607	fb2f8520-8ef4-4b55-907c-b935480944f3	6dc24e38788cb3da32472f0c652d1060a5baf5418e2605997481da9b89c0787d	2026-05-29 17:51:28.32786+00	f	2026-05-22 17:51:28.328734+00	2026-05-22 17:51:28.328737+00
\.


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievements (id, user_id, badge_name, description, icon_name, created_at, updated_at) FROM stdin;
aaaaaaaa-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	Mobile App Redesign Completed	Mobile App Redesign Completed seeded achievement	award	2026-05-18 21:09:30.70102+00	2026-05-18 21:09:30.701028+00
aaaaaaaa-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440004	API Performance Improved by 40%	API Performance Improved by 40% seeded achievement	award	2026-05-18 21:09:30.70103+00	2026-05-18 21:09:30.701031+00
aaaaaaaa-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440006	Sales Target Exceeded	Sales Target Exceeded seeded achievement	award	2026-05-18 21:09:30.701033+00	2026-05-18 21:09:30.701034+00
aaaaaaaa-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	Marketing Campaign Success	Marketing Campaign Success seeded achievement	award	2026-05-18 21:09:30.701035+00	2026-05-18 21:09:30.701036+00
aaaaaaaa-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440008	Financial Audit System Deployed	Financial Audit System Deployed seeded achievement	award	2026-05-18 21:09:30.701037+00	2026-05-18 21:09:30.701038+00
aaaaaaaa-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440010	Code Quality Improvement	Code Quality Improvement seeded achievement	award	2026-05-18 21:09:30.701039+00	2026-05-18 21:09:30.70104+00
aaaaaaaa-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440003	Team Lead Recognition	Team Lead Recognition seeded achievement	award	2026-05-18 21:09:30.701041+00	2026-05-18 21:09:30.701042+00
aaaaaaaa-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440004	Bug Fix Milestone	Bug Fix Milestone seeded achievement	award	2026-05-18 21:09:30.701043+00	2026-05-18 21:09:30.701044+00
aaaaaaaa-e29b-41d4-a716-446655440009	750e8400-e29b-41d4-a716-446655440006	Customer Satisfaction Award	Customer Satisfaction Award seeded achievement	award	2026-05-18 21:09:30.701045+00	2026-05-18 21:09:30.701046+00
aaaaaaaa-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440007	Social Media Growth	Social Media Growth seeded achievement	award	2026-05-18 21:09:30.701048+00	2026-05-18 21:09:30.701048+00
aaaaaaaa-e29b-41d4-a716-446655440011	750e8400-e29b-41d4-a716-446655440003	Documentation Excellence	Documentation Excellence seeded achievement	award	2026-05-18 21:09:30.70105+00	2026-05-18 21:09:30.70105+00
aaaaaaaa-e29b-41d4-a716-446655440012	750e8400-e29b-41d4-a716-446655440004	Performance Optimization	Performance Optimization seeded achievement	award	2026-05-18 21:09:30.701052+00	2026-05-18 21:09:30.701053+00
aaaaaaaa-e29b-41d4-a716-446655440013	750e8400-e29b-41d4-a716-446655440008	System Implementation	System Implementation seeded achievement	award	2026-05-18 21:09:30.701054+00	2026-05-18 21:09:30.701054+00
aaaaaaaa-e29b-41d4-a716-446655440014	750e8400-e29b-41d4-a716-446655440010	Security Certification	Security Certification seeded achievement	award	2026-05-18 21:09:30.701056+00	2026-05-18 21:09:30.701057+00
aaaaaaaa-e29b-41d4-a716-446655440015	750e8400-e29b-41d4-a716-446655440009	Training Program Launch	Training Program Launch seeded achievement	award	2026-05-18 21:09:30.701058+00	2026-05-18 21:09:30.701059+00
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
04dcb0ac44b7
\.


--
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alerts (id, alert_type, severity, recipient_user_id, related_entity_type, related_entity_id, email_status, status, title, message, created_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, title, content, created_by, is_active, created_at, updated_at, audience, start_date, end_date) FROM stdin;
4a17af2c-8170-4e51-b8b8-77ed7250050f	Bonus	Bonus to be released on 10 of this month	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	t	2026-05-07 16:40:40.046864+00	2026-05-07 16:40:40.046867+00	all	\N	\N
150e8400-e29b-41d4-a716-446655440001	Welcome to HR System	Welcome to our new HR Monitoring System. This system helps track attendance, leaves, and performance.	750e8400-e29b-41d4-a716-446655440001	t	2026-05-18 21:09:31.187911+00	2026-05-18 21:09:31.187918+00	all	\N	\N
150e8400-e29b-41d4-a716-446655440002	New Work From Home Policy	Effective from next month, employees can work from home 2 days per week.	750e8400-e29b-41d4-a716-446655440001	t	2026-05-18 21:09:31.18792+00	2026-05-18 21:09:31.187921+00	all	\N	\N
150e8400-e29b-41d4-a716-446655440003	Q3 Performance Reviews	Q3 performance reviews will be conducted from August 15-30. Please prepare your self-assessment.	750e8400-e29b-41d4-a716-446655440001	t	2026-05-18 21:09:31.187923+00	2026-05-18 21:09:31.187924+00	all	\N	\N
150e8400-e29b-41d4-a716-446655440004	Team Building Event	Join us for our annual team building event on September 10th. Details coming soon!	750e8400-e29b-41d4-a716-446655440001	t	2026-05-18 21:09:31.187925+00	2026-05-18 21:09:31.187926+00	all	\N	\N
150e8400-e29b-41d4-a716-446655440005	System Maintenance Notice	Scheduled maintenance on August 5th from 2-4 AM. System will be unavailable during this time.	750e8400-e29b-41d4-a716-446655440001	t	2026-05-18 21:09:31.187928+00	2026-05-18 21:09:31.187929+00	all	\N	\N
\.


--
-- Data for Name: approval_steps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_steps (id, approval_id, approver_id, step_order, status, comments, acted_at, escalated_to_admin, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approval_timeline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_timeline (id, entity_type, entity_id, actor_id, action, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approvals (id, entity_type, entity_id, requested_by, decided_by, decision, reason, created_at, decided_at) FROM stdin;
8feb025c-6105-4d67-93ad-9863379324ba	project	8dae8182-951d-4279-8d82-82d9d5785412	44a8944f-d5ef-470d-a8d7-712a61a347df	70e267f7-da33-4956-a164-e1c3eae128e8	approved		2026-05-07 19:07:32.810192+00	2026-05-09 19:09:15.220786+00
\.


--
-- Data for Name: attendance_breaks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_breaks (id, attendance_session_id, user_id, break_type, started_at, ended_at, duration_minutes, note, is_paid, created_at, updated_at) FROM stdin;
a60e8400-e29b-41d4-a716-446655440001	950e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	dinner	2026-05-13 12:00:00+00	2026-05-13 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979573+00	2026-05-18 21:08:54.979579+00
a60e8400-e29b-41d4-a716-446655440002	950e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	prayer	2026-05-13 14:00:00+00	2026-05-13 14:15:00+00	15	Prayer break	t	2026-05-18 21:08:54.979581+00	2026-05-18 21:08:54.979583+00
a60e8400-e29b-41d4-a716-446655440003	950e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440003	dinner	2026-05-14 12:00:00+00	2026-05-14 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979584+00	2026-05-18 21:08:54.979585+00
a60e8400-e29b-41d4-a716-446655440004	950e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440003	other	2026-05-15 14:00:00+00	2026-05-15 14:20:00+00	20	Other break	t	2026-05-18 21:08:54.979586+00	2026-05-18 21:08:54.979587+00
a60e8400-e29b-41d4-a716-446655440005	950e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440004	dinner	2026-05-13 12:00:00+00	2026-05-13 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979589+00	2026-05-18 21:08:54.97959+00
a60e8400-e29b-41d4-a716-446655440006	950e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440004	prayer	2026-05-14 14:00:00+00	2026-05-14 14:15:00+00	15	Prayer break	t	2026-05-18 21:08:54.979591+00	2026-05-18 21:08:54.979593+00
a60e8400-e29b-41d4-a716-446655440007	950e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440004	dinner	2026-05-15 12:00:00+00	2026-05-15 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979594+00	2026-05-18 21:08:54.979594+00
a60e8400-e29b-41d4-a716-446655440008	950e8400-e29b-41d4-a716-446655440011	750e8400-e29b-41d4-a716-446655440006	dinner	2026-05-13 12:00:00+00	2026-05-13 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979595+00	2026-05-18 21:08:54.979596+00
a60e8400-e29b-41d4-a716-446655440009	950e8400-e29b-41d4-a716-446655440012	750e8400-e29b-41d4-a716-446655440006	prayer	2026-05-14 14:00:00+00	2026-05-14 14:15:00+00	15	Prayer break	t	2026-05-18 21:08:54.979597+00	2026-05-18 21:08:54.979598+00
a60e8400-e29b-41d4-a716-446655440010	950e8400-e29b-41d4-a716-446655440013	750e8400-e29b-41d4-a716-446655440006	dinner	2026-05-15 12:00:00+00	2026-05-15 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979599+00	2026-05-18 21:08:54.9796+00
a60e8400-e29b-41d4-a716-446655440011	950e8400-e29b-41d4-a716-446655440016	750e8400-e29b-41d4-a716-446655440007	dinner	2026-05-13 12:00:00+00	2026-05-13 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979601+00	2026-05-18 21:08:54.979602+00
a60e8400-e29b-41d4-a716-446655440012	950e8400-e29b-41d4-a716-446655440017	750e8400-e29b-41d4-a716-446655440007	other	2026-05-14 14:00:00+00	2026-05-14 14:20:00+00	20	Other break	t	2026-05-18 21:08:54.979603+00	2026-05-18 21:08:54.979604+00
a60e8400-e29b-41d4-a716-446655440013	950e8400-e29b-41d4-a716-446655440018	750e8400-e29b-41d4-a716-446655440007	dinner	2026-05-15 12:00:00+00	2026-05-15 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979605+00	2026-05-18 21:08:54.979606+00
a60e8400-e29b-41d4-a716-446655440014	950e8400-e29b-41d4-a716-446655440021	750e8400-e29b-41d4-a716-446655440008	dinner	2026-05-13 12:00:00+00	2026-05-13 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979607+00	2026-05-18 21:08:54.979608+00
a60e8400-e29b-41d4-a716-446655440015	950e8400-e29b-41d4-a716-446655440022	750e8400-e29b-41d4-a716-446655440008	prayer	2026-05-14 14:00:00+00	2026-05-14 14:15:00+00	15	Prayer break	t	2026-05-18 21:08:54.979609+00	2026-05-18 21:08:54.97961+00
a60e8400-e29b-41d4-a716-446655440016	950e8400-e29b-41d4-a716-446655440023	750e8400-e29b-41d4-a716-446655440008	dinner	2026-05-15 12:00:00+00	2026-05-15 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979611+00	2026-05-18 21:08:54.979612+00
a60e8400-e29b-41d4-a716-446655440017	950e8400-e29b-41d4-a716-446655440026	750e8400-e29b-41d4-a716-446655440010	dinner	2026-05-13 12:00:00+00	2026-05-13 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979613+00	2026-05-18 21:08:54.979613+00
a60e8400-e29b-41d4-a716-446655440018	950e8400-e29b-41d4-a716-446655440027	750e8400-e29b-41d4-a716-446655440010	other	2026-05-14 14:00:00+00	2026-05-14 14:20:00+00	20	Other break	t	2026-05-18 21:08:54.979614+00	2026-05-18 21:08:54.979615+00
a60e8400-e29b-41d4-a716-446655440019	950e8400-e29b-41d4-a716-446655440028	750e8400-e29b-41d4-a716-446655440010	dinner	2026-05-15 12:00:00+00	2026-05-15 12:30:00+00	30	Dinner break	t	2026-05-18 21:08:54.979616+00	2026-05-18 21:08:54.979617+00
a60e8400-e29b-41d4-a716-446655440020	950e8400-e29b-41d4-a716-446655440029	750e8400-e29b-41d4-a716-446655440010	prayer	2026-05-16 14:00:00+00	2026-05-16 14:15:00+00	15	Prayer break	t	2026-05-18 21:08:54.979618+00	2026-05-18 21:08:54.979619+00
404975fa-7bfa-4dac-9eaf-1f21ffc69c1c	5bafab71-467a-47bc-9145-f9eb7544cf5e	134eabbc-7a90-4dd3-b652-16f243b9ef5b	dinner	2026-05-18 21:20:15.639405+00	2026-05-18 21:20:41.262776+00	0		t	2026-05-18 21:20:15.640989+00	2026-05-18 21:20:41.264196+00
\.


--
-- Data for Name: attendance_corrections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_corrections (id, session_id, user_id, original_check_in_at, original_check_out_at, requested_check_in_at, requested_check_out_at, reason, status, manager_comment, created_at, updated_at) FROM stdin;
b60e8400-e29b-41d4-a716-446655440001	950e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	2026-05-13 08:45:00+00	2026-05-13 17:45:00+00	Seeded attendance correction request	approved	Approved	2026-05-18 21:08:55.27926+00	2026-05-18 21:08:55.279266+00
b60e8400-e29b-41d4-a716-446655440002	950e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440004	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	2026-05-13 08:45:00+00	2026-05-13 17:45:00+00	Seeded attendance correction request	pending	\N	2026-05-18 21:08:55.279268+00	2026-05-18 21:08:55.279269+00
b60e8400-e29b-41d4-a716-446655440003	950e8400-e29b-41d4-a716-446655440011	750e8400-e29b-41d4-a716-446655440006	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	2026-05-13 08:45:00+00	2026-05-13 17:45:00+00	Seeded attendance correction request	approved	Approved	2026-05-18 21:08:55.27927+00	2026-05-18 21:08:55.279271+00
b60e8400-e29b-41d4-a716-446655440004	950e8400-e29b-41d4-a716-446655440016	750e8400-e29b-41d4-a716-446655440007	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	2026-05-13 08:45:00+00	2026-05-13 17:45:00+00	Seeded attendance correction request	pending	\N	2026-05-18 21:08:55.279272+00	2026-05-18 21:08:55.279273+00
b60e8400-e29b-41d4-a716-446655440005	950e8400-e29b-41d4-a716-446655440021	750e8400-e29b-41d4-a716-446655440008	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	2026-05-13 08:45:00+00	2026-05-13 17:45:00+00	Seeded attendance correction request	approved	Approved	2026-05-18 21:08:55.279274+00	2026-05-18 21:08:55.279275+00
b60e8400-e29b-41d4-a716-446655440006	950e8400-e29b-41d4-a716-446655440026	750e8400-e29b-41d4-a716-446655440010	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	2026-05-13 08:45:00+00	2026-05-13 17:45:00+00	Seeded attendance correction request	pending	\N	2026-05-18 21:08:55.279276+00	2026-05-18 21:08:55.279277+00
b60e8400-e29b-41d4-a716-446655440007	950e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440003	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	2026-05-15 08:45:00+00	2026-05-15 17:45:00+00	Seeded attendance correction request	approved	Approved	2026-05-18 21:08:55.279278+00	2026-05-18 21:08:55.279279+00
b60e8400-e29b-41d4-a716-446655440008	950e8400-e29b-41d4-a716-446655440009	750e8400-e29b-41d4-a716-446655440004	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	2026-05-16 08:45:00+00	2026-05-16 17:45:00+00	Seeded attendance correction request	rejected	Please resubmit with proper documentation	2026-05-18 21:08:55.27928+00	2026-05-18 21:08:55.279281+00
\.


--
-- Data for Name: attendance_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_sessions (id, user_id, check_in_at, check_out_at, work_mode, session_status, is_late_login, is_early_logout, total_hours, attendance_classification, is_corrected, correction_requested, correction_reason, created_at, updated_at, worked_minutes, late_minutes, early_checkout_minutes, is_overtime, checkout_after_shift_reason, checkout_after_shift_note, expected_shift_start_at, expected_shift_end_at, total_break_minutes, dinner_break_minutes, prayer_break_minutes, other_break_minutes, early_checkout_reason) FROM stdin;
ee38cb0f-ff6f-42c5-8c7a-122c5a029384	fc26edc5-30cd-4273-9383-52ba142d04dd	2026-05-07 13:27:30.615523+00	\N	office	active	f	f	\N	active	f	f	\N	2026-05-07 13:27:30.616375+00	2026-05-07 13:27:30.616378+00	\N	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
ff644467-efcd-4f0a-aab7-dbf5922cddf8	70e267f7-da33-4956-a164-e1c3eae128e8	2026-05-07 14:36:53.275635+00	2026-05-07 14:37:27.275068+00	office	completed	f	f	0.009444286944444446	insufficient	f	f	\N	2026-05-07 14:36:53.276456+00	2026-05-07 14:37:27.275763+00	\N	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
ccc22bd7-609a-4435-b3c8-0d33c8efd2ed	70e267f7-da33-4956-a164-e1c3eae128e8	2026-05-07 14:38:09.180037+00	\N	office	active	f	f	\N	active	f	f	\N	2026-05-07 14:38:09.180333+00	2026-05-07 14:38:09.180335+00	\N	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.70981+00	2026-05-18 21:08:36.709814+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440003	2026-05-14 09:00:00+00	2026-05-14 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709817+00	2026-05-18 21:08:36.709817+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440003	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	wfh	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709819+00	2026-05-18 21:08:36.70982+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440003	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709821+00	2026-05-18 21:08:36.709822+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440003	2026-05-17 09:00:00+00	2026-05-17 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709823+00	2026-05-18 21:08:36.709824+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440004	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709825+00	2026-05-18 21:08:36.709826+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440004	2026-05-14 09:00:00+00	2026-05-14 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709827+00	2026-05-18 21:08:36.709828+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440004	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	wfh	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709829+00	2026-05-18 21:08:36.70983+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440009	750e8400-e29b-41d4-a716-446655440004	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709834+00	2026-05-18 21:08:36.709835+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440004	2026-05-17 09:00:00+00	2026-05-17 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709837+00	2026-05-18 21:08:36.709837+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440011	750e8400-e29b-41d4-a716-446655440006	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709839+00	2026-05-18 21:08:36.709839+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440012	750e8400-e29b-41d4-a716-446655440006	2026-05-14 09:00:00+00	2026-05-14 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709841+00	2026-05-18 21:08:36.709841+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440013	750e8400-e29b-41d4-a716-446655440006	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709843+00	2026-05-18 21:08:36.709843+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440014	750e8400-e29b-41d4-a716-446655440006	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	wfh	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709845+00	2026-05-18 21:08:36.709845+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440015	750e8400-e29b-41d4-a716-446655440006	2026-05-17 09:00:00+00	2026-05-17 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709847+00	2026-05-18 21:08:36.709847+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440016	750e8400-e29b-41d4-a716-446655440007	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709849+00	2026-05-18 21:08:36.709849+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440017	750e8400-e29b-41d4-a716-446655440007	2026-05-14 09:00:00+00	2026-05-14 17:30:00+00	wfh	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709851+00	2026-05-18 21:08:36.709851+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440018	750e8400-e29b-41d4-a716-446655440007	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709853+00	2026-05-18 21:08:36.709853+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440019	750e8400-e29b-41d4-a716-446655440007	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709855+00	2026-05-18 21:08:36.709855+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440020	750e8400-e29b-41d4-a716-446655440007	2026-05-17 09:00:00+00	2026-05-17 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709857+00	2026-05-18 21:08:36.709857+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440021	750e8400-e29b-41d4-a716-446655440008	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709859+00	2026-05-18 21:08:36.709859+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440022	750e8400-e29b-41d4-a716-446655440008	2026-05-14 09:00:00+00	2026-05-14 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709861+00	2026-05-18 21:08:36.709861+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440023	750e8400-e29b-41d4-a716-446655440008	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709863+00	2026-05-18 21:08:36.709863+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440024	750e8400-e29b-41d4-a716-446655440008	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	wfh	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709865+00	2026-05-18 21:08:36.709865+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440025	750e8400-e29b-41d4-a716-446655440008	2026-05-17 09:00:00+00	2026-05-17 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709867+00	2026-05-18 21:08:36.709867+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440026	750e8400-e29b-41d4-a716-446655440010	2026-05-13 09:00:00+00	2026-05-13 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709869+00	2026-05-18 21:08:36.709869+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440027	750e8400-e29b-41d4-a716-446655440010	2026-05-14 09:00:00+00	2026-05-14 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709871+00	2026-05-18 21:08:36.709871+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440028	750e8400-e29b-41d4-a716-446655440010	2026-05-15 09:00:00+00	2026-05-15 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709873+00	2026-05-18 21:08:36.709873+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440029	750e8400-e29b-41d4-a716-446655440010	2026-05-16 09:00:00+00	2026-05-16 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709875+00	2026-05-18 21:08:36.709875+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
950e8400-e29b-41d4-a716-446655440030	750e8400-e29b-41d4-a716-446655440010	2026-05-17 09:00:00+00	2026-05-17 17:30:00+00	office	completed	f	f	8.5	full_day	f	f	\N	2026-05-18 21:08:36.709877+00	2026-05-18 21:08:36.709877+00	510	\N	\N	f	\N	\N	\N	\N	0	0	0	0	\N
5bafab71-467a-47bc-9145-f9eb7544cf5e	134eabbc-7a90-4dd3-b652-16f243b9ef5b	2026-05-18 21:19:37.266017+00	2026-05-22 18:10:05.968203+00	office	completed	f	f	92.8411111111111	full_day	f	f	\N	2026-05-18 21:19:37.268826+00	2026-05-22 18:10:05.971504+00	5570	0	0	f	\N	\N	\N	\N	0	0	0	0	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, actor_user_id, action_type, entity_type, entity_id, old_value, new_value, metadata, created_at) FROM stdin;
ef7486fc-ec04-46a7-9378-a198e2ec39cc	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-07 12:28:30.02855+00
290b50f2-572a-467e-97de-146d5afd7cbf	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_CREATED	user	fc26edc5-30cd-4273-9383-52ba142d04dd	null	{"email": "zain@gmail.com", "role": "intern"}	\N	2026-05-07 13:26:46.839835+00
14f6eaca-9a1c-4302-b36d-7ea850751e96	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-07 13:27:08.492771+00
7c21b24a-c7bc-49af-b3c2-987b07e8870e	fc26edc5-30cd-4273-9383-52ba142d04dd	LOGIN	auth	fc26edc5-30cd-4273-9383-52ba142d04dd	null	{"role": "intern"}	\N	2026-05-07 13:27:20.106895+00
c01e33a4-05fb-469c-a3c0-e594d532f457	fc26edc5-30cd-4273-9383-52ba142d04dd	LOGOUT	auth	fc26edc5-30cd-4273-9383-52ba142d04dd	null	null	\N	2026-05-07 13:33:03.481573+00
f01c03d2-174e-486f-a34e-54c109ba028d	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-07 14:34:12.097307+00
a608ac23-0779-46b5-a1bc-31e10001e44f	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_DEACTIVATED	user	fc26edc5-30cd-4273-9383-52ba142d04dd	{"status": "inactive"}	{"status": "inactive"}	\N	2026-05-07 14:34:35.781216+00
f0b86297-07ca-4a3f-a3bc-bbef93fdca5e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-07 14:34:48.039548+00
a9c7713e-6bfa-4562-8793-e24b4a4c3b09	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-07 14:34:54.828809+00
db9dcfe1-ff6f-4709-81e7-ef3b38a1d9cd	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_INVITED	user	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"email": "ziadin.544@gmail.com", "role": "manager"}	\N	2026-05-07 14:35:29.144472+00
cebcdb23-ca56-4fbe-8a30-1f80eff28ba2	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	INVITE_EMAIL_SENT	user	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"email": "ziadin.544@gmail.com"}	\N	2026-05-07 14:35:29.144472+00
26a006f3-7752-4cdd-a0d3-31af27241a38	70e267f7-da33-4956-a164-e1c3eae128e8	ACCOUNT_ACTIVATED	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-07 14:36:17.482509+00
1255d6d8-de61-47ce-9b5c-23356a182cd8	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-07 14:36:37.137006+00
95ee419e-0de2-42d3-90bf-719e3bc9408c	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-07 14:36:42.452627+00
b4e138ed-56bc-4c99-9961-6fb66c786346	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-07 16:39:21.89232+00
3cd1cea4-aa04-4e37-83d0-2a640f773554	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-07 16:39:28.858371+00
d2edbb3b-f5f3-473a-84bd-4805c1be03a2	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-07 16:40:45.10065+00
b8dbe534-503f-460b-a9c0-502b3862db65	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-07 16:40:52.527813+00
06dbfc6f-f181-4632-b911-6c30542c058a	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-07 16:41:15.350821+00
505d7427-1123-42b0-a71e-1e375164d31b	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-07 16:41:21.125651+00
d30ae0dc-80f1-4d25-b3e7-3673fa8b13a1	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_INVITED	user	44a8944f-d5ef-470d-a8d7-712a61a347df	null	{"email": "irfaanexe@gmail.com", "role": "employee"}	\N	2026-05-07 16:42:02.327268+00
00d7292c-0891-4de0-9610-a68192ac988a	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	INVITE_EMAIL_SENT	user	44a8944f-d5ef-470d-a8d7-712a61a347df	null	{"email": "irfaanexe@gmail.com"}	\N	2026-05-07 16:42:02.327268+00
1424bee9-f416-443f-968c-52e734fc11f9	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_INVITED	user	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"email": "izainulabideen04@gmail.com", "role": "intern"}	\N	2026-05-07 16:42:38.161375+00
3d9e9331-082f-4046-9cf9-13198f813b2f	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	INVITE_EMAIL_SENT	user	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"email": "izainulabideen04@gmail.com"}	\N	2026-05-07 16:42:38.161375+00
a3607dc3-241f-4039-ad11-4524d4134d42	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-07 16:42:46.461669+00
692680a0-a1c4-444c-973d-94c1ab54ef16	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-07 16:42:53.84409+00
49ef20ed-79d1-4b11-9d98-90eb66c63f4c	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-07 16:43:51.062351+00
f5dbbbbd-5ed3-4371-85ca-87ec75078c34	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-07 16:43:56.531813+00
36ce5fc7-b132-4145-ab39-f0f7e447e9c8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ACCOUNT_ACTIVATED	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	null	\N	2026-05-07 18:55:38.491551+00
9ae1d888-fa8e-4b59-928c-cfce8eee608b	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"role": "intern"}	\N	2026-05-07 18:55:51.324335+00
859ea740-dece-4a81-a321-16b4295e5573	44a8944f-d5ef-470d-a8d7-712a61a347df	ACCOUNT_ACTIVATED	auth	44a8944f-d5ef-470d-a8d7-712a61a347df	null	null	\N	2026-05-07 18:56:54.105106+00
9923b87f-da8d-4370-a6df-d69cd28ff15e	44a8944f-d5ef-470d-a8d7-712a61a347df	LOGIN	auth	44a8944f-d5ef-470d-a8d7-712a61a347df	null	{"role": "employee"}	\N	2026-05-07 18:57:24.805323+00
8f33df7b-6aff-4aaf-a1e2-f6319d9d9a49	44a8944f-d5ef-470d-a8d7-712a61a347df	PROJECT_CREATED	project	8dae8182-951d-4279-8d82-82d9d5785412	null	{"title": "internal dashboard", "status": "pending_approval"}	\N	2026-05-07 19:07:32.810192+00
f4701189-7bdd-489c-8c0d-25161f5bf855	44a8944f-d5ef-470d-a8d7-712a61a347df	LOGOUT	auth	44a8944f-d5ef-470d-a8d7-712a61a347df	null	null	\N	2026-05-07 19:20:02.495214+00
996a23bd-1969-485f-b4b4-5824f37e744b	44a8944f-d5ef-470d-a8d7-712a61a347df	LOGIN	auth	44a8944f-d5ef-470d-a8d7-712a61a347df	null	{"role": "employee"}	\N	2026-05-07 19:20:08.342558+00
2033be7d-d88e-4f08-ba4b-0b5d590367c8	44a8944f-d5ef-470d-a8d7-712a61a347df	LOGIN_FAILED	auth	44a8944f-d5ef-470d-a8d7-712a61a347df	null	{"reason": "bad_password"}	\N	2026-05-07 19:46:56.939862+00
f7a6da95-3968-4948-8c00-520487e7a210	44a8944f-d5ef-470d-a8d7-712a61a347df	PASSWORD_RESET_REQUEST	auth	44a8944f-d5ef-470d-a8d7-712a61a347df	null	null	\N	2026-05-07 19:55:35.113764+00
12cff0ee-e46e-4477-8dbc-d545154b0615	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-09 19:08:36.384381+00
d8d08a88-8458-4bac-9e32-1760890eb503	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-09 19:08:54.711509+00
e59b764b-6e73-44e5-a263-28a1d557ceaf	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-09 19:08:57.709386+00
567a07c5-1198-445e-af8b-7af546e56748	70e267f7-da33-4956-a164-e1c3eae128e8	PROJECT_APPROVED	project	8dae8182-951d-4279-8d82-82d9d5785412	{"approval_status": "pending"}	{"approval_status": "approved", "reason": ""}	\N	2026-05-09 19:09:15.213896+00
87c100fc-cd64-48cf-8fb8-38b23b7b3d89	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-13 18:17:52.310354+00
d829da3d-d0ef-46d2-a467-6564f5959640	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-13 18:18:00.318245+00
215bfd8b-5b96-4c8b-b753-9b3e5956913e	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-14 10:33:19.298164+00
0095348b-1b9c-4c90-92cd-7051d85f2b03	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-14 10:33:42.337536+00
990c218c-0848-414a-a53b-62151507767c	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-14 10:33:47.528829+00
3f25e763-2cdd-48a7-99a7-3724cee1dca3	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-14 10:34:14.742439+00
c275ddfa-e873-4e34-a2c9-4202613f910a	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-15 15:01:20.157818+00
eab2b03f-960b-48fe-a251-1580c8580568	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-15 15:01:30.891998+00
1e91f991-fd12-4b95-a86e-797f17291033	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:03:28.523359+00
0549a4c9-44cc-4f53-9455-9cea34c19c1b	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	PASSWORD_RESET_REQUEST	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:08:15.861869+00
3cad8097-390c-4384-9547-374fa83ffaa5	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	PASSWORD_RESET_COMPLETE	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:09:47.852989+00
9bb15c61-a949-4954-9ce5-dc93c8228c5e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:10:00.09995+00
83ee1b5c-1242-4fa7-8563-bd853964088e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:11:10.776427+00
70db3d9c-6866-4b37-9969-15865048d748	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:11:26.417995+00
3346029e-b02f-478d-a956-2539846276b4	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:14:06.268366+00
cdcd3d24-4910-46bc-9522-3a816d8c4a4c	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:29:38.510753+00
7af970e5-de42-4668-97e7-ce64a01b5fa8	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:31:17.690111+00
fead5f88-79a5-4f9f-924f-fa64e3398e13	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:33:30.145957+00
bc8fdcd3-a169-4211-8010-4fe040860958	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:33:35.001698+00
fa0a57c5-ab04-4c1f-a203-a33b9510972a	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:33:45.263168+00
533edcd9-022a-4e0e-8c38-c75a4ae2c982	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:40:52.000542+00
00fc81d0-3d25-4611-a74e-259b6dc373ad	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:41:20.257332+00
6c02fbec-7ceb-46f7-93e4-c8b6510b8fd2	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:41:29.593006+00
308663e1-2d4d-4cd7-b389-9645f8864a15	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:33:55.059793+00
2fb52f18-d99d-4928-9cc2-4d2c4bca4fb7	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 17:36:50.64747+00
5befdf35-57fa-49da-a177-084a1fefc7b1	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:36:59.552852+00
576db681-3fba-497d-82ac-cc09e0fd1b7e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:41:23.166198+00
db95401f-e882-4060-a27f-46ede0c24897	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 17:54:34.194638+00
1621fa98-e141-4e59-b343-5d41cd8cdfbc	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 18:10:21.746046+00
591ac6c6-1471-47d7-a7b9-bdca7149439e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 18:10:31.306654+00
420fd627-3591-484a-ab3a-238168b53959	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 18:26:56.651926+00
69d3d9f1-02b2-4dd5-b8ef-a5bb03351a1e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 18:26:59.88713+00
d4dcf2c6-64b0-479b-a4a3-31e4774722f8	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 18:44:03.878669+00
20241d44-4fc8-4fad-bcd6-307fd51332bd	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:02:08.133748+00
05233586-5091-482b-8a3e-df4219b44334	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:15:15.179662+00
42b9c6be-f6cc-488c-8503-5bff3e4c68b1	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:16:46.884267+00
54dfc6e5-b1a5-44a0-a2fc-3c413810ea1d	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN_FAILED	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"reason": "bad_password"}	\N	2026-05-18 19:16:53.026232+00
3663a64e-31a5-4561-af29-95c16b6e5a9b	70e267f7-da33-4956-a164-e1c3eae128e8	PASSWORD_RESET_REQUEST	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-18 19:17:03.256261+00
b104ed25-8643-42bf-a2b4-55195018d8d6	134eabbc-7a90-4dd3-b652-16f243b9ef5b	PASSWORD_RESET_REQUEST	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	null	\N	2026-05-18 19:18:07.926133+00
d70ca4ab-0181-4d36-9b63-920f5ac64445	70e267f7-da33-4956-a164-e1c3eae128e8	PASSWORD_RESET_REQUEST	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-18 19:20:06.580322+00
673840cb-6a2b-4a0f-a604-599331936508	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:20:31.276083+00
3f136299-6368-496a-86bb-d67f4723e814	70e267f7-da33-4956-a164-e1c3eae128e8	PASSWORD_RESET_REQUEST	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-18 19:20:37.76478+00
75f1326e-48ac-45aa-8e91-886ea16a9e8a	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:29:28.3738+00
7efbf36f-6ab6-47c9-ab2c-7a1cdfd88dc4	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:31:02.136084+00
37cf6d8d-9287-44c8-bdea-675ab5677dc6	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:32:49.76112+00
d8754192-61fb-4c07-adc9-99d00b1113eb	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:34:43.777929+00
21506bb5-fa05-4e88-9c94-75f33d8dddbc	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:36:15.585022+00
551e7bb3-7df1-45df-be78-fa38c452df70	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:37:58.695105+00
dbefcf0c-8d3a-4a7a-ae1f-61c5cdbc7668	134eabbc-7a90-4dd3-b652-16f243b9ef5b	PASSWORD_RESET_REQUEST	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	null	\N	2026-05-18 19:38:13.499759+00
893ca6e9-9bd8-4a12-af7e-7fcf9a6f3224	134eabbc-7a90-4dd3-b652-16f243b9ef5b	PASSWORD_RESET_COMPLETE	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	null	\N	2026-05-18 19:39:04.696756+00
c9b83d94-cb88-4ab4-8f07-67bd02c69325	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"role": "intern"}	\N	2026-05-18 19:39:16.79019+00
0f589038-3482-41c3-ac1b-67d810bf61a6	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGOUT	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	null	\N	2026-05-18 19:40:30.227506+00
5052cd38-f720-4551-af82-86729ad48296	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:40:45.301815+00
0b77d0b6-cc0d-4fd6-bda3-0e58b38e7c16	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:40:50.73017+00
7ef143c0-75a8-40e7-a62e-77f2cb39045b	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN_FAILED	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"reason": "bad_password"}	\N	2026-05-18 19:41:06.382624+00
32d1b15a-f787-4e3b-92b8-3255166a1c6a	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"role": "intern"}	\N	2026-05-18 19:41:14.583824+00
94d963c4-f45d-44dc-a111-ceda7209203a	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 19:43:28.032251+00
faeeddf1-b112-4f6e-894d-3ec5eb7ac392	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 19:43:39.504817+00
784d5a6f-64c2-4eb3-8af4-c1bfe35bbd68	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"role": "intern"}	\N	2026-05-18 19:43:59.043267+00
b6d627f2-4558-45fe-8f0f-38aab7ef5ceb	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGOUT	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	null	\N	2026-05-18 20:19:57.992108+00
bef0bd18-cd28-4f3a-897e-474c3051f8a6	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:20:12.505246+00
d79b902e-9a33-4207-a7b1-f60c432897f5	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 20:20:38.400733+00
30af47d4-3c47-4640-86ca-e66fe49902d3	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:21:02.280594+00
644b87d1-4038-44b9-a0b6-0444f6cfaa2d	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 20:21:23.348934+00
3864d640-71ec-484a-9e2a-2cc511545f53	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:24:49.193603+00
06e298a2-b8a5-4ff8-be3f-61593dc5213f	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 20:25:56.510633+00
73092242-07c0-4abc-8587-a00a8124a952	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:26:22.271616+00
263e3212-54d7-4a03-837b-50e114f2c37a	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 20:28:55.233169+00
fa0beef2-0833-4b57-8cc4-fbaa8ac3dcfb	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:29:44.6973+00
8a42a3d4-12f3-41db-812b-9f48a2b9b156	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:51:38.810821+00
225413a5-0d11-4c31-9848-be797965aae1	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 20:55:28.896934+00
d04e5ff0-4bcd-4948-ad55-534abdf10a9a	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-18 20:57:04.369573+00
d956f0af-cfe3-43a0-82ed-7bb555b6205b	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-18 21:19:04.970994+00
df9e415a-17bb-4b76-bd6e-cd6468594bcf	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"role": "intern"}	\N	2026-05-18 21:19:13.921612+00
0ebc9144-aca7-45e6-845f-d32b04dadbd3	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-19 13:10:58.610469+00
5c4e3a98-9fbc-434a-b273-b904dca4c2f0	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-19 15:02:13.805044+00
cd354730-2fd2-47f0-bd3d-44cd26782d98	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN_FAILED	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"reason": "bad_password"}	\N	2026-05-19 15:02:24.554756+00
9aeb16b1-cf5a-4fa1-8dd3-87352e6a7c98	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-19 15:02:29.818779+00
8855207c-ac86-40ca-97af-2f99cd90132b	70e267f7-da33-4956-a164-e1c3eae128e8	PASSWORD_RESET_REQUEST	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-19 15:02:37.026805+00
99359d67-a1e0-40e7-b860-17ae05b2eb7a	70e267f7-da33-4956-a164-e1c3eae128e8	PASSWORD_RESET_COMPLETE	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-19 15:03:26.278425+00
9fd31ec6-c9eb-476f-b150-be43e627ee3b	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-19 15:03:45.658574+00
1353d9d9-0d8e-4d4b-9e02-976dc00f780c	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-19 15:24:02.473594+00
bdb4a880-bf56-4264-ab57-6e34066ebd4c	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-19 15:27:08.869285+00
ad99f591-f036-439b-bef5-ae5f3a9952e2	750e8400-e29b-41d4-a716-446655440001	LOGIN_FAILED	auth	750e8400-e29b-41d4-a716-446655440001	null	{"reason": "bad_password"}	\N	2026-05-19 15:50:20.549315+00
98c0e26d-b68c-4cac-b179-5d83c9934d10	750e8400-e29b-41d4-a716-446655440001	LOGIN_FAILED	auth	750e8400-e29b-41d4-a716-446655440001	null	{"reason": "bad_password"}	\N	2026-05-19 15:52:50.206205+00
04a48b31-c423-4ae2-8975-4e6dfab59feb	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	TASK_CREATED	task	0400dd86-68c9-4233-a836-481d7ae08d2b	null	{"title": "Analyze the system"}	\N	2026-05-19 17:50:23.133336+00
2dfa2ba7-1465-466e-819b-660224a0ef7d	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-19 17:50:35.150924+00
4bf7e0ac-3f73-4131-891c-c5f8fbcb32b8	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-19 17:50:42.069336+00
be4c9b5c-1d1f-4b7f-b636-b514228f606f	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-20 13:02:14.635224+00
a69899c9-485d-4a31-92d6-fed340115c37	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-20 15:25:43.720529+00
0f053995-1c0c-4082-a3dd-cc6525f1ead8	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-20 17:02:16.456755+00
bea4599e-31b8-447c-8b2c-73f50db1aad1	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-22 17:44:07.142434+00
b5472005-ff63-4070-887f-c71ed94143af	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-22 17:44:13.647227+00
934bc55d-d32d-411d-a1c7-29db2803b2ac	70e267f7-da33-4956-a164-e1c3eae128e8	LOGOUT	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	null	\N	2026-05-22 17:44:48.449864+00
ec93e4ee-e322-4430-9a1a-5f4c049e5def	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-22 17:45:26.307123+00
495a6ae1-cd02-4507-b19e-799d857ab8e4	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-22 17:48:28.080553+00
e3363cbe-bec4-4333-9e08-128c4f1b9f40	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGIN	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	{"role": "admin"}	\N	2026-05-22 17:48:34.286167+00
a244532e-3c03-4114-8ea7-40975302f902	134eabbc-7a90-4dd3-b652-16f243b9ef5b	LOGIN	auth	134eabbc-7a90-4dd3-b652-16f243b9ef5b	null	{"role": "intern"}	\N	2026-05-22 17:49:05.385369+00
48bb1a40-70b5-4138-ae36-6aa8f4135ec3	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_INVITED	user	18ed9428-247b-4318-9399-ae4173674715	null	{"email": "muhammadammar7747@gmail.com", "role": "manager"}	\N	2026-05-22 17:49:31.997099+00
fc6c0d0c-d00b-4bee-ba30-4498df3aa9e0	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	INVITE_EMAIL_SENT	user	18ed9428-247b-4318-9399-ae4173674715	null	{"email": "muhammadammar7747@gmail.com"}	\N	2026-05-22 17:49:31.997099+00
95ab5b65-5100-4afb-8e4e-e34979600694	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	USER_INVITED	user	fb2f8520-8ef4-4b55-907c-b935480944f3	null	{"email": "syedaliazzam1995@gmail.com", "role": "admin"}	\N	2026-05-22 17:51:28.302266+00
4f72d6b3-819d-4b4d-bfe1-dd3cb788f1af	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	INVITE_EMAIL_SENT	user	fb2f8520-8ef4-4b55-907c-b935480944f3	null	{"email": "syedaliazzam1995@gmail.com"}	\N	2026-05-22 17:51:28.302266+00
6fa69097-ead4-4a8f-b05e-3d7577d8893e	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	LOGOUT	auth	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	null	null	\N	2026-05-22 18:06:51.14501+00
3d20c02f-a20e-4b8f-8853-1ec09df2fd56	70e267f7-da33-4956-a164-e1c3eae128e8	LOGIN	auth	70e267f7-da33-4956-a164-e1c3eae128e8	null	{"role": "manager"}	\N	2026-05-22 18:06:56.941508+00
\.


--
-- Data for Name: call_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.call_participants (id, call_session_id, user_id, status, joined_at, left_at) FROM stdin;
0c595fe6-8979-4b5c-9421-15b392f11f5a	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	134eabbc-7a90-4dd3-b652-16f243b9ef5b	left	2026-05-22 19:28:57.00761+00	2026-05-22 19:29:17.543642+00
88145943-a95c-45bf-93e2-bcff21288eb5	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	70e267f7-da33-4956-a164-e1c3eae128e8	left	2026-05-22 19:28:25.688291+00	2026-05-22 19:29:17.543647+00
0b677123-52e2-4548-98cb-0b564a59d503	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	left	2026-05-22 19:29:21.935028+00	2026-05-22 19:29:34.225727+00
9eea5b66-b377-4138-857b-8b0d26a996aa	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	134eabbc-7a90-4dd3-b652-16f243b9ef5b	left	2026-05-22 19:29:30.689995+00	2026-05-22 19:29:34.225718+00
17787452-00a7-47c8-a533-1c14de1d0ddd	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	left	2026-05-22 19:29:46.340228+00	2026-05-22 19:31:03.270353+00
400dba02-e43b-4254-9f36-ade1eaaf7daa	dad172c8-edeb-4354-bab8-ec026f545014	70e267f7-da33-4956-a164-e1c3eae128e8	left	2026-05-22 19:29:56.388515+00	2026-05-22 19:31:03.270357+00
\.


--
-- Data for Name: call_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.call_sessions (id, conversation_id, started_by_id, call_type, status, started_at, accepted_at, ended_at, created_at) FROM stdin;
be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	70e267f7-da33-4956-a164-e1c3eae128e8	voice	ended	2026-05-22 19:28:57.007617+00	2026-05-22 19:28:57.007622+00	2026-05-22 19:29:17.540982+00	2026-05-22 19:28:25.685468+00
2c09c71e-5afb-4745-ad27-3fbcbb43c35d	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	70e267f7-da33-4956-a164-e1c3eae128e8	voice	ended	2026-05-22 19:29:30.690001+00	2026-05-22 19:29:30.690005+00	2026-05-22 19:29:34.223086+00	2026-05-22 19:29:21.932274+00
dad172c8-edeb-4354-bab8-ec026f545014	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	134eabbc-7a90-4dd3-b652-16f243b9ef5b	voice	ended	2026-05-22 19:29:56.388524+00	2026-05-22 19:29:56.388526+00	2026-05-22 19:31:03.268088+00	2026-05-22 19:29:46.337946+00
\.


--
-- Data for Name: call_signals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.call_signals (id, call_session_id, sender_id, recipient_id, signal_type, payload_json, created_at, consumed_at) FROM stdin;
51030b91-8678-47d3-a1c3-2b5db00c5d47	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ice_candidate	{"candidate": "candidate:2251678365 1 udp 2122260223 192.168.1.12 56710 typ host generation 0 ufrag o+/N network-id 1 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "o+/N"}	2026-05-22 19:28:26.809766+00	2026-05-22 19:28:51.779918+00
5cb852f9-2cf1-41b5-a81b-17b93273fbee	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	offer	{"sdp": "v=0\\r\\no=- 6452912497856660395 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=extmap-allow-mixed\\r\\na=msid-semantic: WMS 5bf0622e-c0d2-496c-96b4-87afc7afd1a3\\r\\nm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126\\r\\nc=IN IP4 0.0.0.0\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=ice-ufrag:o+/N\\r\\na=ice-pwd:vRD99RXqdqGyb3PJB+mYWZ3m\\r\\na=ice-options:trickle\\r\\na=fingerprint:sha-256 A5:C4:F8:D0:59:07:A3:A0:65:DA:5E:05:FD:6C:66:84:27:03:10:83:9B:1C:29:16:40:9C:32:80:05:0D:95:07\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\\r\\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\\r\\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\\r\\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\\r\\na=sendrecv\\r\\na=msid:5bf0622e-c0d2-496c-96b4-87afc7afd1a3 de625175-fa95-4771-88a7-2c38ec9693b0\\r\\na=rtcp-mux\\r\\na=rtcp-rsize\\r\\na=rtpmap:111 opus/48000/2\\r\\na=rtcp-fb:111 transport-cc\\r\\na=fmtp:111 minptime=10;useinbandfec=1\\r\\na=rtpmap:63 red/48000/2\\r\\na=fmtp:63 111/111\\r\\na=rtpmap:9 G722/8000\\r\\na=rtpmap:0 PCMU/8000\\r\\na=rtpmap:8 PCMA/8000\\r\\na=rtpmap:13 CN/8000\\r\\na=rtpmap:110 telephone-event/48000\\r\\na=rtpmap:126 telephone-event/8000\\r\\na=ssrc:852064104 cname:uxriklMbPebe5yIh\\r\\na=ssrc:852064104 msid:5bf0622e-c0d2-496c-96b4-87afc7afd1a3 de625175-fa95-4771-88a7-2c38ec9693b0\\r\\n", "type": "offer"}	2026-05-22 19:28:26.524478+00	2026-05-22 19:28:51.779918+00
68b68ae2-ae42-4665-99e7-cd863943706a	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ice_candidate	{"candidate": "candidate:4177133573 1 tcp 1518280447 192.168.1.12 9 typ host tcptype active generation 0 ufrag o+/N network-id 1 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "o+/N"}	2026-05-22 19:28:27.099837+00	2026-05-22 19:28:51.779918+00
f6dcc32a-6e3a-436c-9882-a0c09d55e2ac	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ice_candidate	{"candidate": "candidate:3335491636 1 udp 1686052607 140.235.80.57 48808 typ srflx raddr 192.168.1.12 rport 56710 generation 0 ufrag o+/N network-id 1 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "o+/N"}	2026-05-22 19:28:26.838668+00	2026-05-22 19:28:51.779918+00
66086334-148a-4aa3-9053-3bc5cd7f88bf	be23dfe1-7a3a-4e5e-8aaf-bb368ee75054	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	end	{}	2026-05-22 19:29:16.727545+00	\N
1815bff7-204d-42da-8343-d10963756362	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ice_candidate	{"candidate": "candidate:1608401870 1 udp 1686052607 140.235.80.57 48952 typ srflx raddr 192.168.1.12 rport 49209 generation 0 ufrag Myzw network-id 1 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "Myzw"}	2026-05-22 19:29:23.36529+00	2026-05-22 19:29:25.613446+00
6f3649ea-68d4-4b68-8f40-e8cbcbd490b2	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ice_candidate	{"candidate": "candidate:4036272880 1 udp 2122260223 192.168.1.12 49209 typ host generation 0 ufrag Myzw network-id 1 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "Myzw"}	2026-05-22 19:29:23.051648+00	2026-05-22 19:29:25.613446+00
72c833ad-8cef-472e-819d-5787779f5287	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	ice_candidate	{"candidate": "candidate:238974564 1 tcp 1518280447 192.168.1.12 9 typ host tcptype active generation 0 ufrag Myzw network-id 1 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "Myzw"}	2026-05-22 19:29:23.368093+00	2026-05-22 19:29:25.613446+00
e4320d2e-e43f-464d-ac85-dc758a2e17d9	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	offer	{"sdp": "v=0\\r\\no=- 8812817218341951305 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=extmap-allow-mixed\\r\\na=msid-semantic: WMS 9c4755b0-df5f-4ae6-9756-75cc25c5b166\\r\\nm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126\\r\\nc=IN IP4 0.0.0.0\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=ice-ufrag:Myzw\\r\\na=ice-pwd:+7nMeHBgXig13lmwMsKthG7C\\r\\na=ice-options:trickle\\r\\na=fingerprint:sha-256 16:A8:1E:AC:E2:C4:E4:AB:87:0A:00:FB:CA:AE:14:D3:A3:5C:18:91:4A:B4:D8:9C:2F:4F:7A:CD:E2:F9:CD:01\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\\r\\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\\r\\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\\r\\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\\r\\na=sendrecv\\r\\na=msid:9c4755b0-df5f-4ae6-9756-75cc25c5b166 1168abc0-be28-4bc1-8c3b-4fa76f5bf47c\\r\\na=rtcp-mux\\r\\na=rtcp-rsize\\r\\na=rtpmap:111 opus/48000/2\\r\\na=rtcp-fb:111 transport-cc\\r\\na=fmtp:111 minptime=10;useinbandfec=1\\r\\na=rtpmap:63 red/48000/2\\r\\na=fmtp:63 111/111\\r\\na=rtpmap:9 G722/8000\\r\\na=rtpmap:0 PCMU/8000\\r\\na=rtpmap:8 PCMA/8000\\r\\na=rtpmap:13 CN/8000\\r\\na=rtpmap:110 telephone-event/48000\\r\\na=rtpmap:126 telephone-event/8000\\r\\na=ssrc:1924834533 cname:1HPA58Gx5mdvYgMm\\r\\na=ssrc:1924834533 msid:9c4755b0-df5f-4ae6-9756-75cc25c5b166 1168abc0-be28-4bc1-8c3b-4fa76f5bf47c\\r\\n", "type": "offer"}	2026-05-22 19:29:23.339239+00	2026-05-22 19:29:25.613446+00
1d35633d-e666-4861-8c04-93db9c690f57	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	end	{}	2026-05-22 19:29:33.099243+00	\N
ec675797-248d-4c54-a323-01a3d20ddf55	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	end	{}	2026-05-22 19:29:33.769329+00	\N
330dd4d1-fc94-4642-8b1a-8c6370b9b7da	2c09c71e-5afb-4745-ad27-3fbcbb43c35d	70e267f7-da33-4956-a164-e1c3eae128e8	134eabbc-7a90-4dd3-b652-16f243b9ef5b	end	{}	2026-05-22 19:29:34.393973+00	\N
f5ee6dfb-b22a-457f-83ca-b7a2c6484141	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:572641185 1 udp 2122066175 2400:adca:124:4200:b17c:a25:ee82:a330 57405 typ host generation 0 ufrag mQ+v network-id 4 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.44931+00	2026-05-22 19:29:56.027484+00
2715ea60-3d04-49fe-99ba-56e99953f81e	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:2785796190 1 tcp 1518151935 2400:adca:124:4200:496d:5c34:e1ed:47af 9 typ host tcptype active generation 0 ufrag mQ+v network-id 3 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.68416+00	2026-05-22 19:29:56.027484+00
5f0e3c2f-146b-40e7-8cd8-7c110460fb31	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:2671629094 1 udp 2121998079 192.168.1.7 57403 typ host generation 0 ufrag mQ+v network-id 2 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.641558+00	2026-05-22 19:29:56.027484+00
73da8a6e-a99c-4e1c-a211-587f72e845d3	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	end	{}	2026-05-22 19:31:02.014376+00	\N
2be2586d-6ada-4c78-967f-1b389f0bfab3	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:3754402191 1 udp 1685790463 140.235.80.29 39532 typ srflx raddr 192.168.1.7 rport 57403 generation 0 ufrag mQ+v network-id 2 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.673332+00	2026-05-22 19:29:56.027484+00
0c4ac7fe-c601-4763-abbe-d415d10d38fb	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:58490435 1 tcp 1518280447 172.22.80.1 9 typ host tcptype active generation 0 ufrag mQ+v network-id 1", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.674797+00	2026-05-22 19:29:56.027484+00
44b8c746-bfc0-4b02-83e6-ac8adef5a2eb	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:1637287858 1 tcp 1518018303 192.168.1.7 9 typ host tcptype active generation 0 ufrag mQ+v network-id 2 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.699621+00	2026-05-22 19:29:56.027484+00
67664be3-5a98-4743-949b-dccc13e2d920	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:1486959818 1 udp 2122131711 2400:adca:124:4200:496d:5c34:e1ed:47af 57404 typ host generation 0 ufrag mQ+v network-id 3 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.441572+00	2026-05-22 19:29:56.027484+00
83d61e05-4429-40a2-bf12-4319dc4f816f	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:3530392929 1 tcp 1518214911 172.29.128.1 9 typ host tcptype active generation 0 ufrag mQ+v network-id 5", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.675529+00	2026-05-22 19:29:56.027484+00
909e16cf-da5e-4daf-b381-cee532479650	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	offer	{"sdp": "v=0\\r\\no=- 307215446983018023 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=extmap-allow-mixed\\r\\na=msid-semantic: WMS 6aaf3f0d-022f-40ff-abbe-0e7e9ae8c923\\r\\nm=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126\\r\\nc=IN IP4 0.0.0.0\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=ice-ufrag:mQ+v\\r\\na=ice-pwd:JcjjTnzpGshkSq8VUjo3ZSPk\\r\\na=ice-options:trickle\\r\\na=fingerprint:sha-256 80:75:77:80:BF:14:06:0D:2D:96:48:89:A1:C0:21:70:9E:D6:9D:D6:4A:A7:F5:24:9D:EF:BF:55:42:8D:10:E8\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\\r\\na=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\\r\\na=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\\r\\na=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid\\r\\na=sendrecv\\r\\na=msid:6aaf3f0d-022f-40ff-abbe-0e7e9ae8c923 b53aebfc-fa7f-43f5-bb22-371c1dba1a5f\\r\\na=rtcp-mux\\r\\na=rtcp-rsize\\r\\na=rtpmap:111 opus/48000/2\\r\\na=rtcp-fb:111 transport-cc\\r\\na=fmtp:111 minptime=10;useinbandfec=1\\r\\na=rtpmap:63 red/48000/2\\r\\na=fmtp:63 111/111\\r\\na=rtpmap:9 G722/8000\\r\\na=rtpmap:0 PCMU/8000\\r\\na=rtpmap:8 PCMA/8000\\r\\na=rtpmap:13 CN/8000\\r\\na=rtpmap:110 telephone-event/48000\\r\\na=rtpmap:126 telephone-event/8000\\r\\na=ssrc:268724619 cname:MfSLoR7fOcsoS/Mp\\r\\na=ssrc:268724619 msid:6aaf3f0d-022f-40ff-abbe-0e7e9ae8c923 b53aebfc-fa7f-43f5-bb22-371c1dba1a5f\\r\\n", "type": "offer"}	2026-05-22 19:29:47.143567+00	2026-05-22 19:29:56.027484+00
999e73d2-5e40-4ead-b47e-b057d7e53ac6	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:751260149 1 udp 2122194687 172.29.128.1 57402 typ host generation 0 ufrag mQ+v network-id 5", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.384712+00	2026-05-22 19:29:56.027484+00
ae4fe80b-91ef-4877-bbb5-0f2eb61521b4	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:4258704087 1 udp 2122260223 172.22.80.1 57401 typ host generation 0 ufrag mQ+v network-id 1", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.153307+00	2026-05-22 19:29:56.027484+00
b6abfe9f-560d-41f4-bab7-1b2420903b9a	dad172c8-edeb-4354-bab8-ec026f545014	134eabbc-7a90-4dd3-b652-16f243b9ef5b	70e267f7-da33-4956-a164-e1c3eae128e8	ice_candidate	{"candidate": "candidate:3700103989 1 tcp 1518086399 2400:adca:124:4200:b17c:a25:ee82:a330 9 typ host tcptype active generation 0 ufrag mQ+v network-id 4 network-cost 10", "sdpMid": "0", "sdpMLineIndex": 0, "usernameFragment": "mQ+v"}	2026-05-22 19:29:47.705523+00	2026-05-22 19:29:56.027484+00
\.


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversation_participants (id, conversation_id, user_id, role, last_read_at, is_muted, joined_at, left_at) FROM stdin;
8b9d9abe-126d-4e34-84a2-4b39a9b7997b	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	134eabbc-7a90-4dd3-b652-16f243b9ef5b	owner	2026-05-22 19:29:40.734057+00	f	2026-05-22 18:06:37.572945+00	\N
540c6093-f8b3-47b3-b152-4689161e2f74	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	70e267f7-da33-4956-a164-e1c3eae128e8	member	2026-05-23 16:18:31.059962+00	f	2026-05-22 18:06:37.57295+00	\N
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, type, title, created_by_id, related_entity_type, related_entity_id, is_archived, created_at, updated_at, who_can_send_messages, who_can_edit_group_info, who_can_add_members) FROM stdin;
396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	direct	\N	134eabbc-7a90-4dd3-b652-16f243b9ef5b	\N	\N	f	2026-05-22 18:06:37.569306+00	2026-05-22 18:07:10.23571+00	all_members	admins_only	admins_only
\.


--
-- Data for Name: daily_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.daily_stats (id, user_id, date, total_hours, is_late_login, is_early_logout, is_overtime, is_absent, leave_type, is_wfh, primary_session_id, created_at, updated_at) FROM stdin;
5bc48834-986d-4f37-964b-644865897fbf	134eabbc-7a90-4dd3-b652-16f243b9ef5b	2026-05-19	92.8411111111111	f	f	f	f	\N	f	5bafab71-467a-47bc-9145-f9eb7544cf5e	2026-05-22 18:10:05.994431+00	2026-05-22 18:10:05.994436+00
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, admin_id, created_at, updated_at, description, is_active) FROM stdin;
8d607101-a6e6-4196-bf8a-1af0303186af	AI Automation	\N	2026-05-18 20:38:01.516397+00	2026-05-18 20:38:01.516405+00	N8N, Aitable, Zapier, Make.com	t
550e8400-e29b-41d4-a716-446655440001	Engineering	\N	2026-05-18 21:08:21.745535+00	2026-05-18 21:08:21.745539+00	Software Development & Infrastructure	t
550e8400-e29b-41d4-a716-446655440002	Human Resources	\N	2026-05-18 21:08:21.745542+00	2026-05-18 21:08:21.745542+00	HR Operations & Management	t
550e8400-e29b-41d4-a716-446655440003	Sales	\N	2026-05-18 21:08:21.745543+00	2026-05-18 21:08:21.745544+00	Sales & Business Development	t
550e8400-e29b-41d4-a716-446655440004	Marketing	\N	2026-05-18 21:08:21.745544+00	2026-05-18 21:08:21.745545+00	Marketing & Communications	t
550e8400-e29b-41d4-a716-446655440005	Finance	\N	2026-05-18 21:08:21.745546+00	2026-05-18 21:08:21.745546+00	Finance & Accounting	t
\.


--
-- Data for Name: eod_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eod_reports (id, user_id, report_date, login_time, logout_time, total_hours, tasks_worked_on, completed_tasks, pending_tasks, blocked_tasks, duties_performed, productivity_score, status, manager_comments, highlights_summary, created_at, updated_at) FROM stdin;
e50b9594-bcc0-4f09-b39f-7f2be1b4f6f7	fc26edc5-30cd-4273-9383-52ba142d04dd	2026-05-07	2026-05-07 13:27:30.615523+00	\N	0	0	0	0	0	0	0	Generated	\N	office	2026-05-07 13:29:59.842739+00	2026-05-07 13:29:59.842762+00
\.


--
-- Data for Name: eod_revisions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.eod_revisions (id, eod_report_id, status, manager_comments, snapshot_data, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: goals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.goals (id, user_id, title, description, target_metric, target_value, current_value, deadline, status, created_at, updated_at) FROM stdin;
0645a011-67ba-428b-9be1-34435accd4de	44a8944f-d5ef-470d-a8d7-712a61a347df	complete react course	\N	10 modules	4	0	2026-05-15	in_progress	2026-05-07 19:12:42.885583+00	2026-05-07 19:12:42.885587+00
f50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	Complete API Documentation	Complete API Documentation seeded goal	pages	50	35	2026-07-18	in_progress	2026-05-18 21:09:31.51807+00	2026-05-18 21:09:31.518077+00
f50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440004	Reduce API Response Time	Reduce API Response Time seeded goal	milliseconds	200	250	2026-07-18	in_progress	2026-05-18 21:09:31.518079+00	2026-05-18 21:09:31.51808+00
f50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440006	Increase Sales by 20%	Increase Sales by 20% seeded goal	percent	20	15	2026-07-18	in_progress	2026-05-18 21:09:31.518082+00	2026-05-18 21:09:31.518082+00
f50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	Launch 5 Marketing Campaigns	Launch 5 Marketing Campaigns seeded goal	campaigns	5	3	2026-07-18	in_progress	2026-05-18 21:09:31.518084+00	2026-05-18 21:09:31.518085+00
f50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440008	Complete Financial Audit	Complete Financial Audit seeded goal	percent	100	100	2026-07-18	achieved	2026-05-18 21:09:31.518086+00	2026-05-18 21:09:31.518087+00
f50e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440010	Learn Advanced TypeScript	Learn Advanced TypeScript seeded goal	hours	40	25	2026-07-18	in_progress	2026-05-18 21:09:31.518088+00	2026-05-18 21:09:31.518089+00
f50e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440003	Code Review 100 PRs	Code Review 100 PRs seeded goal	reviews	100	75	2026-07-18	in_progress	2026-05-18 21:09:31.51809+00	2026-05-18 21:09:31.518091+00
f50e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440004	Fix 50 Bugs	Fix 50 Bugs seeded goal	bugs	50	42	2026-07-18	in_progress	2026-05-18 21:09:31.518092+00	2026-05-18 21:09:31.518093+00
f50e8400-e29b-41d4-a716-446655440009	750e8400-e29b-41d4-a716-446655440006	Achieve 95% Customer Satisfaction	Achieve 95% Customer Satisfaction seeded goal	percent	95	92	2026-07-18	in_progress	2026-05-18 21:09:31.518094+00	2026-05-18 21:09:31.518095+00
f50e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440007	Grow Social Media Following	Grow Social Media Following seeded goal	followers	10000	7500	2026-07-18	in_progress	2026-05-18 21:09:31.518096+00	2026-05-18 21:09:31.518097+00
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, name, holiday_date, created_at, updated_at, description, is_active) FROM stdin;
682f2735-8eb7-4a8c-97b6-46a896ff53d8	Eid holiday's	2026-05-27	2026-05-07 16:40:15.417919+00	2026-05-07 16:40:15.417922+00	\N	t
850e8400-e29b-41d4-a716-446655440001	New Year	2024-01-01	2026-05-18 21:08:37.319796+00	2026-05-18 21:08:37.319803+00	New Year's Day	t
850e8400-e29b-41d4-a716-446655440002	Independence Day	2024-08-15	2026-05-18 21:08:37.319806+00	2026-05-18 21:08:37.319807+00	National Independence Day	t
850e8400-e29b-41d4-a716-446655440003	Christmas	2024-12-25	2026-05-18 21:08:37.319808+00	2026-05-18 21:08:37.319809+00	Christmas Day	t
850e8400-e29b-41d4-a716-446655440004	Diwali	2024-11-01	2026-05-18 21:08:37.31981+00	2026-05-18 21:08:37.319811+00	Festival of Lights	t
850e8400-e29b-41d4-a716-446655440005	Holi	2024-03-25	2026-05-18 21:08:37.319812+00	2026-05-18 21:08:37.319813+00	Festival of Colors	t
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leave_requests (id, user_id, start_date, end_date, leave_type, status, is_half_day, half_day_period, reason, current_approver_id, escalated_from_id, escalated_at, escalation_count, manager_comment, created_at, updated_at) FROM stdin;
25e17c1e-982e-4fb4-8b7a-f7ed6cd2adee	44a8944f-d5ef-470d-a8d7-712a61a347df	2026-05-08	2026-05-10	wfh	pending	f	\N	please dedo	70e267f7-da33-4956-a164-e1c3eae128e8	\N	\N	0	\N	2026-05-07 19:10:22.46123+00	2026-05-07 19:10:22.461234+00
a50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	2026-05-24	2026-05-26	casual	pending	f	\N	Personal work	750e8400-e29b-41d4-a716-446655440002	\N	\N	0	\N	2026-05-18 21:08:55.767185+00	2026-05-18 21:08:55.76719+00
a50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440004	2026-05-29	2026-05-29	sick	approved	t	first_half	Medical appointment	\N	\N	\N	0	Approved	2026-05-18 21:08:55.767191+00	2026-05-18 21:08:55.767192+00
a50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440006	2026-06-03	2026-06-04	annual	pending	f	\N	Vacation	750e8400-e29b-41d4-a716-446655440005	\N	\N	0	\N	2026-05-18 21:08:55.767193+00	2026-05-18 21:08:55.767194+00
a50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	2026-05-27	2026-05-27	half_day	approved	t	second_half	Doctor appointment	\N	\N	\N	0	Approved	2026-05-18 21:08:55.767195+00	2026-05-18 21:08:55.767195+00
a50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440008	2026-06-08	2026-06-10	casual	rejected	f	\N	Personal reasons	\N	\N	\N	0	Not approved at this time	2026-05-18 21:08:55.767196+00	2026-05-18 21:08:55.767196+00
a50e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440010	2026-05-31	2026-06-01	sick	pending	f	\N	Fever	750e8400-e29b-41d4-a716-446655440002	\N	\N	0	\N	2026-05-18 21:08:55.767197+00	2026-05-18 21:08:55.767198+00
a50e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440003	2026-06-13	2026-06-16	annual	escalated	f	\N	Summer vacation	750e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440002	2026-05-16 21:08:46.540476+00	1	\N	2026-05-18 21:08:55.767198+00	2026-05-18 21:08:55.767199+00
a50e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440004	2026-05-25	2026-05-25	wfh	approved	t	first_half	Work from home	\N	\N	\N	0	Approved	2026-05-18 21:08:55.7672+00	2026-05-18 21:08:55.7672+00
a50e8400-e29b-41d4-a716-446655440009	750e8400-e29b-41d4-a716-446655440006	2026-06-06	2026-06-07	casual	needs_clarification	f	\N	Personal	750e8400-e29b-41d4-a716-446655440005	\N	\N	0	Please provide more details	2026-05-18 21:08:55.767201+00	2026-05-18 21:08:55.767202+00
a50e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440007	2026-06-18	2026-06-20	annual	pending	f	\N	Vacation	750e8400-e29b-41d4-a716-446655440001	\N	\N	0	\N	2026-05-18 21:08:55.767202+00	2026-05-18 21:08:55.767203+00
\.


--
-- Data for Name: manager_daily_summaries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manager_daily_summaries (id, manager_id, summary_date, team_members_active, missing_checkouts, pending_approvals, tasks_completed, overdue_tasks, blocked_tasks, eod_pending_approvals, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: meeting_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meeting_participants (id, meeting_id, user_id, response_status, notification_sent_at, reminder_sent_at, created_at, updated_at) FROM stdin;
15e63245-ee2a-4e5f-abf1-61b63767647d	d343b92e-ce91-4b2c-ba10-7cb951fc850b	70e267f7-da33-4956-a164-e1c3eae128e8	accepted	2026-05-22 18:11:13.847611+00	\N	2026-05-22 18:11:13.829477+00	2026-05-22 18:11:13.829477+00
62c87d78-af20-4c62-8a23-54062c9f06af	d343b92e-ce91-4b2c-ba10-7cb951fc850b	134eabbc-7a90-4dd3-b652-16f243b9ef5b	accepted	\N	\N	2026-05-22 18:11:13.829477+00	2026-05-22 18:11:46.091806+00
\.


--
-- Data for Name: meetings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meetings (id, title, description, organizer_id, start_at, end_at, meeting_link, location, status, created_at, updated_at) FROM stdin;
d343b92e-ce91-4b2c-ba10-7cb951fc850b	n8n prject	summarize	70e267f7-da33-4956-a164-e1c3eae128e8	2026-05-22 18:12:00+00	2026-05-22 18:28:00+00	\N	\N	scheduled	2026-05-22 18:11:13.829477+00	2026-05-22 18:11:13.829477+00
\.


--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_attachments (id, message_id, conversation_id, uploader_id, file_name, original_file_name, mime_type, file_size, storage_path, storage_name, created_at) FROM stdin;
\.


--
-- Data for Name: message_mentions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_mentions (id, message_id, mentioned_user_id) FROM stdin;
\.


--
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_reactions (id, message_id, user_id, emoji, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, sender_id, body, message_type, parent_message_id, is_edited, is_deleted, deleted_at, created_at, updated_at) FROM stdin;
c9d1f60a-bf1f-416f-befd-f735b7446e23	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	134eabbc-7a90-4dd3-b652-16f243b9ef5b	hi sir how are you	text	\N	f	f	\N	2026-05-22 18:06:46.288834+00	2026-05-22 18:06:46.28884+00
04929337-5484-4f96-807d-4a32fce1a34d	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	70e267f7-da33-4956-a164-e1c3eae128e8	what about you	text	\N	f	t	2026-05-22 18:08:45.878125+00	2026-05-22 18:07:10.227201+00	2026-05-22 18:08:45.879118+00
685d7f81-f958-480d-8983-a1f3ac159511	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	70e267f7-da33-4956-a164-e1c3eae128e8	Voice call ended	system	\N	f	f	\N	2026-05-22 19:29:17.543674+00	2026-05-22 19:29:17.543674+00
a4fc5bde-d7b8-441a-9e56-931b50e40b18	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	70e267f7-da33-4956-a164-e1c3eae128e8	Voice call ended	system	\N	f	f	\N	2026-05-22 19:29:34.225747+00	2026-05-22 19:29:34.225748+00
776964c1-a912-45fc-8176-2cf84383eeda	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	134eabbc-7a90-4dd3-b652-16f243b9ef5b	Voice call ended	system	\N	f	f	\N	2026-05-22 19:31:03.270378+00	2026-05-22 19:31:03.270378+00
\.


--
-- Data for Name: monthly_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_reports (id, report_month, entity_type, entity_id, total_hours, tasks_completed, late_logins, early_logouts, productivity_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, notification_type, related_entity_type, related_entity_id, is_read, created_at, read_at) FROM stdin;
1bf19299-6034-4567-8947-dc0252790956	70e267f7-da33-4956-a164-e1c3eae128e8	New message from Zain Ul Abideen	hi sir how are you	message	conversation	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	f	2026-05-22 18:06:46.306418+00	\N
abe41be8-4569-4d11-9d01-2de8bbc5f994	134eabbc-7a90-4dd3-b652-16f243b9ef5b	New message from Zia Ul Din	what about you	message	conversation	396aa3ec-bfa1-45f6-b456-e0b74f96c0a2	f	2026-05-22 18:07:10.246891+00	\N
e2f09b64-fcd6-46e4-97eb-ab7bb3fe018e	134eabbc-7a90-4dd3-b652-16f243b9ef5b	New Meeting Invitation	Zia Ul Din has invited you to 'n8n prject' on 2026-05-22 18:12.	meeting_invite	meeting	d343b92e-ce91-4b2c-ba10-7cb951fc850b	t	2026-05-22 18:11:13.829477+00	2026-05-22 18:11:32.393794+00
1b3d7867-45be-455b-b63a-3c8dcc46853e	134eabbc-7a90-4dd3-b652-16f243b9ef5b	Incoming Call	Zia Ul Din is calling you (voice).	call_incoming	user	70e267f7-da33-4956-a164-e1c3eae128e8	t	2026-05-22 19:28:25.688347+00	2026-05-22 19:28:57.011195+00
12675daf-7dff-42fc-a84c-4f5e06bc25ca	134eabbc-7a90-4dd3-b652-16f243b9ef5b	Incoming Call	Zia Ul Din is calling you (voice).	call_incoming	user	70e267f7-da33-4956-a164-e1c3eae128e8	t	2026-05-22 19:29:21.935065+00	2026-05-22 19:29:30.693223+00
3ce0c735-9354-48b3-b1d4-3cd610a7bc88	70e267f7-da33-4956-a164-e1c3eae128e8	Incoming Call	Zain Ul Abideen is calling you (voice).	call_incoming	user	134eabbc-7a90-4dd3-b652-16f243b9ef5b	t	2026-05-22 19:29:46.34031+00	2026-05-22 19:29:56.39176+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token_hash, is_used, expires_at, created_at) FROM stdin;
c45e459f-65f7-4f5c-8a44-2415700ab043	44a8944f-d5ef-470d-a8d7-712a61a347df	af758d945d770aec9cd1bd4a9c2891afb31b4f6d7f6853c87097eb579ece688e	f	2026-05-07 21:55:35.125+00	2026-05-07 19:55:35.113764+00
3ac666ad-3a94-4737-83e0-d61c3e667541	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	340babcf5589bb826c4a3a6e92a6eeb03e1f9c280c9e5f2f3b50b76cd20fe132	t	2026-05-18 19:08:15.871002+00	2026-05-18 17:08:15.861869+00
f3382120-dedf-4f4f-90bb-0c1e54a2d3dc	70e267f7-da33-4956-a164-e1c3eae128e8	2237f1d7b2ea8eb1c7e4049ecc34eff158f5800ab4ec3e84822b2595437089cc	t	2026-05-18 21:17:03.263341+00	2026-05-18 19:17:03.256261+00
f63d2bcb-bba5-475b-ba3e-cdc2756ad059	70e267f7-da33-4956-a164-e1c3eae128e8	d1fe3d68f8aa3bd2f04c0512100ce51d3e081881008db4924c99f08073c8cef0	t	2026-05-18 21:20:06.583556+00	2026-05-18 19:20:06.580322+00
4757dfcd-7918-4902-b06b-c8f185cd4fac	134eabbc-7a90-4dd3-b652-16f243b9ef5b	e04ced4baf24835ac990c0b95b850d4762adc2a9a87ef51ea485292f042d2a3e	t	2026-05-18 21:18:07.930361+00	2026-05-18 19:18:07.926133+00
ef09fecc-4dc3-495f-9886-88d6e954ed85	134eabbc-7a90-4dd3-b652-16f243b9ef5b	4f0a5ad1eb0eac00374e42cc3af003ab0747d601e880718dcc208e88567490b5	t	2026-05-18 21:38:13.50449+00	2026-05-18 19:38:13.499759+00
d0d79d14-0f3b-41f9-bb2a-440b507d38d8	70e267f7-da33-4956-a164-e1c3eae128e8	22379b074ebd762364515a666165d2c1bd37ca6bb85bf31c2bd5a390ed7c5a96	t	2026-05-18 21:20:37.767818+00	2026-05-18 19:20:37.76478+00
b59b0a5b-df08-4f01-9055-9d5057af0683	70e267f7-da33-4956-a164-e1c3eae128e8	3c0b6fdbea54737b9813b1a7ad07c42fcdbcb9fe0711edbf266692342fcec014	t	2026-05-19 17:02:37.036221+00	2026-05-19 15:02:37.026805+00
\.


--
-- Data for Name: performance_metrics_daily; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.performance_metrics_daily (id, user_id, metric_date, total_session_minutes, productive_minutes, output_score, efficiency_score, utilization_score, consistency_score, composite_score, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, key, description) FROM stdin;
d770dd3c-3531-4758-bb4a-14efa62f8cc6	users.view_all	View all users in the org
a0c8e6b4-1ed5-4323-9fb0-1256dfc4f741	users.create	Create new user accounts
a8b9da4e-157a-48f1-a013-327742e74eb0	users.edit	Edit user profiles and settings
952588d1-34c3-458d-a2ef-84c6e1c1c58b	users.deactivate	Deactivate user accounts
649133d6-7c4d-4a67-b254-72725c0e1315	users.suspend	Suspend user accounts
eb89b62d-088e-489b-9de2-af0f09d2e4e1	users.manage_roles	Assign and change user roles
b40c3b4a-1ab4-4c4a-ae62-8372e8d4de81	attendance.view_own	View own attendance records
bc0be0c8-2159-4e43-a439-02b6e1f35443	attendance.view_team	View team attendance records
42e38e8f-03f2-4411-83c1-c789efcf1702	attendance.view_org	View org-wide attendance
17681bd9-289b-49ff-9d08-fa1fc4785991	attendance.approve_correction	Approve attendance corrections
b9b2a297-c9c5-4a3d-8849-1ecf2c760ef8	leave.apply	Apply for leave
07b48caa-2cae-4860-98f4-de86265413df	leave.approve	Approve leave requests
308bc73e-6ad7-4b19-935f-45ddbec2d8d1	leave.view_team	View team leave requests
04b1ec36-02bb-4664-9fb3-5b259f2d84aa	leave.view_org	View all org leave requests
d9fb2d0a-8ec7-4c45-a051-b2b456b334ce	projects.create	Create new projects
921c890b-2a26-4a8f-a5a4-8caef5a0e315	projects.approve	Approve project proposals
b0302513-7df9-4caa-bbf1-a89176512f0d	projects.view_all	View all projects
557f6ed2-9b63-4603-a240-b34552a82f60	tasks.create_own	Create tasks for self
be95fffb-92a4-4bc0-9513-29454d7066ca	tasks.create_team	Create/assign tasks for team members
837fcd15-bc0b-469f-8b91-f948a6d576a2	tasks.set_priority	Set task priority levels
32751fd9-1da2-4091-9c7c-7ce4d5d3bcd1	tasks.set_complexity	Set task complexity
1a793031-4f8b-4a22-a953-5056e5e110c0	tasks.view_team	View team tasks
6c2a042c-bdd8-4bcf-b826-edfc65384868	eod.submit	Submit End of Day reports
d9a7a6e9-6310-4412-a5b0-b25f76e5c1ae	eod.review	Review EOD submissions
35c7f2d7-71e5-47dd-8c9e-3cdfcf0401b9	eod.approve	Approve EOD reports
e25cc138-43b9-43c5-8df0-3af322d8d15b	reports.view_own	View own performance reports
5d606e6a-e531-4fe7-9ad1-a23a3de5b83f	reports.view_team	View team reports
07fd2bd0-c37f-4e76-85f9-52f76dce5103	reports.view_org	View org-wide reports
070a382c-26c2-4003-83df-b3742e39e7f1	announcements.create	Create company announcements
6ab8b523-fdb5-4932-a2e9-57853a497a1d	holidays.manage	Manage holiday calendar
86cc9c66-7556-434b-996d-0c18ce34d8ca	shifts.manage	Manage work shifts
6a21ee1e-d2cb-4577-8868-70a6de295574	departments.manage	Manage departments
12de8f34-9860-4f13-bac4-407e2d8df7f1	audit.view	View audit trail logs
87a0cd41-6ebd-4682-afdc-eb4b8c694b92	permissions.manage	Manage role permissions
a1f4cada-093d-4201-836f-65dae6110316	analytics.view_team	View team analytics
3598bbc6-582c-43a4-ac14-167703c3cfd5	analytics.view_org	View org analytics
\.


--
-- Data for Name: personal_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.personal_notes (id, user_id, note_date, content, created_at, updated_at) FROM stdin;
a9966b3f-ec3f-4621-9929-baad12cf5c80	44a8944f-d5ef-470d-a8d7-712a61a347df	2026-05-07	Today I learned stuff	2026-05-07 19:14:55.401604+00	2026-05-07 19:14:55.401608+00
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, title, description, owner_id, manager_id, priority, approval_status, project_status, due_date, approved_at, rejected_reason, created_at, updated_at) FROM stdin;
8dae8182-951d-4279-8d82-82d9d5785412	internal dashboard	to make an internal dashboard	44a8944f-d5ef-470d-a8d7-712a61a347df	70e267f7-da33-4956-a164-e1c3eae128e8	medium	approved	approved	2026-05-15	2026-05-09 19:09:15.220786+00	\N	2026-05-07 19:07:32.816337+00	2026-05-09 19:09:15.22847+00
c50e8400-e29b-41d4-a716-446655440001	Mobile App Redesign	Complete redesign of mobile application UI/UX	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	high	approved	active	2026-07-03	2026-05-13 21:08:50.331931+00	\N	2026-05-18 21:08:57.19226+00	2026-05-18 21:08:57.192267+00
c50e8400-e29b-41d4-a716-446655440002	API Performance Optimization	Optimize API response times and reduce latency	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	critical	approved	active	2026-06-18	2026-05-13 21:08:50.642935+00	\N	2026-05-18 21:08:57.192269+00	2026-05-18 21:08:57.19227+00
c50e8400-e29b-41d4-a716-446655440003	Sales Dashboard Development	Build comprehensive sales analytics dashboard	750e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440005	high	pending	pending_approval	2026-07-18	\N	\N	2026-05-18 21:08:57.192271+00	2026-05-18 21:08:57.192272+00
c50e8400-e29b-41d4-a716-446655440004	Marketing Campaign Q3	Q3 marketing campaign planning and execution	750e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440001	medium	approved	active	2026-08-17	2026-05-13 21:08:51.509291+00	\N	2026-05-18 21:08:57.192273+00	2026-05-18 21:08:57.192274+00
c50e8400-e29b-41d4-a716-446655440005	Financial Audit System	Implement automated financial audit system	750e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440001	high	approved	completed	2026-05-14	2026-05-13 21:08:51.806067+00	\N	2026-05-18 21:08:57.192275+00	2026-05-18 21:08:57.192276+00
c50e8400-e29b-41d4-a716-446655440006	Database Migration	Migrate legacy database to new infrastructure	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	critical	approved	on_hold	2026-08-02	2026-05-13 21:08:53.021996+00	\N	2026-05-18 21:08:57.192277+00	2026-05-18 21:08:57.192278+00
c50e8400-e29b-41d4-a716-446655440007	Customer Portal Enhancement	Add new features to customer self-service portal	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	medium	rejected	rejected	2026-07-08	\N	Budget constraints - defer to next quarter	2026-05-18 21:08:57.192279+00	2026-05-18 21:08:57.19228+00
c50e8400-e29b-41d4-a716-446655440008	Security Audit & Compliance	Conduct comprehensive security audit	750e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440002	critical	pending	pending_approval	2026-06-28	\N	\N	2026-05-18 21:08:57.192281+00	2026-05-18 21:08:57.192282+00
c50e8400-e29b-41d4-a716-446655440009	Team Training Program	Develop and deliver team training program	750e8400-e29b-41d4-a716-446655440009	750e8400-e29b-41d4-a716-446655440001	medium	approved	active	2026-07-18	2026-05-13 21:08:54.359591+00	\N	2026-05-18 21:08:57.192283+00	2026-05-18 21:08:57.192284+00
c50e8400-e29b-41d4-a716-446655440010	Infrastructure Upgrade	Upgrade server infrastructure and networking	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	high	approved	draft	2026-09-16	2026-05-13 21:08:54.676054+00	\N	2026-05-18 21:08:57.192285+00	2026-05-18 21:08:57.192286+00
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role, permission_key) FROM stdin;
ca3f56c5-86b5-4825-b284-1b8075d95b3e	admin	users.view_all
611a49ad-ff70-4042-a116-2cdc25d15806	admin	users.create
746c7c93-b0fc-43d5-940f-5872768d6d67	admin	users.edit
934e96f2-27bf-45d4-9b12-c4cc2b4ae059	admin	users.deactivate
f639dff2-bb56-4b89-8a5d-178e4ba13e34	admin	users.suspend
0bd01f5a-acf5-48d3-8ab1-9ac313c72ec7	admin	users.manage_roles
7a483507-ac2d-4c4a-bfe2-921bd54e20dc	admin	attendance.view_own
821d63c1-5af2-4d27-a801-bd82cd2290f7	admin	attendance.view_team
ea02d58c-a454-4f39-bb4c-277f3940f0ca	admin	attendance.view_org
26f0b415-e14c-4568-844e-101a71fb121a	admin	attendance.approve_correction
e8e6b0e2-3cf0-417e-a760-c2cef6c61af2	admin	leave.apply
ae9a51dd-8617-4074-8c7d-23aa619cebf6	admin	leave.approve
ffc98e23-8eda-466e-b35a-e8dc2cfab43f	admin	leave.view_team
744e039f-c088-4a67-809c-bc5f9f267ac7	admin	leave.view_org
6c64fcd1-11c1-464d-b617-e2aba8c9420d	admin	projects.create
76e87cf8-78f4-4ed1-88fa-7fbd809682df	admin	projects.approve
262c42e9-bf2c-4c65-96d7-2f17219fd9ed	admin	projects.view_all
d5b8a133-6640-43b6-ae8d-5a019a44215b	admin	tasks.create_own
c05cf2ca-5b13-4b2f-bd38-00855d2ddee4	admin	tasks.create_team
c2319828-0c0b-4089-8962-51c4f22a3b4a	admin	tasks.set_priority
ec4f8e9b-8c79-44f8-b47d-a4fcc728ded2	admin	tasks.set_complexity
33a1f0c9-5bcb-42c6-862d-8ca0816af148	admin	tasks.view_team
6d14dba4-19ed-44c3-8bc4-a346afc42696	admin	eod.submit
12eed81c-0b75-44b5-9968-1ce7ca07455d	admin	eod.review
96b53be0-4262-4f7e-8259-306722355381	admin	eod.approve
85dc4aa5-5035-42c0-a1ac-1071486f9a07	admin	reports.view_own
46deca66-5248-4a6b-9e8d-3d349674465b	admin	reports.view_team
be8616de-c304-49d9-8389-5143c7bfee7d	admin	reports.view_org
580ca94b-23c6-48bf-9429-035a79b1085e	admin	announcements.create
abf63bcf-05f0-42bf-82ce-7a5228506919	admin	holidays.manage
a9e71ecb-7d71-41e6-9129-6c7940d133ce	admin	shifts.manage
a0c6092a-b8e8-4e36-998f-7180bf58f8cf	admin	departments.manage
b0626313-2558-45fb-8e40-e1d5957a70a0	admin	audit.view
39df5770-d640-4e24-abfb-b2b68f5866f7	admin	permissions.manage
759e9f96-f276-4eb8-8fee-46d5c30d7c27	admin	analytics.view_team
3dbdbac8-d90b-481a-85d2-1fcc11d153c7	admin	analytics.view_org
12c052cf-8aef-490e-8047-ec0dd246f0f1	hr_operations	users.view_all
d320cc05-988c-4a37-8949-dc162f571824	hr_operations	users.create
03708005-8e3d-4c2f-9714-d5a64fdd8da3	hr_operations	users.edit
55864542-fd77-47c7-a869-8da886653257	hr_operations	users.deactivate
350e3e5b-6552-4226-8102-e94f98a5b6a4	hr_operations	attendance.view_own
bda79403-fb6e-41a2-b854-8cc7d4f91723	hr_operations	attendance.view_team
b05ed7ca-e31f-44d4-a547-1aa2ad7030e9	hr_operations	attendance.view_org
f8eecf9c-c290-4876-a40b-869df53d994a	hr_operations	attendance.approve_correction
edf26c25-2b30-4ebb-805d-01a9808026ad	hr_operations	leave.apply
13e18841-3b13-4476-8902-ba0e19a40067	hr_operations	leave.approve
ec6c137c-96ed-494f-a7a3-c22e1f17408d	hr_operations	leave.view_team
758556e3-95e7-486e-95b2-2c46f1aed4b1	hr_operations	leave.view_org
97be1a75-cdd0-4982-b118-3ac5352b3b30	hr_operations	reports.view_own
170b1f52-47c1-4690-a0bd-8bffc519faa8	hr_operations	reports.view_team
acdcfc45-26e8-4441-9641-a137f7ba647d	hr_operations	reports.view_org
25d0d19e-ed3c-42e9-9774-3b620714e1f9	hr_operations	announcements.create
89957718-d9cf-434c-b17f-6642e6050002	hr_operations	holidays.manage
f2145dde-2560-4567-b44d-96c8c8da599a	hr_operations	shifts.manage
5dac75f3-4692-40fd-b7a0-845412108cb0	hr_operations	departments.manage
c1ac4148-93bf-4bf4-8bf6-302ea39cfda4	hr_operations	eod.submit
14985e16-9441-450d-864e-02395ca4bd6e	hr_operations	analytics.view_team
a1cc9057-0212-4743-9409-09e21108fbf6	hr_operations	analytics.view_org
901375c2-2661-49a2-9bd7-937231d4a5ae	manager	users.create
e8f5ab9c-58d6-4771-82c8-c136742223ac	manager	users.edit
a588d8e7-d6e2-4e62-bbd0-7a420cfa6d04	manager	attendance.view_own
3355f51d-d554-4411-b162-1fe59c12dfd6	manager	attendance.view_team
4deb298b-9c17-4fc4-ab24-be54bc9a5b38	manager	attendance.approve_correction
67e27fd7-07ac-48f8-a9e1-906ab1a2ec11	manager	leave.apply
f6ad32ba-a51a-4f77-9eb8-64ddc38c8576	manager	leave.approve
6b79fe00-9066-46c1-8beb-ca27eced9636	manager	leave.view_team
361b69a5-e144-4164-b4e4-ac6bf459d347	manager	projects.create
8ec429e2-2b63-4e94-83b5-be7811f1807a	manager	projects.approve
0f9b7cbb-bda2-456b-b45e-5309e3c34123	manager	tasks.create_own
257f2d76-d4a7-4ecc-b921-aa2b3749fc5e	manager	tasks.create_team
76a966a1-e648-44a8-b5d9-e753b8f310ad	manager	tasks.set_priority
1da1d7d5-af3a-46b0-966c-3e2bde9718f6	manager	tasks.set_complexity
c11fc1d8-fded-46e2-ac2e-640ab6e6a568	manager	tasks.view_team
2f6c5e95-f797-446a-a9de-170fa5f0a117	manager	eod.submit
64250790-ac32-4634-9df4-b8deac03a977	manager	eod.review
3f678eed-4a61-4e17-b92d-3e524be376b2	manager	eod.approve
099d7dda-1edd-419b-8609-54bd50f3f314	manager	reports.view_own
4272f16c-dbfb-4579-91bb-68ece2791f3c	manager	reports.view_team
ba3de1ca-0ba7-4132-ad29-8cfc586cb6dd	manager	analytics.view_team
2d4b241b-ce26-43cf-8228-7325f184fd4e	team_lead	attendance.view_own
6af8cacd-0047-49d4-afb5-7b2fb5f1e70e	team_lead	attendance.view_team
9ef46eb1-35fb-4963-819f-730ee9c9275c	team_lead	leave.apply
db052e79-c7c7-4360-ac0e-5f17fb709ac8	team_lead	leave.view_team
f658f19b-ebad-4bf9-a9ab-961df5d48c2a	team_lead	projects.create
c1113b12-7e90-416f-9b38-67dbe83720fc	team_lead	tasks.create_own
03730ef3-9ef9-4bb2-a567-f9f4a85c791d	team_lead	tasks.create_team
4e289f68-120a-46fd-8399-746aca7170ef	team_lead	tasks.set_priority
ddb4fbb1-200e-441c-af9f-56c9060088f9	team_lead	tasks.view_team
3c1e1739-6315-4592-8cdc-5b2ae8a9a2b1	team_lead	eod.submit
b0b60ebb-bfa6-41ed-84ff-3fa13cba6c97	team_lead	eod.review
5d0fb2ce-8553-4ef6-9a90-e5f432aa735a	team_lead	reports.view_own
8d5792bc-65a5-4c6a-8e82-3fa54452bdbc	team_lead	reports.view_team
625c6aed-f7cb-4154-bb91-b8f7cb609314	team_lead	analytics.view_team
8d874d1e-f391-4266-bfab-7d4f16cc213c	employee	attendance.view_own
94f3f5b9-2538-4ae6-b3b6-23db205d1247	employee	leave.apply
c619dac8-7f3d-48d5-81d1-031075f0c890	employee	projects.create
bde4313e-8cb4-4376-a30b-33fa9e1c5fb5	employee	tasks.create_own
f8716d67-1d12-4825-83f5-81e2497254d7	employee	eod.submit
6b54cbda-8f3c-4192-bf13-fbf0176e62dd	employee	reports.view_own
7d4c1c61-a983-4725-a1dc-283ef716af00	intern	attendance.view_own
7389250d-bdb1-4317-b895-a18cd1c2a6aa	intern	leave.apply
e5d2b25b-6d33-48c3-86ba-80d932972172	intern	tasks.create_own
fdcca925-089e-4dbb-bdc2-9f3b8752a2bb	intern	eod.submit
97ea7694-4f94-4cfa-ab3c-be449c0d3ca3	intern	reports.view_own
9aaf228f-5faf-4779-a720-0ef398be12c0	junior_employee	attendance.view_own
3bd6f28c-ea07-447b-b3b6-be37bbc4966d	junior_employee	leave.apply
67e432cd-13de-4880-b24b-c3e97c19e3bb	junior_employee	tasks.create_own
521fe52d-714c-4c44-8f77-7e503ac5d8aa	junior_employee	eod.submit
6c016031-d7e0-43de-a01f-5be2f4722b65	junior_employee	reports.view_own
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, name, start_time, end_time, grace_period_minutes, working_days, is_active, created_at, updated_at, description, timezone) FROM stdin;
650e8400-e29b-41d4-a716-446655440001	Morning Shift	09:00:00	17:00:00	15	1,2,3,4,5	t	2026-05-18 21:08:22.06033+00	2026-05-18 21:08:22.060336+00	\N	Asia/Karachi
650e8400-e29b-41d4-a716-446655440002	Evening Shift	14:00:00	22:00:00	15	1,2,3,4,5	t	2026-05-18 21:08:22.060338+00	2026-05-18 21:08:22.06034+00	\N	Asia/Karachi
650e8400-e29b-41d4-a716-446655440003	Night Shift	22:00:00	06:00:00	15	1,2,3,4,5	t	2026-05-18 21:08:22.060341+00	2026-05-18 21:08:22.060342+00	\N	Asia/Karachi
594ea5a7-9263-4903-b593-a63d79ebbb05	Main Shift	17:00:00	02:00:00	15	1,2,3,4,5,6	t	2026-05-22 17:48:22.066881+00	2026-05-22 17:48:22.066886+00	\N	Asia/Karachi
\.


--
-- Data for Name: support_ticket_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_ticket_comments (id, ticket_id, author_id, message, is_internal, created_at) FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, ticket_number, created_by_id, assigned_to_id, subject, category, priority, description, status, created_at, updated_at, closed_at) FROM stdin;
\.


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_comments (id, task_id, user_id, content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: task_timer_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.task_timer_sessions (id, task_id, user_id, status, started_at, last_resumed_at, paused_at, accumulated_seconds, pause_reason, created_at, updated_at) FROM stdin;
64b8563c-c9b7-445b-a867-5a6264569d89	d50e8400-e29b-41d4-a716-446655440019	134eabbc-7a90-4dd3-b652-16f243b9ef5b	completed	2026-05-18 21:20:04.05312+00	2026-05-18 21:20:41.28954+00	\N	11	\N	2026-05-18 21:20:04.05881+00	2026-05-18 21:20:50.726675+00
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (id, project_id, assigned_to, created_by, parent_id, title, description, complexity_level, expected_duration_minutes, actual_duration_minutes, priority, status, blocked_reason, due_date, completed_at, created_at, updated_at) FROM stdin;
d50e8400-e29b-41d4-a716-446655440001	c50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	\N	Design mockups	Design mockups seeded task	3	360	380	high	completed	\N	2026-05-25	2026-05-17 21:08:58.311671+00	2026-05-18 21:09:10.823497+00	2026-05-18 21:09:10.823501+00
d50e8400-e29b-41d4-a716-446655440002	c50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	\N	Frontend development	Frontend development seeded task	4	480	\N	high	in_progress	\N	2026-05-26	\N	2026-05-18 21:09:10.823503+00	2026-05-18 21:09:10.823504+00
d50e8400-e29b-41d4-a716-446655440003	c50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	\N	API integration	API integration seeded task	2	600	\N	high	created	\N	2026-05-27	\N	2026-05-18 21:09:10.823505+00	2026-05-18 21:09:10.823506+00
d50e8400-e29b-41d4-a716-446655440004	c50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440002	\N	Testing & QA	Testing & QA seeded task	3	720	\N	medium	created	\N	2026-05-28	\N	2026-05-18 21:09:10.823507+00	2026-05-18 21:09:10.823508+00
d50e8400-e29b-41d4-a716-446655440005	c50e8400-e29b-41d4-a716-446655440001	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	\N	Documentation	Documentation seeded task	4	240	\N	high	created	\N	2026-05-29	\N	2026-05-18 21:09:10.823509+00	2026-05-18 21:09:10.82351+00
d50e8400-e29b-41d4-a716-446655440006	c50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	\N	Profile API endpoints	Profile API endpoints seeded task	2	360	380	high	completed	\N	2026-05-30	2026-05-17 21:09:02.255481+00	2026-05-18 21:09:10.823511+00	2026-05-18 21:09:10.823512+00
d50e8400-e29b-41d4-a716-446655440007	c50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	\N	Implement caching	Implement caching seeded task	3	480	\N	high	in_progress	\N	2026-05-31	\N	2026-05-18 21:09:10.823513+00	2026-05-18 21:09:10.823514+00
d50e8400-e29b-41d4-a716-446655440008	c50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	\N	Database optimization	Database optimization seeded task	4	600	\N	medium	in_progress	\N	2026-06-01	\N	2026-05-18 21:09:10.823515+00	2026-05-18 21:09:10.823516+00
d50e8400-e29b-41d4-a716-446655440009	c50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440002	\N	Load testing	Load testing seeded task	2	720	\N	high	created	\N	2026-06-02	\N	2026-05-18 21:09:10.823517+00	2026-05-18 21:09:10.823518+00
d50e8400-e29b-41d4-a716-446655440010	c50e8400-e29b-41d4-a716-446655440002	750e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440002	\N	Performance report	Performance report seeded task	3	240	\N	high	created	\N	2026-06-03	\N	2026-05-18 21:09:10.823519+00	2026-05-18 21:09:10.82352+00
d50e8400-e29b-41d4-a716-446655440011	c50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440002	\N	Requirements gathering	Requirements gathering seeded task	4	360	380	high	completed	\N	2026-06-04	2026-05-17 21:09:04.924074+00	2026-05-18 21:09:10.823521+00	2026-05-18 21:09:10.823521+00
d50e8400-e29b-41d4-a716-446655440012	c50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440002	\N	Dashboard design	Dashboard design seeded task	2	480	\N	medium	in_progress	\N	2026-06-05	\N	2026-05-18 21:09:10.823522+00	2026-05-18 21:09:10.823523+00
d50e8400-e29b-41d4-a716-446655440013	c50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	\N	Backend API	Backend API seeded task	3	600	\N	high	created	\N	2026-06-06	\N	2026-05-18 21:09:10.823524+00	2026-05-18 21:09:10.823525+00
d50e8400-e29b-41d4-a716-446655440014	c50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440006	750e8400-e29b-41d4-a716-446655440002	\N	Frontend implementation	Frontend implementation seeded task	4	720	\N	high	created	\N	2026-06-07	\N	2026-05-18 21:09:10.823526+00	2026-05-18 21:09:10.823527+00
d50e8400-e29b-41d4-a716-446655440015	c50e8400-e29b-41d4-a716-446655440003	750e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440002	\N	Testing	Testing seeded task	2	240	\N	high	created	\N	2026-06-08	\N	2026-05-18 21:09:10.823528+00	2026-05-18 21:09:10.823528+00
d50e8400-e29b-41d4-a716-446655440016	c50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440002	\N	Campaign strategy	Campaign strategy seeded task	3	360	380	medium	completed	\N	2026-06-09	2026-05-17 21:09:07.044174+00	2026-05-18 21:09:10.823529+00	2026-05-18 21:09:10.82353+00
d50e8400-e29b-41d4-a716-446655440017	c50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440002	\N	Content creation	Content creation seeded task	4	480	\N	high	in_progress	\N	2026-06-10	\N	2026-05-18 21:09:10.823531+00	2026-05-18 21:09:10.823532+00
d50e8400-e29b-41d4-a716-446655440018	c50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440002	\N	Social media setup	Social media setup seeded task	2	600	\N	high	in_progress	\N	2026-06-11	\N	2026-05-18 21:09:10.823533+00	2026-05-18 21:09:10.823533+00
d50e8400-e29b-41d4-a716-446655440020	c50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440002	\N	Analytics & reporting	Analytics & reporting seeded task	4	240	\N	medium	created	\N	2026-06-13	\N	2026-05-18 21:09:10.823537+00	2026-05-18 21:09:10.823538+00
d50e8400-e29b-41d4-a716-446655440021	c50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440002	\N	System design	System design seeded task	2	360	380	high	completed	\N	2026-06-14	2026-05-17 21:09:08.918509+00	2026-05-18 21:09:10.823539+00	2026-05-18 21:09:10.82354+00
d50e8400-e29b-41d4-a716-446655440022	c50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440002	\N	Backend implementation	Backend implementation seeded task	3	480	500	high	completed	\N	2026-06-15	2026-05-17 21:09:09.31133+00	2026-05-18 21:09:10.823541+00	2026-05-18 21:09:10.823541+00
d50e8400-e29b-41d4-a716-446655440023	c50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440002	\N	Frontend dashboard	Frontend dashboard seeded task	4	600	620	high	completed	\N	2026-06-16	2026-05-17 21:09:09.613265+00	2026-05-18 21:09:10.823542+00	2026-05-18 21:09:10.823543+00
d50e8400-e29b-41d4-a716-446655440024	c50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440010	750e8400-e29b-41d4-a716-446655440002	\N	Testing & validation	Testing & validation seeded task	2	720	740	medium	completed	\N	2026-06-17	2026-05-17 21:09:09.989353+00	2026-05-18 21:09:10.823544+00	2026-05-18 21:09:10.823545+00
d50e8400-e29b-41d4-a716-446655440025	c50e8400-e29b-41d4-a716-446655440005	750e8400-e29b-41d4-a716-446655440008	750e8400-e29b-41d4-a716-446655440002	\N	Deployment & training	Deployment & training seeded task	3	240	260	high	completed	\N	2026-06-18	2026-05-17 21:09:10.821128+00	2026-05-18 21:09:10.823546+00	2026-05-18 21:09:10.823546+00
d50e8400-e29b-41d4-a716-446655440019	c50e8400-e29b-41d4-a716-446655440004	750e8400-e29b-41d4-a716-446655440007	750e8400-e29b-41d4-a716-446655440002	\N	Email campaign	Email campaign seeded task	3	720	0	high	in_progress	\N	2026-06-12	\N	2026-05-18 21:09:10.823534+00	2026-05-18 21:20:50.722425+00
0400dd86-68c9-4233-a836-481d7ae08d2b	8dae8182-951d-4279-8d82-82d9d5785412	70e267f7-da33-4956-a164-e1c3eae128e8	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	\N	Analyze the system	hello analyze the ssyetem	\N	\N	\N	medium	created	\N	\N	\N	2026-05-19 17:50:23.149279+00	2026-05-19 17:50:23.149285+00
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teams (id, name, manager_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: time_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.time_logs (id, task_id, user_id, started_at, ended_at, duration_minutes, source_type, notes, status, created_at, updated_at) FROM stdin;
91303bf9-461e-40fb-bcad-886799635bfb	d50e8400-e29b-41d4-a716-446655440019	134eabbc-7a90-4dd3-b652-16f243b9ef5b	2026-05-18 21:20:04.05312+00	2026-05-18 21:20:50.714703+00	0	timer	\N	completed	2026-05-18 21:20:50.730247+00	2026-05-18 21:20:50.730253+00
\.


--
-- Data for Name: user_permission_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_permission_overrides (id, user_id, permission_key, granted) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password_hash, role, manager_id, department, department_id, shift_id, designation, status, created_by, created_at, updated_at, phone) FROM stdin;
70e267f7-da33-4956-a164-e1c3eae128e8	Zia Ul Din	ziadin.544@gmail.com	$2b$12$I7BszCNzCgc0SEGSW9fcneV3nSCJ43mdlvuZLI2lvAN4CqXB0WDR.	manager	\N	AI	\N	\N	AI Automation Expert	active	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	2026-05-07 14:35:29.150705+00	2026-05-19 15:03:26.59116+00	\N
59871a6b-ea2f-4bf4-840a-0f00fe0195de	HR Admin	admin@example.com	$2b$12$dLqNxCyyTqTBYoBsVQPSqutIzLNB3PtesZPUsGE6hFXIgbso/zDjW	admin	\N	Operations	\N	\N	System Administrator	active	\N	2026-05-20 15:08:48.317994+00	2026-05-20 15:08:48.317994+00	\N
8c3cca8d-b646-47fb-ae80-40819b6a8e8c	HR Admin	hr.picentral@gmail.com	$2b$12$qjIe5hV8vtDALGO4Gzhoq.xQOCh2urTZOlRGzr3v.jzghUvC7rhsS	admin	\N	Operations	\N	\N	System Administrator	active	\N	2026-05-01 00:46:17.911575+00	2026-05-22 19:42:07.745213+00	\N
134eabbc-7a90-4dd3-b652-16f243b9ef5b	Zain Ul Abideen	izainulabideen04@gmail.com	$2b$12$1kNAQNggWGP7aK/wKEC8iu0sBclbKZr690rnog.k.8HgU8iyE/4OC	intern	70e267f7-da33-4956-a164-e1c3eae128e8	\N	\N	\N	AI Expert	active	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	2026-05-07 16:42:38.167772+00	2026-05-18 19:39:04.918359+00	\N
fc26edc5-30cd-4273-9383-52ba142d04dd	zain	zain@gmail.com	$2b$12$Pg.RnQCRil7YnfnKgSly5.ocp8GVx8jj1RNe29nLcRyQSBXuiI1MS	intern	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	AI	\N	\N	AI Automation Expert	inactive	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	2026-05-07 13:26:47.066453+00	2026-05-07 14:34:35.786545+00	\N
18ed9428-247b-4318-9399-ae4173674715	Muhammad Ammar Cheema	muhammadammar7747@gmail.com	!	manager	\N	\N	8d607101-a6e6-4196-bf8a-1af0303186af	594ea5a7-9263-4903-b593-a63d79ebbb05	AI Automation Expert	invited	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	2026-05-22 17:49:32.016048+00	2026-05-22 17:49:32.016054+00	\N
fb2f8520-8ef4-4b55-907c-b935480944f3	Ali	syedaliazzam1995@gmail.com	!	admin	\N	\N	8d607101-a6e6-4196-bf8a-1af0303186af	594ea5a7-9263-4903-b593-a63d79ebbb05	AI Expert	invited	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	2026-05-22 17:51:28.320157+00	2026-05-22 17:51:28.320191+00	\N
44a8944f-d5ef-470d-a8d7-712a61a347df	Muhammad Irfan	irfaanexe@gmail.com	$2b$12$K5znJlDRUDW.Mqk/CYloZ..vNbmeDULcK95IW87skhsWytLGRTgdu	employee	70e267f7-da33-4956-a164-e1c3eae128e8	AI	\N	\N	AI Expert	active	8c3cca8d-b646-47fb-ae80-40819b6a8e8c	2026-05-07 16:42:02.331517+00	2026-05-07 18:56:54.331181+00	\N
750e8400-e29b-41d4-a716-446655440001	Admin User	admin@company.com	$2b$12$NlrxcHIuiuLNXQYMUUQh7.59Nz8NvXKg81E8kpxIjXYx4UswkvNje	admin	\N	\N	550e8400-e29b-41d4-a716-446655440002	650e8400-e29b-41d4-a716-446655440001	System Administrator	active	\N	2026-05-18 21:08:22.372455+00	2026-05-18 21:08:22.372462+00	\N
750e8400-e29b-41d4-a716-446655440002	John Manager	john.manager@company.com	$2b$12$TO6PtyqgDCPyt3R56OeIpeP7OhvvP4x1tLnP2oMX3JwlUgki4p6.m	manager	\N	\N	550e8400-e29b-41d4-a716-446655440001	650e8400-e29b-41d4-a716-446655440001	Engineering Manager	active	\N	2026-05-18 21:08:22.372465+00	2026-05-18 21:08:22.372466+00	\N
750e8400-e29b-41d4-a716-446655440003	Sarah Engineer	sarah.engineer@company.com	$2b$12$0NC0C5kaIBFE.M3UIVxtw.CY9oITD9rFYv6tR7GGfQuz9R/.efpc.	employee	750e8400-e29b-41d4-a716-446655440002	\N	550e8400-e29b-41d4-a716-446655440001	650e8400-e29b-41d4-a716-446655440001	Senior Software Engineer	active	\N	2026-05-18 21:08:22.372467+00	2026-05-18 21:08:22.372468+00	\N
750e8400-e29b-41d4-a716-446655440004	Mike Developer	mike.developer@company.com	$2b$12$z7PIM0ExQtqbzSLdqJ1cKOyOpjLdj/SSn4/75rarCJyS18N9XWrSa	employee	750e8400-e29b-41d4-a716-446655440002	\N	550e8400-e29b-41d4-a716-446655440001	650e8400-e29b-41d4-a716-446655440001	Software Developer	active	\N	2026-05-18 21:08:22.37247+00	2026-05-18 21:08:22.372472+00	\N
750e8400-e29b-41d4-a716-446655440005	Lisa Sales	lisa.sales@company.com	$2b$12$LcXHjLymZDEnqYli.IVckuwaEjlo4cOORC4b2xhFQmpN5n5pOBo5i	manager	\N	\N	550e8400-e29b-41d4-a716-446655440003	650e8400-e29b-41d4-a716-446655440001	Sales Manager	active	\N	2026-05-18 21:08:22.372473+00	2026-05-18 21:08:22.372474+00	\N
750e8400-e29b-41d4-a716-446655440006	Tom Sales Rep	tom.sales@company.com	$2b$12$r6..VZocKMhcQrHwcnadx.gPSxhQhTiLRFTzgz9/hH0OB.p2oj.2C	employee	750e8400-e29b-41d4-a716-446655440005	\N	550e8400-e29b-41d4-a716-446655440003	650e8400-e29b-41d4-a716-446655440001	Sales Executive	active	\N	2026-05-18 21:08:22.372475+00	2026-05-18 21:08:22.372476+00	\N
750e8400-e29b-41d4-a716-446655440007	Emma Marketing	emma.marketing@company.com	$2b$12$F.YEo3sD2ovFWa3P2OLwpeBGVCi.WyDZGiCJzbzv5fKqpu.07ju/G	employee	\N	\N	550e8400-e29b-41d4-a716-446655440004	650e8400-e29b-41d4-a716-446655440001	Marketing Specialist	active	\N	2026-05-18 21:08:22.372477+00	2026-05-18 21:08:22.372478+00	\N
750e8400-e29b-41d4-a716-446655440008	David Finance	david.finance@company.com	$2b$12$cCHnOVkCDyw6CsIl8XWp2uGdexzrq6cFzPkBmLK6C/FWzZRv6euVS	employee	\N	\N	550e8400-e29b-41d4-a716-446655440005	650e8400-e29b-41d4-a716-446655440001	Finance Analyst	active	\N	2026-05-18 21:08:22.37248+00	2026-05-18 21:08:22.372481+00	\N
750e8400-e29b-41d4-a716-446655440009	Rachel HR	rachel.hr@company.com	$2b$12$QBvMQIpUC4wu9DHlVHLRtuke0Dw4S0HBwyvJUF7gmQgtXTzi8roIW	hr_operations	\N	\N	550e8400-e29b-41d4-a716-446655440002	650e8400-e29b-41d4-a716-446655440001	HR Specialist	active	\N	2026-05-18 21:08:22.372482+00	2026-05-18 21:08:22.372483+00	\N
750e8400-e29b-41d4-a716-446655440010	Alex Junior Dev	alex.junior@company.com	$2b$12$/JFpmS/U2.V2qC7CywoDPOEFZkoi0mi7gxmhhcHjBN2qNa2IVEYRK	junior_employee	750e8400-e29b-41d4-a716-446655440002	\N	550e8400-e29b-41d4-a716-446655440001	650e8400-e29b-41d4-a716-446655440001	Junior Developer	active	\N	2026-05-18 21:08:22.372484+00	2026-05-18 21:08:22.372485+00	\N
\.


--
-- Data for Name: weekly_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_reports (id, user_id, start_date, end_date, total_hours, tasks_completed, pending_tasks, blocked_tasks, late_logins, early_logouts, eod_submission_rate, productivity_score, created_at, updated_at) FROM stdin;
\.


--
-- Name: support_tickets_ticket_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_tickets_ticket_number_seq', 1000, false);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: account_invitations pk_account_invitations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_invitations
    ADD CONSTRAINT pk_account_invitations PRIMARY KEY (id);


--
-- Name: achievements pk_achievements; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT pk_achievements PRIMARY KEY (id);


--
-- Name: alerts pk_alerts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT pk_alerts PRIMARY KEY (id);


--
-- Name: announcements pk_announcements; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT pk_announcements PRIMARY KEY (id);


--
-- Name: approval_steps pk_approval_steps; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT pk_approval_steps PRIMARY KEY (id);


--
-- Name: approval_timeline pk_approval_timeline; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_timeline
    ADD CONSTRAINT pk_approval_timeline PRIMARY KEY (id);


--
-- Name: approvals pk_approvals; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT pk_approvals PRIMARY KEY (id);


--
-- Name: attendance_breaks pk_attendance_breaks; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_breaks
    ADD CONSTRAINT pk_attendance_breaks PRIMARY KEY (id);


--
-- Name: attendance_corrections pk_attendance_corrections; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_corrections
    ADD CONSTRAINT pk_attendance_corrections PRIMARY KEY (id);


--
-- Name: attendance_sessions pk_attendance_sessions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT pk_attendance_sessions PRIMARY KEY (id);


--
-- Name: audit_logs pk_audit_logs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT pk_audit_logs PRIMARY KEY (id);


--
-- Name: call_participants pk_call_participants; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_participants
    ADD CONSTRAINT pk_call_participants PRIMARY KEY (id);


--
-- Name: call_sessions pk_call_sessions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT pk_call_sessions PRIMARY KEY (id);


--
-- Name: call_signals pk_call_signals; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_signals
    ADD CONSTRAINT pk_call_signals PRIMARY KEY (id);


--
-- Name: conversation_participants pk_conversation_participants; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT pk_conversation_participants PRIMARY KEY (id);


--
-- Name: conversations pk_conversations; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT pk_conversations PRIMARY KEY (id);


--
-- Name: daily_stats pk_daily_stats; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT pk_daily_stats PRIMARY KEY (id);


--
-- Name: departments pk_departments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT pk_departments PRIMARY KEY (id);


--
-- Name: eod_reports pk_eod_reports; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eod_reports
    ADD CONSTRAINT pk_eod_reports PRIMARY KEY (id);


--
-- Name: eod_revisions pk_eod_revisions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eod_revisions
    ADD CONSTRAINT pk_eod_revisions PRIMARY KEY (id);


--
-- Name: goals pk_goals; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT pk_goals PRIMARY KEY (id);


--
-- Name: holidays pk_holidays; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT pk_holidays PRIMARY KEY (id);


--
-- Name: leave_requests pk_leave_requests; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT pk_leave_requests PRIMARY KEY (id);


--
-- Name: manager_daily_summaries pk_manager_daily_summaries; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manager_daily_summaries
    ADD CONSTRAINT pk_manager_daily_summaries PRIMARY KEY (id);


--
-- Name: meeting_participants pk_meeting_participants; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_participants
    ADD CONSTRAINT pk_meeting_participants PRIMARY KEY (id);


--
-- Name: meetings pk_meetings; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT pk_meetings PRIMARY KEY (id);


--
-- Name: message_attachments pk_message_attachments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT pk_message_attachments PRIMARY KEY (id);


--
-- Name: message_mentions pk_message_mentions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT pk_message_mentions PRIMARY KEY (id);


--
-- Name: message_reactions pk_message_reactions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT pk_message_reactions PRIMARY KEY (id);


--
-- Name: messages pk_messages; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT pk_messages PRIMARY KEY (id);


--
-- Name: monthly_reports pk_monthly_reports; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_reports
    ADD CONSTRAINT pk_monthly_reports PRIMARY KEY (id);


--
-- Name: notifications pk_notifications; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT pk_notifications PRIMARY KEY (id);


--
-- Name: password_reset_tokens pk_password_reset_tokens; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT pk_password_reset_tokens PRIMARY KEY (id);


--
-- Name: performance_metrics_daily pk_performance_metrics_daily; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_metrics_daily
    ADD CONSTRAINT pk_performance_metrics_daily PRIMARY KEY (id);


--
-- Name: permissions pk_permissions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT pk_permissions PRIMARY KEY (id);


--
-- Name: personal_notes pk_personal_notes; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT pk_personal_notes PRIMARY KEY (id);


--
-- Name: projects pk_projects; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT pk_projects PRIMARY KEY (id);


--
-- Name: role_permissions pk_role_permissions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT pk_role_permissions PRIMARY KEY (id);


--
-- Name: shifts pk_shifts; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT pk_shifts PRIMARY KEY (id);


--
-- Name: support_ticket_comments pk_support_ticket_comments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT pk_support_ticket_comments PRIMARY KEY (id);


--
-- Name: support_tickets pk_support_tickets; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT pk_support_tickets PRIMARY KEY (id);


--
-- Name: task_comments pk_task_comments; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT pk_task_comments PRIMARY KEY (id);


--
-- Name: task_timer_sessions pk_task_timer_sessions; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_timer_sessions
    ADD CONSTRAINT pk_task_timer_sessions PRIMARY KEY (id);


--
-- Name: tasks pk_tasks; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT pk_tasks PRIMARY KEY (id);


--
-- Name: teams pk_teams; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT pk_teams PRIMARY KEY (id);


--
-- Name: time_logs pk_time_logs; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT pk_time_logs PRIMARY KEY (id);


--
-- Name: user_permission_overrides pk_user_permission_overrides; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT pk_user_permission_overrides PRIMARY KEY (id);


--
-- Name: users pk_users; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT pk_users PRIMARY KEY (id);


--
-- Name: weekly_reports pk_weekly_reports; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT pk_weekly_reports PRIMARY KEY (id);


--
-- Name: departments uq_departments_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT uq_departments_name UNIQUE (name);


--
-- Name: holidays uq_holidays_holiday_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT uq_holidays_holiday_date UNIQUE (holiday_date);


--
-- Name: password_reset_tokens uq_password_reset_tokens_token_hash; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT uq_password_reset_tokens_token_hash UNIQUE (token_hash);


--
-- Name: performance_metrics_daily uq_performance_metrics_user_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_metrics_daily
    ADD CONSTRAINT uq_performance_metrics_user_date UNIQUE (user_id, metric_date);


--
-- Name: permissions uq_permissions_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT uq_permissions_key UNIQUE (key);


--
-- Name: role_permissions uq_role_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT uq_role_permission UNIQUE (role, permission_key);


--
-- Name: support_tickets uq_support_tickets_ticket_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT uq_support_tickets_ticket_number UNIQUE (ticket_number);


--
-- Name: daily_stats uq_user_daily_stats; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT uq_user_daily_stats UNIQUE (user_id, date);


--
-- Name: user_permission_overrides uq_user_permission; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT uq_user_permission UNIQUE (user_id, permission_key);


--
-- Name: users uq_users_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT uq_users_email UNIQUE (email);


--
-- Name: ix_account_invitations_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_account_invitations_token_hash ON public.account_invitations USING btree (token_hash);


--
-- Name: ix_account_invitations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_account_invitations_user_id ON public.account_invitations USING btree (user_id);


--
-- Name: ix_alerts_recipient_user_id_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_alerts_recipient_user_id_status_created_at ON public.alerts USING btree (recipient_user_id, status, created_at);


--
-- Name: ix_approval_timeline_entity_type_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_approval_timeline_entity_type_entity_id ON public.approval_timeline USING btree (entity_type, entity_id);


--
-- Name: ix_approvals_entity_type_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_approvals_entity_type_entity_id ON public.approvals USING btree (entity_type, entity_id);


--
-- Name: ix_attendance_sessions_user_id_check_in_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_attendance_sessions_user_id_check_in_at ON public.attendance_sessions USING btree (user_id, check_in_at);


--
-- Name: ix_audit_logs_entity_type_entity_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_entity_type_entity_id_created_at ON public.audit_logs USING btree (entity_type, entity_id, created_at);


--
-- Name: ix_call_participants_call_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_participants_call_session_id ON public.call_participants USING btree (call_session_id);


--
-- Name: ix_call_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_participants_user_id ON public.call_participants USING btree (user_id);


--
-- Name: ix_call_sessions_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_sessions_conversation_id ON public.call_sessions USING btree (conversation_id);


--
-- Name: ix_call_sessions_started_by_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_sessions_started_by_id ON public.call_sessions USING btree (started_by_id);


--
-- Name: ix_call_signals_call_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_signals_call_session_id ON public.call_signals USING btree (call_session_id);


--
-- Name: ix_call_signals_consumed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_signals_consumed_at ON public.call_signals USING btree (consumed_at);


--
-- Name: ix_call_signals_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_signals_recipient_id ON public.call_signals USING btree (recipient_id);


--
-- Name: ix_call_signals_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_call_signals_sender_id ON public.call_signals USING btree (sender_id);


--
-- Name: ix_conversation_participants_conv_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_conversation_participants_conv_user ON public.conversation_participants USING btree (conversation_id, user_id);


--
-- Name: ix_conversation_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_conversation_participants_user_id ON public.conversation_participants USING btree (user_id);


--
-- Name: ix_conversations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_conversations_created_at ON public.conversations USING btree (created_at);


--
-- Name: ix_conversations_related_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_conversations_related_entity ON public.conversations USING btree (related_entity_type, related_entity_id);


--
-- Name: ix_meeting_participants_meeting_id_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_meeting_participants_meeting_id_user_id ON public.meeting_participants USING btree (meeting_id, user_id);


--
-- Name: ix_meeting_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_meeting_participants_user_id ON public.meeting_participants USING btree (user_id);


--
-- Name: ix_meetings_organizer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_meetings_organizer_id ON public.meetings USING btree (organizer_id);


--
-- Name: ix_meetings_start_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_meetings_start_at ON public.meetings USING btree (start_at);


--
-- Name: ix_message_attachments_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_message_attachments_conversation_id ON public.message_attachments USING btree (conversation_id);


--
-- Name: ix_message_attachments_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_message_attachments_message_id ON public.message_attachments USING btree (message_id);


--
-- Name: ix_message_attachments_uploader_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_message_attachments_uploader_id ON public.message_attachments USING btree (uploader_id);


--
-- Name: ix_message_mentions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_message_mentions_user_id ON public.message_mentions USING btree (mentioned_user_id);


--
-- Name: ix_message_reactions_message_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_message_reactions_message_user ON public.message_reactions USING btree (message_id, user_id);


--
-- Name: ix_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: ix_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_created_at ON public.messages USING btree (created_at);


--
-- Name: ix_messages_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: ix_notifications_user_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_notifications_user_id_created_at ON public.notifications USING btree (user_id, created_at);


--
-- Name: ix_notifications_user_id_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_notifications_user_id_is_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: ix_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: ix_performance_metrics_daily_user_id_metric_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_performance_metrics_daily_user_id_metric_date ON public.performance_metrics_daily USING btree (user_id, metric_date);


--
-- Name: ix_projects_owner_id_approval_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_projects_owner_id_approval_status ON public.projects USING btree (owner_id, approval_status);


--
-- Name: ix_role_permissions_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_role_permissions_role ON public.role_permissions USING btree (role);


--
-- Name: ix_support_ticket_comments_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_support_ticket_comments_ticket_id ON public.support_ticket_comments USING btree (ticket_id);


--
-- Name: ix_support_tickets_assigned_to_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_support_tickets_assigned_to_id ON public.support_tickets USING btree (assigned_to_id);


--
-- Name: ix_support_tickets_created_by_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_support_tickets_created_by_id ON public.support_tickets USING btree (created_by_id);


--
-- Name: ix_support_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: ix_tasks_project_id_assigned_to_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_tasks_project_id_assigned_to_status ON public.tasks USING btree (project_id, assigned_to, status);


--
-- Name: ix_time_logs_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_time_logs_task_id ON public.time_logs USING btree (task_id);


--
-- Name: ix_time_logs_user_id_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_time_logs_user_id_started_at ON public.time_logs USING btree (user_id, started_at);


--
-- Name: ix_user_permission_overrides_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_user_permission_overrides_user_id ON public.user_permission_overrides USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_manager_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_manager_id ON public.users USING btree (manager_id);


--
-- Name: account_invitations fk_account_invitations_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_invitations
    ADD CONSTRAINT fk_account_invitations_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: achievements fk_achievements_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT fk_achievements_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: alerts fk_alerts_recipient_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT fk_alerts_recipient_user_id_users FOREIGN KEY (recipient_user_id) REFERENCES public.users(id);


--
-- Name: announcements fk_announcements_created_by_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_announcements_created_by_users FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: approval_steps fk_approval_steps_approval_id_approvals; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT fk_approval_steps_approval_id_approvals FOREIGN KEY (approval_id) REFERENCES public.approvals(id);


--
-- Name: approval_steps fk_approval_steps_approver_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_steps
    ADD CONSTRAINT fk_approval_steps_approver_id_users FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: approval_timeline fk_approval_timeline_actor_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_timeline
    ADD CONSTRAINT fk_approval_timeline_actor_id_users FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: approvals fk_approvals_decided_by_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT fk_approvals_decided_by_users FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: approvals fk_approvals_requested_by_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT fk_approvals_requested_by_users FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: attendance_breaks fk_attendance_breaks_attendance_session_id_attendance_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_breaks
    ADD CONSTRAINT fk_attendance_breaks_attendance_session_id_attendance_sessions FOREIGN KEY (attendance_session_id) REFERENCES public.attendance_sessions(id);


--
-- Name: attendance_breaks fk_attendance_breaks_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_breaks
    ADD CONSTRAINT fk_attendance_breaks_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: attendance_corrections fk_attendance_corrections_session_id_attendance_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_corrections
    ADD CONSTRAINT fk_attendance_corrections_session_id_attendance_sessions FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id);


--
-- Name: attendance_corrections fk_attendance_corrections_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_corrections
    ADD CONSTRAINT fk_attendance_corrections_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: attendance_sessions fk_attendance_sessions_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fk_attendance_sessions_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_logs fk_audit_logs_actor_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_actor_user_id_users FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: call_participants fk_call_participants_call_session_id_call_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_participants
    ADD CONSTRAINT fk_call_participants_call_session_id_call_sessions FOREIGN KEY (call_session_id) REFERENCES public.call_sessions(id) ON DELETE CASCADE;


--
-- Name: call_participants fk_call_participants_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_participants
    ADD CONSTRAINT fk_call_participants_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: call_sessions fk_call_sessions_conversation_id_conversations; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT fk_call_sessions_conversation_id_conversations FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: call_sessions fk_call_sessions_started_by_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT fk_call_sessions_started_by_id_users FOREIGN KEY (started_by_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: call_signals fk_call_signals_call_session_id_call_sessions; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_signals
    ADD CONSTRAINT fk_call_signals_call_session_id_call_sessions FOREIGN KEY (call_session_id) REFERENCES public.call_sessions(id) ON DELETE CASCADE;


--
-- Name: call_signals fk_call_signals_recipient_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_signals
    ADD CONSTRAINT fk_call_signals_recipient_id_users FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: call_signals fk_call_signals_sender_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_signals
    ADD CONSTRAINT fk_call_signals_sender_id_users FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversation_participants fk_conversation_participants_conversation_id_conversations; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT fk_conversation_participants_conversation_id_conversations FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants fk_conversation_participants_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT fk_conversation_participants_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversations fk_conversations_created_by_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT fk_conversations_created_by_id_users FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: daily_stats fk_daily_stats_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT fk_daily_stats_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: departments fk_departments_admin_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_departments_admin_id_users FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: eod_reports fk_eod_reports_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eod_reports
    ADD CONSTRAINT fk_eod_reports_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: eod_revisions fk_eod_revisions_eod_report_id_eod_reports; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.eod_revisions
    ADD CONSTRAINT fk_eod_revisions_eod_report_id_eod_reports FOREIGN KEY (eod_report_id) REFERENCES public.eod_reports(id);


--
-- Name: goals fk_goals_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT fk_goals_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: leave_requests fk_leave_requests_current_approver_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_requests_current_approver_id_users FOREIGN KEY (current_approver_id) REFERENCES public.users(id);


--
-- Name: leave_requests fk_leave_requests_escalated_from_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_requests_escalated_from_id_users FOREIGN KEY (escalated_from_id) REFERENCES public.users(id);


--
-- Name: leave_requests fk_leave_requests_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT fk_leave_requests_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: manager_daily_summaries fk_manager_daily_summaries_manager_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manager_daily_summaries
    ADD CONSTRAINT fk_manager_daily_summaries_manager_id_users FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: meeting_participants fk_meeting_participants_meeting_id_meetings; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_participants
    ADD CONSTRAINT fk_meeting_participants_meeting_id_meetings FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_participants fk_meeting_participants_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meeting_participants
    ADD CONSTRAINT fk_meeting_participants_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: meetings fk_meetings_organizer_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT fk_meetings_organizer_id_users FOREIGN KEY (organizer_id) REFERENCES public.users(id);


--
-- Name: message_attachments fk_message_attachments_conversation_id_conversations; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT fk_message_attachments_conversation_id_conversations FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: message_attachments fk_message_attachments_message_id_messages; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT fk_message_attachments_message_id_messages FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: message_attachments fk_message_attachments_uploader_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT fk_message_attachments_uploader_id_users FOREIGN KEY (uploader_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: message_mentions fk_message_mentions_mentioned_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT fk_message_mentions_mentioned_user_id_users FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id);


--
-- Name: message_mentions fk_message_mentions_message_id_messages; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_mentions
    ADD CONSTRAINT fk_message_mentions_message_id_messages FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions fk_message_reactions_message_id_messages; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT fk_message_reactions_message_id_messages FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions fk_message_reactions_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT fk_message_reactions_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: messages fk_messages_conversation_id_conversations; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_messages_conversation_id_conversations FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages fk_messages_parent_message_id_messages; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_messages_parent_message_id_messages FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages fk_messages_sender_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT fk_messages_sender_id_users FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications fk_notifications_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: password_reset_tokens fk_password_reset_tokens_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT fk_password_reset_tokens_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: performance_metrics_daily fk_performance_metrics_daily_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_metrics_daily
    ADD CONSTRAINT fk_performance_metrics_daily_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: personal_notes fk_personal_notes_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT fk_personal_notes_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: projects fk_projects_manager_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_manager_id_users FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: projects fk_projects_owner_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_owner_id_users FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: support_ticket_comments fk_support_ticket_comments_author_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT fk_support_ticket_comments_author_id_users FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: support_ticket_comments fk_support_ticket_comments_ticket_id_support_tickets; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT fk_support_ticket_comments_ticket_id_support_tickets FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets fk_support_tickets_assigned_to_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_tickets_assigned_to_id_users FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);


--
-- Name: support_tickets fk_support_tickets_created_by_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_support_tickets_created_by_id_users FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: task_comments fk_task_comments_task_id_tasks; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT fk_task_comments_task_id_tasks FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_comments fk_task_comments_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT fk_task_comments_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: task_timer_sessions fk_task_timer_sessions_task_id_tasks; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_timer_sessions
    ADD CONSTRAINT fk_task_timer_sessions_task_id_tasks FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_timer_sessions fk_task_timer_sessions_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.task_timer_sessions
    ADD CONSTRAINT fk_task_timer_sessions_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tasks fk_tasks_assigned_to_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_assigned_to_users FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tasks fk_tasks_created_by_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_created_by_users FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tasks fk_tasks_parent_id_tasks; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_parent_id_tasks FOREIGN KEY (parent_id) REFERENCES public.tasks(id);


--
-- Name: tasks fk_tasks_project_id_projects; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT fk_tasks_project_id_projects FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: teams fk_teams_manager_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT fk_teams_manager_id_users FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: time_logs fk_time_logs_task_id_tasks; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT fk_time_logs_task_id_tasks FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: time_logs fk_time_logs_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT fk_time_logs_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_permission_overrides fk_user_permission_overrides_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT fk_user_permission_overrides_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users fk_users_created_by_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_created_by_users FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: users fk_users_department_id_departments; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_department_id_departments FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: users fk_users_manager_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_manager_id_users FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: users fk_users_shift_id_shifts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_shift_id_shifts FOREIGN KEY (shift_id) REFERENCES public.shifts(id);


--
-- Name: weekly_reports fk_weekly_reports_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_reports
    ADD CONSTRAINT fk_weekly_reports_user_id_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict zypbKSTQ027fMhk8smc6zrX1F7tWv56AgHW4sYhRj5FBwnQwfUqpVwAGiZOXOei

