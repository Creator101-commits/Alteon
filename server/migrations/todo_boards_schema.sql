-- Alteon Todo Boards (Trello-inspired Kanban) Schema Migration
-- Run this in Oracle SQL console to add todo board tables

-- Boards table
CREATE TABLE boards (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    title VARCHAR2(100) NOT NULL,
    background VARCHAR2(500),
    position NUMBER DEFAULT 0,
    is_archived NUMBER(1) DEFAULT 0,
    is_favorited NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_boards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Lists table (columns in board)
CREATE TABLE todo_lists (
    id VARCHAR2(36) PRIMARY KEY,
    board_id VARCHAR2(36) NOT NULL,
    title VARCHAR2(100) NOT NULL,
    position NUMBER DEFAULT 0,
    is_archived NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lists_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Cards table (tasks)
CREATE TABLE cards (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    list_id VARCHAR2(36),
    title VARCHAR2(200) NOT NULL,
    description CLOB,
    position NUMBER DEFAULT 0,
    due_date TIMESTAMP,
    is_completed NUMBER(1) DEFAULT 0,
    is_archived NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cards_list FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE SET NULL
);

-- Checklists table (subtasks)
CREATE TABLE checklists (
    id VARCHAR2(36) PRIMARY KEY,
    card_id VARCHAR2(36) NOT NULL,
    title VARCHAR2(200) NOT NULL,
    is_checked NUMBER(1) DEFAULT 0,
    position NUMBER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_checklists_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Labels table
CREATE TABLE labels (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    name VARCHAR2(50) NOT NULL,
    color VARCHAR2(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_labels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Card-Labels junction table (many-to-many)
CREATE TABLE card_labels (
    card_id VARCHAR2(36) NOT NULL,
    label_id VARCHAR2(36) NOT NULL,
    PRIMARY KEY (card_id, label_id),
    CONSTRAINT fk_card_labels_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_labels_label FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- Attachments table
CREATE TABLE attachments (
    id VARCHAR2(36) PRIMARY KEY,
    card_id VARCHAR2(36) NOT NULL,
    file_name VARCHAR2(255) NOT NULL,
    file_type VARCHAR2(100),
    file_size NUMBER,
    file_url VARCHAR2(1000) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attachments_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_boards_user ON boards(user_id);
CREATE INDEX idx_boards_position ON boards(position);
CREATE INDEX idx_lists_board ON todo_lists(board_id);
CREATE INDEX idx_lists_position ON todo_lists(position);
CREATE INDEX idx_cards_list ON cards(list_id);
CREATE INDEX idx_cards_user ON cards(user_id);
CREATE INDEX idx_cards_position ON cards(position);
CREATE INDEX idx_checklists_card ON checklists(card_id);
CREATE INDEX idx_labels_user ON labels(user_id);
CREATE INDEX idx_attachments_card ON attachments(card_id);

-- Create sequences for auto-incrementing positions (optional helper)
CREATE SEQUENCE board_position_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE list_position_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE card_position_seq START WITH 1 INCREMENT BY 1;

-- Insert default labels for new users (you can run this per user or provide defaults)
-- Example predefined labels:
-- These will be inserted when a user first accesses todo boards
INSERT INTO labels (id, user_id, name, color) VALUES ('label_1', 'SYSTEM', 'High Priority', '#EF4444');
INSERT INTO labels (id, user_id, name, color) VALUES ('label_2', 'SYSTEM', 'Medium Priority', '#F59E0B');
INSERT INTO labels (id, user_id, name, color) VALUES ('label_3', 'SYSTEM', 'Low Priority', '#10B981');
INSERT INTO labels (id, user_id, name, color) VALUES ('label_4', 'SYSTEM', 'Reading', '#3B82F6');
INSERT INTO labels (id, user_id, name, color) VALUES ('label_5', 'SYSTEM', 'Practice', '#8B5CF6');
INSERT INTO labels (id, user_id, name, color) VALUES ('label_6', 'SYSTEM', 'Project', '#EC4899');
INSERT INTO labels (id, user_id, name, color) VALUES ('label_7', 'SYSTEM', 'Exam Prep', '#F43F5E');

COMMIT;

-- Verification queries
-- SELECT * FROM boards WHERE user_id = 'your_user_id';
-- SELECT * FROM todo_lists WHERE board_id = 'your_board_id';
-- SELECT * FROM cards WHERE user_id = 'your_user_id';
