-- Dedicated coursework cluster only. Application roles are NOLOGIN;
-- real login accounts/credentials are not included in the repository.
CREATE ROLE ppois_engineer NOLOGIN;
CREATE ROLE ppois_manager NOLOGIN;
CREATE ROLE ppois_viewer NOLOGIN;
CREATE ROLE ppois_worker NOLOGIN;

-- DCL01: no implicit public access to the application schema.
REVOKE ALL ON SCHEMA ppois FROM PUBLIC;
-- DCL02: all application roles may resolve names in this schema.
GRANT USAGE ON SCHEMA ppois TO ppois_engineer, ppois_manager, ppois_viewer, ppois_worker;
-- DCL03: read-only role, including the status view.
GRANT SELECT ON ALL TABLES IN SCHEMA ppois TO ppois_viewer;
-- DCL04: engineer reads catalog and works on configurations/BOM.
GRANT SELECT ON ALL TABLES IN SCHEMA ppois TO ppois_engineer;
-- DCL05: engineer may create/edit BOM; triggers enforce frozen snapshots.
GRANT INSERT, UPDATE ON ppois.configuration, ppois.bom_version, ppois.bom_slot TO ppois_engineer;
-- DCL06: manager can read the complete preparation result.
GRANT SELECT ON ALL TABLES IN SCHEMA ppois TO ppois_manager;
-- DCL07: manager creates cards/revisions/images and requests publication.
GRANT INSERT ON ppois.card, ppois.card_revision, ppois.image, ppois.revision_image,
    ppois.publication_attempt TO ppois_manager;
-- DCL08: manager may only invalidate a revision, not rewrite its content.
GRANT UPDATE (state) ON ppois.card_revision TO ppois_manager;
-- DCL09: background worker reads state and receives confirmed results.
GRANT SELECT ON ALL TABLES IN SCHEMA ppois TO ppois_worker;
-- DCL10: background worker has column-scoped result update rights.
GRANT UPDATE (state, external_task_id, error_code, confirmed_not_accepted, next_check_at)
    ON ppois.publication_attempt TO ppois_worker;
-- DCL11: prohibit all destructive table operations by application roles.
REVOKE DELETE, TRUNCATE ON ALL TABLES IN SCHEMA ppois
    FROM ppois_engineer, ppois_manager, ppois_viewer, ppois_worker;
-- DCL12: application roles cannot create database functions or new schema objects.
REVOKE CREATE ON SCHEMA ppois FROM ppois_engineer, ppois_manager, ppois_viewer, ppois_worker;
