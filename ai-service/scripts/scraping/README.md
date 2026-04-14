# Web Scraping Module

Module này cung cấp chức năng scrape dữ liệu việc làm từ các trang tuyển dụng phổ biến tại Việt Nam.

## Cấu Trúc

```
scraping/
├── __init__.py                 # Module init
├── base_scraper.py             # Base class cho scrapers
├── vietnamworks_scraper.py     # VietnamWorks scraper
├── careerbuilder_scraper.py    # CareerBuilder scraper
├── topcv_scraper.py           # TopCV scraper
├── data_transformer.py         # Transform data về schema chuẩn
├── deduplicator.py            # Loại bỏ trùng lặp
├── constants.py               # Constants và mappings
├── run_scraping.py            # Main script
├── requirements.txt            # Dependencies
└── README.md                  # This file
```

## Cài Đặt

```bash
cd ai-service/scripts/scraping
pip install -r requirements.txt
```

## Sử Dụng

### Chạy tất cả scrapers

```bash
python run_scraping.py
```

### Chỉ chạy 1 scraper

```bash
python run_scraping.py --source vnw        # VietnamWorks
python run_scraping.py --source cb        # CareerBuilder
python run_scraping.py --source topcv     # TopCV
```

### Giới hạn số pages

```bash
python run_scraping.py --pages 5           # 5 pages mỗi scraper
```

### Dry run (không save)

```bash
python run_scraping.py --dry-run
```

### Test mode (1 page)

```bash
python run_scraping.py --test
```

### Verbose logging

```bash
python run_scraping.py -v
```

## Các Nguồn Dữ Liệu

| Trang | URL | Jobs/ngày | Success Rate |
|-------|-----|-----------|--------------|
| VietnamWorks | vietnamworks.com | ~2000 | 70% |
| CareerBuilder | careerbuilder.vn | ~1500 | 80% |
| TopCV | topcv.vn | ~800 | 60% |

## Output Schema

Jobs được save vào `jobs.csv` với các columns:

| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique ID |
| title | string | Job title |
| company | string | Company name |
| skills | string | Pipe-separated skills |
| location | string | Province/City |
| salary_min | int | Min salary (VND) |
| salary_max | int | Max salary (VND) |
| type | string | full-time/part-time/temporary/freelance |
| age_preference | string | <35/<40/<45/<50/<55/any |
| experience_required | int | Years of experience |
| education_required | string | Education level |
| description | string | Job description |
| category | string | Job category |
| source | string | Data source |
| job_url | string | Original job URL |
| scraped_at | string | ISO timestamp |

## Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    SCRAPING PIPELINE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. SCRAPE ──→ VietnamWorks, CareerBuilder, TopCV     │
│                   ↓                                      │
│  2. TRANSFORM ─→ Normalize fields, clean data          │
│                   ↓                                      │
│  3. DEDUPLICATE ─→ Remove exact & fuzzy duplicates     │
│                   ↓                                      │
│  4. MERGE ─→ Combine with existing jobs.csv           │
│                   ↓                                      │
│  5. SAVE ─→ Update jobs.csv + backup                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Anti-Bot Measures

- Rate limiting: 2-3s delay giữa requests
- User-Agent rotation: 10+ User-Agents
- Retry logic: 3 attempts với exponential backoff
- Session management: Keep-alive connections

## Lưu Ý

1. **Website thay đổi UI**: Selectors có thể cần cập nhật khi website thay đổi
2. **Anti-bot**: TopCV có Cloudflare protection, có thể cần Playwright
3. **Legal**: Tuân thủ Terms of Service của mỗi website
4. **Maintenance**: Nên chạy định kỳ (1-2 lần/tuần)

## Troubleshooting

### Lỗi 403/429

- Tăng delay trong scraper
- Thử vào giờ khác (ít traffic)
- Sử dụng proxy

### Không tìm thấy job cards

- Website có thể đã thay đổi structure
- Inspect HTML để tìm selectors mới

### Import Error

```bash
# Thêm parent directory vào PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)/../../"
python run_scraping.py
```
