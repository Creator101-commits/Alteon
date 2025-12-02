-- Cleanup script to fix the partial migration
-- This will complete the flashcard table upgrade

-- 1. First, let's check what columns exist in the current flashcards table
DESC flashcards;

-- 2. Drop the old flashcards table (data is already backed up)
DROP TABLE flashcards CASCADE CONSTRAINTS;

-- 3. Recreate the flashcards table with all new columns
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
    ease_factor NUMBER(10) DEFAULT 250, -- For spaced repetition (250 = 2.5)
    interval_days NUMBER(10) DEFAULT 0, -- Days until next review
    maturity_level VARCHAR2(50) DEFAULT 'new', -- new, learning, young, mature
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_flashcard_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_flashcard_deck FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id) ON DELETE SET NULL,
    CONSTRAINT fk_flashcard_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- 4. Create indexes for the new table
CREATE INDEX idx_flashcard_user ON flashcards(user_id);
CREATE INDEX idx_flashcard_deck ON flashcards(deck_id);
CREATE INDEX idx_flashcard_class ON flashcards(class_id);
CREATE INDEX idx_flashcard_type ON flashcards(card_type);
CREATE INDEX idx_flashcard_maturity ON flashcards(maturity_level);
CREATE INDEX idx_flashcard_last_reviewed ON flashcards(last_reviewed);

-- 5. Migrate data from backup with new columns
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

-- 6. Update flashcards to link to default deck
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

-- 7. Fix the flashcard update trigger
CREATE OR REPLACE TRIGGER trg_flashcard_update
BEFORE UPDATE ON flashcards
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- 8. Recreate the views that failed
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

-- 9. Verify everything works
SELECT 'Migration Complete!' as status FROM dual;

-- Check the new table structure
SELECT column_name, data_type FROM user_tab_columns 
WHERE table_name = 'FLASHCARDS' 
ORDER BY column_id;

-- Check data was migrated
SELECT COUNT(*) as total_flashcards FROM flashcards;
SELECT COUNT(*) as total_decks FROM flashcard_decks;

COMMIT;
