# Course Scraper for Restart-35 Platform

Crawl khóa học video từ 4 nền tảng: **LinkedIn Learning**, **Coursera**, **Pluralsight**, **Udemy** — dùng [Scrapling](https://github.com/D4Vinci/Scrapling).

## Kiến trúc

```
course_scraper/
├── spiders/           # Scrapling Spider classes (base + 4 platforms)
├── extractors/        # JSON-LD parsing + schema normalization
├── pipelines/         # MongoDB storage, deduplication, field-filler
├── config/            # Per-platform config (URLs, selectors, rate limits)
├── utils/             # Logger, rate limiter
├── main.py            # CLI entry point
├── run_pipeline.py    # Full pipeline: scrape → normalize → fill → store
└── requirements.txt
```

## Cài đặt

```bash
cd course_scraper
cp .env.example .env
# Chỉnh sửa .env: MONGODB_URI, OPENAI_API_KEY (tùy chọn)
pip install -r requirements.txt
```

## Chạy nhanh

```bash
# Scrape 1 nền tảng (Udemy, 100 courses)
python -m course_scraper.main scrape --platform udemy --limit 100

# Scrape tất cả 4 nền tảng (mỗi nền tảng 200 courses)
python -m course_scraper.main pipeline --all --limit 200

# Development mode (dùng cache, không gọi network)
python -m course_scraper.main scrape --platform udemy --dev --limit 10

# Resume từ checkpoint
python -m course_scraper.main scrape --platform coursera --resume

# Xem thống kê đã scrape
python -m course_scraper.main stats --detail
```

## Chiến lược Scraping

| Nền tảng | Fetcher | JSON-LD | Pagination | Auth |
|-----------|---------|---------|------------|------|
| Udemy | Stealth | Primary | Page param (`p=N`) | Optional |
| Coursera | HTTP/Stealth | Primary | Next button | Optional |
| LinkedIn | Stealth + CF bypass | Không có | Topic URLs | Cookie (opt.) |
| Pluralsight | Stealth + network idle | Không có | Load more | Optional |

## Data Flow

```
Spider → raw dict (platform-specific)
         ↓
JsonLdExtractor → enriched with JSON-LD if available
         ↓
CourseNormalizer → Restart-35 schema
         ↓
fill_missing_fields → heuristic / AI skill extraction
         ↓
deduplicate_courses → URL + title similarity
         ↓
save_courses (MongoDB upsert by platform+externalId)
         ↓
build_course_embeddings.py (existing AI pipeline)
```

## Những trường mới trong courseModel

```javascript
externalId   // ID từ nền tảng gốc
platform     // 'udemy' | 'coursera' | 'linkedin' | 'pluralsight'
sourceUrl    // URL gốc trên nền tảng
_sourceMeta  // { scrapedAt, rawFields, missingFields, scraperVersion }
```

Tất cả courses scraped được lưu với `status: 'DRAFT'` — cần admin duyệt trước khi hiển thị.

## Proxy & Rate Limiting

Để scrape quy mô lớn, thêm proxy vào `.env`:

```env
PROXY_LIST=http://user:pass@proxy1:8080
PROXY_LIST=http://user:pass@proxy2:8080
```

Mặc định: direct connection với `download_delay=2s` giữa các request cùng domain.

## LinkedIn Learning Auth (tùy chọn)

```env
LINKEDIN_LEARNING_COOKIE=li_at=XXXX;JSESSIONID=XXXX
```

Lấy cookie bằng cách đăng nhập LinkedIn Learning trên trình duyệt, mở DevTools → Application → Cookies.
