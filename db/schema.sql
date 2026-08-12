-- PostgreSQL Schema DDL for sapnhap.org (Replacing Supabase)

CREATE TABLE IF NOT EXISTS merger_events (
    id SERIAL PRIMARY KEY,
    old_ward_code INT NOT NULL,
    old_ward_name VARCHAR(255) NOT NULL,
    old_ward_en_name VARCHAR(255),
    old_district_code INT,
    old_district_name VARCHAR(255),
    old_district_en_name VARCHAR(255),
    old_province_code INT,
    old_province_name VARCHAR(255),
    old_province_en_name VARCHAR(255),
    new_ward_code INT NOT NULL,
    new_ward_name VARCHAR(255) NOT NULL,
    new_ward_en_name VARCHAR(255),
    new_district_code INT,
    new_district_name VARCHAR(255),
    new_district_en_name VARCHAR(255),
    new_province_code INT,
    new_province_name VARCHAR(255),
    new_province_en_name VARCHAR(255),
    effective_date DATE,
    resolution_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS village_changes (
    id SERIAL PRIMARY KEY,
    old_ward_code INT NOT NULL,
    old_village_name VARCHAR(255) NOT NULL,
    new_village_name VARCHAR(255),
    new_ward_code INT,
    new_ward_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS old_wards (
    id SERIAL PRIMARY KEY,
    old_ward_code INT UNIQUE NOT NULL,
    old_ward_name VARCHAR(255) NOT NULL,
    old_district_name VARCHAR(255),
    old_province_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS new_wards (
    id SERIAL PRIMARY KEY,
    new_ward_code INT UNIQUE NOT NULL,
    new_ward_name VARCHAR(255) NOT NULL,
    new_district_name VARCHAR(255),
    new_province_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ward_admin_centers (
    id SERIAL PRIMARY KEY,
    new_ward_code INT NOT NULL,
    agency_type VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS province_admin_centers (
    id SERIAL PRIMARY KEY,
    new_province_code INT NOT NULL,
    agency_type VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS province_mergers (
    id SERIAL PRIMARY KEY,
    old_province_code INT NOT NULL,
    old_province_name VARCHAR(255) NOT NULL,
    new_province_code INT NOT NULL,
    new_province_name VARCHAR(255) NOT NULL,
    resolution_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS old_data_flat (
    id SERIAL PRIMARY KEY,
    province_name VARCHAR(255),
    district_name VARCHAR(255),
    ward_name VARCHAR(255),
    ward_code INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    context JSONB,
    is_sent_to_telegram BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
