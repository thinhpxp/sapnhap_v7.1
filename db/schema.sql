-- PostgreSQL Schema DDL for sapnhap.org (Chính xác 100% theo Supabase CSDL thực tế)

DROP TABLE IF EXISTS merger_events CASCADE;
DROP TABLE IF EXISTS village_changes CASCADE;
DROP TABLE IF EXISTS old_wards CASCADE;
DROP TABLE IF EXISTS new_wards CASCADE;
DROP TABLE IF EXISTS ward_admin_centers CASCADE;
DROP TABLE IF EXISTS province_admin_centers CASCADE;
DROP TABLE IF EXISTS province_mergers CASCADE;
DROP TABLE IF EXISTS old_data_flat CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;

CREATE TABLE merger_events (
    id INT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    old_province_code INT,
    old_province_name TEXT,
    old_province_en_name TEXT,
    old_district_code INT,
    old_district_name TEXT,
    old_district_en_name TEXT,
    old_ward_code INT,
    old_ward_name TEXT,
    old_ward_en_name TEXT,
    new_province_code INT,
    new_province_name TEXT,
    new_province_en_name TEXT,
    new_ward_code INT,
    new_ward_name TEXT,
    new_ward_en_name TEXT,
    event_type TEXT,
    split_description TEXT,
    change_date DATE
);

CREATE TABLE village_changes (
    id BIGINT PRIMARY KEY,
    old_village_name TEXT,
    status TEXT,
    new_village_name TEXT,
    old_ward_code INT,
    new_ward_code INT,
    notes TEXT,
    old_ward_name TEXT,
    new_ward_name TEXT
);

CREATE TABLE old_wards (
    old_ward_code INT PRIMARY KEY,
    old_ward_name TEXT,
    old_ward_en_name TEXT,
    old_district_name TEXT,
    old_province_name TEXT
);

CREATE TABLE new_wards (
    new_ward_code INT PRIMARY KEY,
    new_ward_name TEXT,
    new_ward_en_name TEXT,
    new_province_name TEXT
);

CREATE TABLE ward_admin_centers (
    id BIGINT PRIMARY KEY,
    new_ward_code INT,
    agency_type TEXT,
    address TEXT
);

CREATE TABLE province_admin_centers (
    id INT PRIMARY KEY,
    new_province_code SMALLINT,
    agency_type TEXT,
    address TEXT
);

CREATE TABLE province_mergers (
    id INT PRIMARY KEY,
    new_province_code INT,
    new_province_name TEXT,
    old_province_name TEXT,
    old_province_code INT
);

CREATE TABLE old_data_flat (
    id INT PRIMARY KEY,
    old_province_code INT,
    old_province_name TEXT,
    district_code INT,
    old_district_name TEXT,
    old_ward_code INT,
    old_ward_name TEXT
);

CREATE TABLE feedback (
    id INT PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_sent_to_telegram BOOLEAN DEFAULT FALSE,
    context JSONB
);
