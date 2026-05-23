-- 1. 테스트 사용자 추가
INSERT INTO users (uuid, nickname, created_at, daily_message_count, daily_vote_count) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'GhostTester', NOW(), 0, 0)
ON CONFLICT (uuid) DO NOTHING;
