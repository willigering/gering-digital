-- MySQL >= 8.0 / MariaDB >= 10.5; InnoDB, UTF8MB4, PDO prepared statements.
-- Installation NUR in einer eigens angelegten leeren Datenbank.
CREATE TABLE admins (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  role ENUM('customer','supporter') NOT NULL,
  banned_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_guests_role_seen (role,last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guest_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  guest_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  INDEX ix_guest_sessions_guest (guest_id),
  INDEX ix_guest_sessions_expiry (expires_at),
  CONSTRAINT fk_gs_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_no VARCHAR(32) UNIQUE NULL,
  customer_id BIGINT UNSIGNED NULL,
  assigned_supporter_id BIGINT UNSIGNED NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  category_id SMALLINT UNSIGNED NOT NULL,
  source ENUM('customer','training') NOT NULL DEFAULT 'customer',
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  subject VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  sample_solution TEXT NULL,
  priority ENUM('low','normal','high','critical') NOT NULL DEFAULT 'normal',
  status ENUM('new','open','assigned','in_progress','waiting_customer','waiting_support','solved','closed') NOT NULL DEFAULT 'new',
  claimed_at DATETIME NULL,
  resolved_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_t_customer FOREIGN KEY (customer_id) REFERENCES guests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_t_support FOREIGN KEY (assigned_supporter_id) REFERENCES guests(id) ON DELETE SET NULL,
  CONSTRAINT fk_t_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT fk_t_cat FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX ix_t_pool (is_published,assigned_supporter_id,status,created_at),
  INDEX ix_t_support (assigned_supporter_id,updated_at),
  INDEX ix_t_customer (customer_id,updated_at),
  INDEX ix_t_search (ticket_no,subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_kind ENUM('customer','supporter','admin','system') NOT NULL,
  sender_guest_id BIGINT UNSIGNED NULL,
  sender_admin_id BIGINT UNSIGNED NULL,
  message_type ENUM('public','internal','event') NOT NULL DEFAULT 'public',
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_m_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_m_guest FOREIGN KEY (sender_guest_id) REFERENCES guests(id) ON DELETE SET NULL,
  CONSTRAINT fk_m_admin FOREIGN KEY (sender_admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX ix_m_ticket_time (ticket_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  actor_kind ENUM('customer','supporter','admin','system') NOT NULL,
  actor_guest_id BIGINT UNSIGNED NULL,
  actor_admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  old_value VARCHAR(220) NULL,
  new_value VARCHAR(220) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_h_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  INDEX ix_h_ticket_time (ticket_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE private_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  sender_role ENUM('admin','guest') NOT NULL,
  body TEXT NOT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pm_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_guest FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
  INDEX ix_pm_thread (guest_id,admin_id,id),
  INDEX ix_pm_unread (sender_role,read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  supporter_id BIGINT UNSIGNED NOT NULL,
  stars TINYINT UNSIGNED NOT NULL,
  friendliness TINYINT UNSIGNED NOT NULL,
  clarity TINYINT UNSIGNED NOT NULL,
  resolution TINYINT UNSIGNED NOT NULL,
  speed TINYINT UNSIGNED NOT NULL,
  comment VARCHAR(1000) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_r_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_r_customer FOREIGN KEY (customer_id) REFERENCES guests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_r_support FOREIGN KEY (supporter_id) REFERENCES guests(id) ON DELETE RESTRICT,
  CONSTRAINT ck_r_stars CHECK (stars BETWEEN 1 AND 5),
  CONSTRAINT ck_r_friend CHECK (friendliness BETWEEN 1 AND 5),
  CONSTRAINT ck_r_clarity CHECK (clarity BETWEEN 1 AND 5),
  CONSTRAINT ck_r_resolution CHECK (resolution BETWEEN 1 AND 5),
  CONSTRAINT ck_r_speed CHECK (speed BETWEEN 1 AND 5),
  INDEX ix_r_support (supporter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(180) NOT NULL,
  storage_name CHAR(48) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_a_message FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scope VARCHAR(40) NOT NULL,
  identity_hash CHAR(64) NOT NULL,
  happened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_rl (scope,identity_hash,happened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(90) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id BIGINT UNSIGNED NULL,
  details TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX ix_audit_created (created_at),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (name,sort_order) VALUES
 ('Hardware',10),('Software',20),('Netzwerk',30),('Drucker',40),
 ('Benutzerkonten',50),('Berechtigungen',60),('E-Mail',70),
 ('Betriebssystem',80),('Sonstiges',90);
