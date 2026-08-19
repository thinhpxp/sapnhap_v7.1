import { queryWithCircuitBreaker } from '../db.js';
import { getCached, setCached } from '../cache.js';
import { encryptPayload } from '../utils/cipher.js';

// Hàm bỏ dấu tiếng Việt trong JS
function removeVietnameseTones(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .trim();
}

// SQL Translate bỏ dấu cho PostgreSQL (không cần extension)
const UNACCENT_SQL = `translate(lower(%col%), 'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd')`;

export async function quickSearchRoute(fastify) {
    fastify.get('/api/quick-search', {
        config: {
            rateLimit: {
                max: 120,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const { term, type = 'old' } = request.query;
        if (!term || term.trim().length < 2) {
            return reply.send(encryptPayload([]));
        }
        if (type !== 'old' && type !== 'new') {
            return reply.status(400).send(encryptPayload({ error: "Tham số 'type' phải là 'old' hoặc 'new'." }));
        }

        const cleanTerm = term.trim();
        const unaccentedTerm = removeVietnameseTones(cleanTerm);
        // Tạo search pattern linh hoạt: thay khoảng trắng bằng %
        const fuzzyPattern = `%${unaccentedTerm.replace(/\s+/g, '%')}%`;
        const exactPatternAccented = `%${cleanTerm}%`;

        const cacheKey = `sapnhap:search_v3:${type}:${unaccentedTerm}`;
        const cached = await getCached(cacheKey);
        if (cached) {
            reply.header('X-Cache', 'HIT');
            return reply.send(encryptPayload(cached));
        }

        try {
            let formattedResults = [];
            const unaccentCol = (col) => UNACCENT_SQL.replace(/%col%/g, col);

            if (type === 'old') {
                const sql = `
                  SELECT old_ward_code, old_ward_name, old_district_name, old_province_name
                  FROM old_wards
                  WHERE ${unaccentCol('old_ward_name')} ILIKE $1 
                     OR ${unaccentCol('old_district_name')} ILIKE $1 
                     OR ${unaccentCol('old_province_name')} ILIKE $1
                     OR old_ward_name ILIKE $2
                  ORDER BY 
                    CASE 
                      WHEN old_ward_name ILIKE $2 THEN 1
                      WHEN ${unaccentCol('old_ward_name')} ILIKE $1 THEN 2 
                      ELSE 3 
                    END,
                    old_ward_name ASC
                  LIMIT 25
                `;
                const res = await queryWithCircuitBreaker(sql, [fuzzyPattern, exactPatternAccented]);
                formattedResults = res.rows.map((r) => ({
                    code: r.old_ward_code,
                    name: r.old_ward_name,
                    context: `${r.old_district_name ? r.old_district_name + ', ' : ''}${r.old_province_name || ''}`,
                }));
            } else {
                const sql = `
                  SELECT new_ward_code, new_ward_name, new_province_name
                  FROM new_wards
                  WHERE ${unaccentCol('new_ward_name')} ILIKE $1 
                     OR ${unaccentCol('new_province_name')} ILIKE $1
                     OR new_ward_name ILIKE $2
                  ORDER BY 
                    CASE 
                      WHEN new_ward_name ILIKE $2 THEN 1
                      WHEN ${unaccentCol('new_ward_name')} ILIKE $1 THEN 2 
                      ELSE 3 
                    END,
                    new_ward_name ASC
                  LIMIT 25
                `;
                const res = await queryWithCircuitBreaker(sql, [fuzzyPattern, exactPatternAccented]);
                formattedResults = res.rows.map((r) => ({
                    code: r.new_ward_code,
                    name: r.new_ward_name,
                    context: r.new_province_name || '',
                }));
            }

            await setCached(cacheKey, formattedResults, 3600); // Cache 1 hour
            reply.header('X-Cache', 'MISS');
            return reply.send(encryptPayload(formattedResults));
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send(encryptPayload({ error: 'Lỗi máy chủ.' }));
        }
    });
}
