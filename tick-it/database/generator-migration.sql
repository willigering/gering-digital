-- Zusatzschema fuer den Schulungs-Ticketgenerator (idempotent).
CREATE TABLE IF NOT EXISTS generator_control (
 id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
 run_no INT UNSIGNED NOT NULL DEFAULT 0,
 status ENUM('idle','running','paused','complete','stopped') NOT NULL DEFAULT 'idle',
 initial_count SMALLINT UNSIGNED NOT NULL DEFAULT 100,
 batch_count SMALLINT UNSIGNED NOT NULL DEFAULT 5,
 interval_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 5,
 max_total INT UNSIGNED NOT NULL DEFAULT 1000,
 generated INT UNSIGNED NOT NULL DEFAULT 0,
 created_by_admin_id BIGINT UNSIGNED NULL,
 started_at DATETIME NULL,
 next_due_at DATETIME NULL,
 last_emitted_at DATETIME NULL,
 stopped_at DATETIME NULL,
 CONSTRAINT fk_gen_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS generator_usage (
 variant_id VARCHAR(24) NOT NULL PRIMARY KEY,
 last_issued_ticket_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
 last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 use_count INT UNSIGNED NOT NULL DEFAULT 0,
 INDEX ix_gen_recent (last_issued_ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS generator_issued (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 ticket_id BIGINT UNSIGNED NOT NULL UNIQUE,
 guest_id BIGINT UNSIGNED NOT NULL,
 variant_id VARCHAR(24) NOT NULL,
 run_no INT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_gen_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
 CONSTRAINT fk_gen_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE RESTRICT,
 INDEX ix_gen_issued_run (run_no,id),
 INDEX ix_gen_issued_guest (guest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO generator_control (id) VALUES (1);
