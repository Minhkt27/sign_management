CREATE TABLE notifications (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    hospital_id  BIGINT REFERENCES hospitals(id),
    title        VARCHAR(255) NOT NULL,
    message      TEXT,
    type         VARCHAR(50) NOT NULL,
    reference_id BIGINT,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
