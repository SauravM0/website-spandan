# WP15 — Patient and clinical authorization

Status: implemented and locally verified. Database integration and staging role-matrix evidence remain deployment gates.

The previously combined patient endpoint has been removed. Demographic summary, appointments, clinical timeline, document metadata, and document bytes now use separate contracts and permissions. The current deployment still permits only the sole administrator to authenticate; the role and doctor-scope rules remain deny-by-default protection for future configuration changes.

Restricted patients are omitted from search and denied from summary, appointment, clinical, medication, observation, device-import, and document queries unless the caller is the sole administrator or has an explicit unexpired grant. Doctors additionally require a matching patient encounter and, where supplied, the exact encounter. Clinical and document-content grants are separate, expiring audit records that cannot be deleted.

Document metadata uses `DOCUMENTS_READ`; encrypted document bytes require `DOCUMENTS_CONTENT_READ`. Clinical timeline and related modules require `CLINICAL_READ`. Successful and denied sensitive requests record actor, action, entity reference, request ID, outcome, and status code without including clinical text or document content.

Clinical notes, resources, observations, medications, device imports, and document features remain governed by their existing disabled production flags. WP15 changes authorization boundaries only and does not enable clinical authoring.

Staging must test the administrator plus synthetic denied-role, wrong-doctor, wrong-patient, wrong-encounter, restricted-without-grant, expired-grant, revoked-grant, metadata-only, and document-content scenarios. Review audit rows for both success and denial and confirm that no response or log contains unauthorized clinical payloads.
