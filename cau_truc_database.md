## Table `merger_events`

Bảng ghi lại tất cả các sự kiện sáp nhập, bao gồm cả sáp nhập đơn giản, chia tách và lịch sử.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `old_province_code` | `int4` |  Nullable |
| `old_province_name` | `text` |  Nullable |
| `old_province_en_name` | `text` |  Nullable |
| `old_district_code` | `int4` |  Nullable |
| `old_district_name` | `text` |  Nullable |
| `old_district_en_name` | `text` |  Nullable |
| `old_ward_code` | `int4` |  |
| `old_ward_name` | `text` |  Nullable |
| `old_ward_en_name` | `text` |  Nullable |
| `new_province_code` | `int4` |  Nullable |
| `new_province_name` | `text` |  Nullable |
| `new_province_en_name` | `text` |  Nullable |
| `new_ward_code` | `int4` |  |
| `new_ward_name` | `text` |  Nullable |
| `new_ward_en_name` | `text` |  Nullable |
| `event_type` | `text` |  |
| `split_description` | `text` |  Nullable |
| `change_date` | `date` |  Nullable |
| `id` | `int4` | Primary |
| `created_at` | `timestamptz` |  Nullable |

## Table `feedback`
Bảng lưu trữ các phản hồi từ người dùng
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `message` | `text` |  |
| `context` | `jsonb` |  Nullable |
| `id` | `int4` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `is_sent_to_telegram` | `bool` |  Nullable |

## Table `ward_admin_centers`
Bảng lưu trữ các trung tâm hành chính của các xã, phường.
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Unique Identity |
| `new_ward_code` | `int4` |  |
| `agency_type` | `text` |  Nullable |
| `address` | `text` |  Nullable |

## Table `province_admin_centers`
Bảng lưu trữ các trung tâm hành chính của các tỉnh, thành phố.
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `new_province_code` | `int2` |  |
| `agency_type` | `text` |  Nullable |
| `address` | `text` |  Nullable |

## Table `old_data_flat`

dữ liệu về tỉnh thành trước ngày 1 tháng 7 năm 2025

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `old_province_code` | `int4` |  Nullable |
| `old_province_name` | `text` |  Nullable |
| `district_code` | `int4` |  Nullable |
| `old_district_name` | `text` |  Nullable |
| `old_ward_code` | `int4` |  Nullable |
| `old_ward_name` | `text` |  Nullable |

## Table `old_wards`
Bảng lưu trữ thông tin về các xã, phường trước ngày 1 tháng 7 năm 2025
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `old_ward_code` | `int4` | Primary |
| `old_ward_name` | `text` |  Nullable |
| `old_ward_en_name` | `text` |  Nullable |
| `old_district_name` | `text` |  Nullable |
| `old_province_name` | `text` |  Nullable |

## Table `new_wards`
Bảng lưu trữ thông tin về các xã, phường sau ngày 1 tháng 7 năm 2025
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `new_ward_code` | `int4` | Primary |
| `new_ward_name` | `text` |  Nullable |
| `new_ward_en_name` | `text` |  Nullable |
| `new_province_name` | `text` |  Nullable |

## Table `province_mergers`
Bảng lưu trữ thông tin về việc sáp nhập các tỉnh, thành phố.
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `new_province_code` | `int4` |  |
| `new_province_name` | `text` |  |
| `old_province_name` | `text` |  |
| `old_province_code` | `int4` |  |
| `id` | `int4` | Primary |

## Table `village_changes`

Sự thay đổi cấp thôn, tổ dân phố, khu phố

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `new_village_name` | `text` |  Nullable |
| `old_ward_code` | `int4` |  Nullable |
| `new_ward_code` | `int4` |  Nullable |
| `notes` | `text` |  Nullable |
| `id` | `int8` | Primary Identity |
| `old_village_name` | `text` |  Nullable |
| `old_ward_name` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `new_ward_name` | `text` |  Nullable |

## Table `api_cache`
Bảng lưu trữ các response từ api để tránh gọi api nhiều lần
### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `key` | `text` | Primary |
| `data` | `jsonb` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

