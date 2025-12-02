-- Quick Tasks Table for Dashboard Quick Todos
-- Run this in Oracle SQL console to add quick tasks table

CREATE TABLE quick_tasks (
    id VARCHAR2(36) PRIMARY KEY,
    user_id VARCHAR2(255) NOT NULL,
    title VARCHAR2(500) NOT NULL,
    completed NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_quick_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_quick_tasks_user ON quick_tasks(user_id);
CREATE INDEX idx_quick_tasks_completed ON quick_tasks(completed);

COMMIT;

-- Verification query
-- SELECT * FROM quick_tasks WHERE user_id = 'your_user_id';
