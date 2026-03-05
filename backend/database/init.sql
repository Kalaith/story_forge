-- Story Forge database initialization (schema + seed content)
-- Usage:
--   mysql -u root -p < database/init.sql

CREATE DATABASE IF NOT EXISTS story_forge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE story_forge;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    webhatch_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    is_verified BOOLEAN NOT NULL DEFAULT false,
    password_hash VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_webhatch_id (webhatch_id),
    INDEX idx_users_username (username),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stories (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    description TEXT,
    created_by VARCHAR(36) NOT NULL,
    access_level ENUM('anyone', 'approved_only', 'specific_users') NOT NULL DEFAULT 'anyone',
    require_examples BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_stories_created_by (created_by),
    INDEX idx_stories_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paragraphs (
    id VARCHAR(36) PRIMARY KEY,
    story_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_paragraphs_story (story_id),
    INDEX idx_paragraphs_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS writing_samples (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    INDEX idx_writing_samples_user (user_id),
    INDEX idx_writing_samples_story (story_id),
    INDEX idx_writing_samples_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_blocked_users (
    story_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_approved_contributors (
    story_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM story_approved_contributors;
DELETE FROM story_blocked_users;
DELETE FROM writing_samples;
DELETE FROM paragraphs;
DELETE FROM stories;
DELETE FROM users;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed users
INSERT INTO users (
    id, webhatch_id, username, email, display_name, role, is_verified, password_hash, created_at, updated_at
) VALUES
('11111111-1111-4111-8111-111111111111', 'seed:storyteller_jane', 'storyteller_jane', 'jane@example.com', 'Storyteller Jane', 'user', 1, '$2y$12$Wx2lhw0915gksnVTwSyBxOglX2TG40rGMyIqQNdB1bIKppBe.aLiq', '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
('22222222-2222-4222-8222-222222222222', 'seed:creative_alex', 'creative_alex', 'alex@example.com', 'Creative Alex', 'user', 1, '$2y$12$Wx2lhw0915gksnVTwSyBxOglX2TG40rGMyIqQNdB1bIKppBe.aLiq', '2024-02-10 10:00:00', '2024-02-10 10:00:00'),
('33333333-3333-4333-8333-333333333333', 'seed:narrative_sam', 'narrative_sam', 'sam@example.com', 'Narrative Sam', 'user', 1, '$2y$12$Wx2lhw0915gksnVTwSyBxOglX2TG40rGMyIqQNdB1bIKppBe.aLiq', '2024-03-05 10:00:00', '2024-03-05 10:00:00');

-- Seed stories
INSERT INTO stories (
    id, title, genre, description, created_by, access_level, require_examples, created_at, updated_at
) VALUES
('a1111111-1111-4111-8111-111111111111', 'The Last Library', 'Science Fiction', 'In a post-apocalyptic world, a mysterious library holds the key to humanity''s future.', '11111111-1111-4111-8111-111111111111', 'anyone', 0, '2024-06-01 10:00:00', '2024-06-01 10:00:00'),
('a2222222-2222-4222-8222-222222222222', 'Moonlight Confessions', 'Romance', 'A chance encounter under the full moon changes everything for two strangers.', '22222222-2222-4222-8222-222222222222', 'approved_only', 1, '2024-06-10 11:00:00', '2024-06-10 11:00:00'),
('a3333333-3333-4333-8333-333333333333', 'The Midnight Detective', 'Mystery', 'Detective Walsh investigates crimes that only happen at the stroke of midnight.', '33333333-3333-4333-8333-333333333333', 'specific_users', 0, '2024-06-15 08:00:00', '2024-06-15 08:00:00');

-- Seed paragraphs
INSERT INTO paragraphs (id, story_id, author_id, content, created_at) VALUES
('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'The dust settled on the cracked pavement as Maya approached the imposing structure. After months of wandering through the wasteland, she had finally found it - the Last Library. Its towering spires pierced the grey sky like fingers reaching for hope itself.', '2024-06-01 10:00:00'),
('b1111111-1111-4111-8111-222222222222', 'a1111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'The massive doors stood slightly ajar, revealing a warm golden glow from within. Maya hesitated as she reached for the ancient brass handle. Some called this place salvation, others called it a trap.', '2024-06-01 14:30:00'),
('b1111111-1111-4111-8111-333333333333', 'a1111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'As the door creaked open, the scent of old paper and leather bindings washed over her. Towers of books stretched into darkness, and a quiet page-turning sound echoed with no visible reader.', '2024-06-02 09:15:00'),
('b2222222-2222-4222-8222-111111111111', 'a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'The coffee shop''s neon sign flickered against the midnight darkness as Elena fumbled for her keys. The empty street stretched before her under the full moon.', '2024-06-10 11:00:00'),
('b2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'A soft melody drifted from the park across the street. Despite her exhaustion, Elena was drawn toward the music and the stranger sitting in moonlight.', '2024-06-10 16:45:00'),
('b3333333-3333-4333-8333-111111111111', 'a3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Detective Walsh checked her watch for the third time in five minutes. 11:58 PM. For three weeks, every crime in the city had occurred at precisely midnight.', '2024-06-15 08:00:00');

-- Seed writing samples
INSERT INTO writing_samples (
    id, user_id, story_id, content, status, created_at, updated_at
) VALUES
('c1111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', 'The rain pelted against the window as Sarah opened the letter that would change her life forever.', 'approved', '2024-06-09 12:00:00', '2024-06-10 12:00:00'),
('c2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333', 'The old clock tower chimed thirteen times, an impossibility that sent chills down Marcus''s spine.', 'approved', '2024-06-14 12:00:00', '2024-06-15 12:00:00');

-- Seed access control data
INSERT INTO story_approved_contributors (story_id, user_id, created_at) VALUES
('a2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '2024-06-11 00:00:00'),
('a2222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '2024-06-11 00:00:00'),
('a3333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '2024-06-16 00:00:00');

INSERT INTO story_blocked_users (story_id, user_id, created_at) VALUES
('a3333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', '2024-06-16 00:00:00');
