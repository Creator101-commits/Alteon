-- Enhanced Flashcard System Migration for Oracle Cloud Database
-- Adds: Decks/Subdecks, Enhanced Statistics, Cloze Deletion Cards

-- ================================================================
-- 1. CREATE FLASHCARD DECKS TABLE (Folders for organizing flashcards)
-- ================================================================
CREATE TABLE flashcard_decks (
    id VARCHAR2(255) DEFAULT SYS_GUID() PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    name CLOB NOT NULL,
    description CLOB,
    parent_deck_id VARCHAR2(255), -- For subdecks (self-referencing)
    color VARCHAR2(50) DEFAULT '#3b82f6',
    sort_order NUMBER(10) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deck_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_deck FOREIGN KEY (parent_deck_id) REFERENCES flashcard_decks(id) ON DELETE CASCADE
);

CREATE INDEX idx_deck_user ON flashcard_decks(user_id);
CREATE INDEX idx_deck_parent ON flashcard_decks(parent_deck_id);
CREATE INDEX idx_deck_sort ON flashcard_decks(sort_order);

-- ================================================================
-- 2. BACKUP EXISTING FLASHCARDS TABLE
-- ================================================================
CREATE TABLE flashcards_backup AS SELECT * FROM flashcards;

-- ================================================================
-- 3. DROP EXISTING FLASHCARDS TABLE AND RECREATE WITH NEW SCHEMA
-- ================================================================
DROP TABLE flashcards;

CREATE TABLE flashcards (
    id VARCHAR2(255) DEFAULT SYS_GUID() PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    deck_id VARCHAR2(255), -- Link to deck
    class_id VARCHAR2(255),
    card_type VARCHAR2(50) DEFAULT 'basic', -- 'basic' or 'cloze'
    front CLOB NOT NULL,
    back CLOB NOT NULL,
    cloze_text CLOB, -- For cloze deletion cards
    cloze_index NUMBER(3), -- Which cloze to show (1, 2, 3, etc.)
    difficulty VARCHAR2(50) DEFAULT 'medium', -- easy, medium, hard
    last_reviewed TIMESTAMP,
    review_count NUMBER(10) DEFAULT 0,
    correct_count NUMBER(10) DEFAULT 0,
    incorrect_count NUMBER(10) DEFAULT 0,
    ease_factor NUMBER(10) DEFAULT 250, -- For spaced repetition (250 = 2.5 * 100)
    interval_days NUMBER(10) DEFAULT 0, -- Days until next review
    maturity_level VARCHAR2(50) DEFAULT 'new', -- new, learning, young, mature
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_flashcard_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_flashcard_deck FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    CONSTRAINT fk_flashcard_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE INDEX idx_flashcard_user ON flashcards(user_id);
CREATE INDEX idx_flashcard_deck ON flashcards(deck_id);
CREATE INDEX idx_flashcard_class ON flashcards(class_id);
CREATE INDEX idx_flashcard_type ON flashcards(card_type);
CREATE INDEX idx_flashcard_maturity ON flashcards(maturity_level);
CREATE INDEX idx_flashcard_last_reviewed ON flashcards(last_reviewed);

-- ================================================================
-- 4. MIGRATE EXISTING DATA FROM BACKUP
-- ================================================================
INSERT INTO flashcards (
    id, 
    user_id, 
    class_id, 
    card_type,
    front, 
    back, 
    difficulty, 
    last_reviewed, 
    review_count,
    correct_count,
    incorrect_count,
    ease_factor,
    interval_days,
    maturity_level,
    created_at,
    updated_at
)
SELECT 
    id,
    user_id,
    class_id,
    'basic' as card_type,
    front,
    back,
    NVL(difficulty, 'medium'),
    last_reviewed,
    NVL(review_count, 0),
    0 as correct_count, -- Initialize
    0 as incorrect_count, -- Initialize
    250 as ease_factor, -- Initialize to default (2.5)
    0 as interval_days, -- Initialize
    CASE 
        WHEN review_count IS NULL OR review_count = 0 THEN 'new'
        WHEN review_count < 5 THEN 'learning'
        WHEN review_count < 15 THEN 'young'
        ELSE 'mature'
    END as maturity_level,
    created_at,
    created_at as updated_at
FROM flashcards_backup;

-- ================================================================
-- 5. CREATE FLASHCARD REVIEW HISTORY TABLE (for detailed statistics)
-- ================================================================
CREATE TABLE flashcard_reviews (
    id VARCHAR2(255) DEFAULT SYS_GUID() PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    flashcard_id VARCHAR2(255) NOT NULL,
    deck_id VARCHAR2(255),
    was_correct NUMBER(1) NOT NULL, -- 1 = correct, 0 = incorrect
    time_spent NUMBER(10), -- Seconds spent on review
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ease_factor NUMBER(10), -- Ease factor at time of review
    interval_days NUMBER(10), -- Interval at time of review
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_flashcard FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_deck FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE SET NULL
);

CREATE INDEX idx_review_user ON flashcard_reviews(user_id);
CREATE INDEX idx_review_flashcard ON flashcard_reviews(flashcard_id);
CREATE INDEX idx_review_deck ON flashcard_reviews(deck_id);
CREATE INDEX idx_review_date ON flashcard_reviews(review_date);
CREATE INDEX idx_review_user_date ON flashcard_reviews(user_id, review_date);

-- ================================================================
-- 6. CREATE DEFAULT DECK FOR EXISTING CARDS (Optional)
-- ================================================================
-- Create a default "Unsorted" deck for each user who has flashcards
INSERT INTO flashcard_decks (id, user_id, name, description, color, sort_order)
SELECT 
    SYS_GUID() as id,
    user_id,
    'Unsorted Cards' as name,
    'Default deck for existing flashcards' as description,
    '#64748b' as color,
    0 as sort_order
FROM (
    SELECT DISTINCT user_id FROM flashcards
);

-- Update flashcards to link to default deck
MERGE INTO flashcards f
USING (
    SELECT 
        fc.id as flashcard_id,
        fd.id as deck_id
    FROM flashcards fc
    JOIN flashcard_decks fd ON fc.user_id = fd.user_id AND fd.name = 'Unsorted Cards'
    WHERE fc.deck_id IS NULL
) d
ON (f.id = d.flashcard_id)
WHEN MATCHED THEN
    UPDATE SET f.deck_id = d.deck_id;

-- ================================================================
-- 7. CREATE TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ================================================================
CREATE OR REPLACE TRIGGER trg_deck_update
BEFORE UPDATE ON flashcard_decks
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_flashcard_update
BEFORE UPDATE ON flashcards
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- ================================================================
-- 8. CREATE VIEWS FOR STATISTICS
-- ================================================================

-- Daily Review Statistics View
CREATE OR REPLACE VIEW v_daily_review_stats AS
SELECT 
    user_id,
    TRUNC(review_date) AS review_day,
    COUNT(*) AS total_reviews,
    SUM(CASE WHEN was_correct = 1 THEN 1 ELSE 0 END) AS correct_reviews,
    SUM(CASE WHEN was_correct = 0 THEN 1 ELSE 0 END) AS incorrect_reviews,
    ROUND(AVG(CASE WHEN was_correct = 1 THEN 100 ELSE 0 END), 2) AS success_rate,
    AVG(time_spent) AS avg_time_spent,
    COUNT(DISTINCT flashcard_id) AS unique_cards_reviewed
FROM flashcard_reviews
GROUP BY user_id, TRUNC(review_date);

-- Deck Statistics View
CREATE OR REPLACE VIEW v_deck_stats AS
SELECT 
    fd.id AS deck_id,
    fd.user_id,
    fd.name AS deck_name,
    COUNT(f.id) AS total_cards,
    SUM(CASE WHEN f.maturity_level = 'new' THEN 1 ELSE 0 END) AS new_cards,
    SUM(CASE WHEN f.maturity_level = 'learning' THEN 1 ELSE 0 END) AS learning_cards,
    SUM(CASE WHEN f.maturity_level = 'young' THEN 1 ELSE 0 END) AS young_cards,
    SUM(CASE WHEN f.maturity_level = 'mature' THEN 1 ELSE 0 END) AS mature_cards,
    AVG(f.ease_factor) AS avg_ease_factor,
    AVG(f.interval_days) AS avg_interval
FROM flashcard_decks fd
LEFT JOIN flashcards f ON fd.id = f.deck_id
GROUP BY fd.id, fd.user_id, fd.name;

-- Retention Curve View (30-day window)
CREATE OR REPLACE VIEW v_retention_curve AS
SELECT 
    f.user_id,
    f.deck_id,
    TRUNC(SYSDATE) - TRUNC(r.review_date) AS days_ago,
    COUNT(*) AS reviews_count,
    SUM(CASE WHEN r.was_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
    ROUND(AVG(CASE WHEN r.was_correct = 1 THEN 100 ELSE 0 END), 2) AS retention_rate
FROM flashcards f
INNER JOIN flashcard_reviews r ON f.id = r.flashcard_id
WHERE r.review_date >= (SYSDATE - 30)
GROUP BY f.user_id, f.deck_id, (TRUNC(SYSDATE) - TRUNC(r.review_date));

-- ================================================================
-- 9. GRANT NECESSARY PERMISSIONS (if needed)
-- ================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON flashcard_decks TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON flashcards TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON flashcard_reviews TO your_app_user;
-- GRANT SELECT ON v_daily_review_stats TO your_app_user;
-- GRANT SELECT ON v_deck_stats TO your_app_user;
-- GRANT SELECT ON v_retention_curve TO your_app_user;

-- ================================================================
-- 10. VERIFICATION QUERIES
-- ================================================================
-- Check tables were created successfully
SELECT table_name FROM user_tables 
WHERE table_name IN ('FLASHCARD_DECKS', 'FLASHCARDS', 'FLASHCARD_REVIEWS')
ORDER BY table_name;

-- Check data migration
SELECT 
    'Backup Count' as source, COUNT(*) as count FROM flashcards_backup
UNION ALL
SELECT 
    'Current Count' as source, COUNT(*) as count FROM flashcards;

-- Check decks created
SELECT user_id, name, COUNT(*) 
FROM flashcard_decks 
GROUP BY user_id, name;

COMMIT;
