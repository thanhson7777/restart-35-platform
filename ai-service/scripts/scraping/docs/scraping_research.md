# Scraping Research Notes - ViecOi.vn, VietJobs.vn, JobStreet.vn

## Ngày cập nhật: 2026-04-22

---

## 1. ViecOi.vn

### URL Structure
- **Base URL:** https://viecoi.vn
- **Search URL:** https://viecoi.vn/tim-viec-lam
- **Category URL:** https://viecoi.vn/danh-muc/{category-slug}
- **Location URL:** https://viecoi.vn/viec-lam-tai-{location-slug}

### Job URL Pattern
- `https://viecoi.vn/viec-lam/{job-slug}-{job-id}.html`

### Categories (phù hợp với 35+)
- ke-toan-kiem-toan (Kế toán - Kiểm toán)
- nhan-su (Nhân sự)
- hanh-chinh-van-phong (Hành chính - Văn phòng)
- nhan-vien-kinh-doanh (Nhân viên kinh doanh)
- nhan-vien-ban-hang (Nhân viên bán hàng)
- lao-dong-pho-thong (Lao động phổ thông)

### Technical Notes
- Sử dụng server-side rendering (SSR)
- Không có API công khai
- Pagination qua query string `?page={number}`
- Anti-bot: Basic rate limiting

### Selector Patterns
- Job list: `.job-item`, `.job-card`
- Title: `h3 a`, `.job-title`
- Company: `.company`, `[class*="company"]`
- Salary: `.salary`, `[class*="salary"]`
- Location: `.location`, `[class*="location"]`

---

## 2. VietJobs.vn

### URL Structure
- **Base URL:** https://vietjobs.vn
- **Search URL:** https://vietjobs.vn/viec-lam
- **Job Detail:** https://vietjobs.vn/viec-lam/{job-slug}

### Categories
- cong-nghe-thong-tin (Công nghệ thông tin)
- kinh-doanh-ban-hang (Kinh doanh - Bán hàng)
- ke-toan-tai-chinh (Kế toán - Tài chính)
- nhan-su-hanh-chinh (Nhân sự - Hành chính)

### Technical Notes
- Giao diện đơn giản
- Không có API công khai
- Pagination: `?page={number}`
- Server-side rendering

### Selector Patterns
- Job list: `.job-item`, `.job-listing`
- Title: `h3 a`, `.title`
- Company: `.company`, `.employer`
- Salary: `.salary`, `.price`

---

## 3. JobStreet.vn

### URL Structure
- **Base URL:** https://www.jobstreet.vn
- **Search URL:** https://www.jobstreet.vn/jobs
- **Search with keyword:** https://www.jobstreet.vn/jobs?keywords={keyword}
- **Location filter:** https://www.jobstreet.vn/jobs?location={location}

### Job URL Pattern
- `https://www.jobstreet.vn/jobs/{job-slug}-{job-id}`

### Categories
- accounting (Kế toán)
- admin-human-resources (Hành chính - Nhân sự)
- sales-bd (Kinh doanh - Phát triển kinh doanh)
- banking-financial-services (Ngân hàng - Tài chính)
- manufacturing-operations (Sản xuất - Vận hành)

### Technical Notes
- **JavaScript-rendered** - Cần Playwright hoặc Selenium
- Sử dụng React/Next.js
- Infinite scroll hoặc pagination
- Strong anti-bot protection
- Cần stealth mode khi scrape

### Playwright Settings
- Headless: True
- Stealth mode: Required
- User-Agent rotation: Required
- Delay: 3-5 giây giữa requests
- Viewport: 1920x1080

### Selector Patterns
- Job cards: `.job`, `[data-job-id]`, `.job-card`, `article`
- Title: `h3 a`, `.title a`
- Company: `[class*="company"]`, `[class*="employer"]`
- Salary: `[class*="salary"]`

---

## Comparison Table

| Feature | ViecOi | VietJobs | JobStreet |
|---------|---------|----------|-----------|
| JavaScript Render | No | No | Yes |
| API | None | None | Internal |
| Anti-bot Level | Low | Low | High |
| Requires Playwright | No | No | Yes |
| Pagination | URL param | URL param | URL param |
| Job Data Quality | Good | Good | Excellent |

---

## Recommended Approach

### Tier 1: Easy Scraping (HTTP requests)
1. **ViecOi.vn** - Test đầu tiên
2. **VietJobs.vn** - Test thứ hai

### Tier 2: Advanced Scraping (Playwright)
1. **JobStreet.vn** - Cần stealth mode

---

## Rate Limiting

| Site | Recommended Delay | Max Requests/Hour |
|------|------------------|-------------------|
| ViecOi | 2-3 seconds | ~1200 |
| VietJobs | 2-3 seconds | ~1200 |
| JobStreet | 3-5 seconds | ~720 |

---

## Implementation Status

- [x] `viecoi_scraper.py` - Created
- [x] `vietjobs_scraper.py` - Created
- [x] `jobstreet_scraper.py` - Created (Playwright)
- [x] `run_scraping.py` - Updated with new scrapers

---

## TODO

- [ ] Test ViecOi scraper (run test)
- [ ] Test VietJobs scraper (run test)
- [ ] Test JobStreet scraper (install Playwright first)
- [ ] Set up weekly cron job
- [ ] Monitor success rates
