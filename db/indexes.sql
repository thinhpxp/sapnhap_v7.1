-- Database Indexes for sapnhap.org (Tối ưu hiệu năng truy vấn)

-- Extension cho Full-Text Trigram Search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes trên merger_events
CREATE INDEX IF NOT EXISTS idx_merger_events_old_ward_code ON merger_events(old_ward_code);
CREATE INDEX IF NOT EXISTS idx_merger_events_new_ward_code ON merger_events(new_ward_code);
CREATE INDEX IF NOT EXISTS idx_merger_events_new_province_code ON merger_events(new_province_code);

-- Indexes trên village_changes
CREATE INDEX IF NOT EXISTS idx_village_changes_old_ward_code ON village_changes(old_ward_code);

-- Indexes trên admin centers
CREATE INDEX IF NOT EXISTS idx_ward_admin_centers_new_ward_code ON ward_admin_centers(new_ward_code);
CREATE INDEX IF NOT EXISTS idx_province_admin_centers_new_province_code ON province_admin_centers(new_province_code);

-- Full-text search (trgm) indexes cho quick-search
CREATE INDEX IF NOT EXISTS idx_old_wards_name_trgm ON old_wards USING gin(old_ward_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_new_wards_name_trgm ON new_wards USING gin(new_ward_name gin_trgm_ops);

-- Index trên feedback
CREATE INDEX IF NOT EXISTS idx_feedback_unsent ON feedback(is_sent_to_telegram) WHERE is_sent_to_telegram = FALSE;
