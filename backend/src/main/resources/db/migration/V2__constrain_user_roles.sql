ALTER TABLE users
    ADD CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'ENSEIGNANT', 'ETUDIANT'));

CREATE UNIQUE INDEX uq_users_email_case_insensitive ON users (LOWER(email));
