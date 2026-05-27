# ESCO Skill Annotation Guidelines

## 1. Introduction

This document provides detailed guidelines for annotating skills in Vietnamese job descriptions for the ESCO normalization pipeline.

### 1.1 Purpose

The annotations will be used to train a Named Entity Recognition (NER) model that can identify skill mentions in job descriptions and classify them into the appropriate ESCO categories.

### 1.2 Overview

- **Total annotations needed:** 500 job descriptions
- **Split:** 350 training, 100 validation, 50 test
- **Entity types:** 5 categories

---

## 2. Entity Types

### 2.1 SKILL_TECHNICAL

**Definition:** Technical skills, specialized professional competencies specific to an industry or trade.

**Indicators:**
- Action verbs: hàn (welding), lắp ráp (assembling), vận hành (operating), gia công (machining), lập trình (programming)
- Process nouns: hàn (welding), cắt (cutting), tiện (turning), phay (milling)

**Examples:**
| Text | Annotation | Reason |
|------|------------|--------|
| hàn MIG/MAG | SKILL_TECHNICAL | Welding technique |
| lập trình Python | SKILL_TECHNICAL | Programming skill |
| vận hành máy CNC | SKILL_TECHNICAL | Machine operation |
| sửa chữa điện | SKILL_TECHNICAL | Electrical repair |
| nấu ăn | SKILL_TECHNICAL | Cooking skill |

### 2.2 SKILL_TOOL

**Definition:** Tools, software, and equipment used in work.

**Indicators:**
- Software names: Excel, Word, AutoCAD, SAP, Photoshop, WordPress
- Equipment names: máy photocopy (photocopier), máy scan (scanner), máy in (printer)
- Tools/Utilities: calculator, CRM, ERP, POS

**Examples:**
| Text | Annotation | Reason |
|------|------------|--------|
| sử dụng Excel | SKILL_TOOL | Software |
| AutoCAD 2D/3D | SKILL_TOOL | CAD software |
| máy photocopy | SKILL_TOOL | Office equipment |
| dùng POS | SKILL_TOOL | Point of sale system |

### 2.3 SKILL_SOFT

**Definition:** Soft skills, interpersonal and general work skills.

**Indicators:**
- Social skills: giao tiếp (communication), làm việc nhóm (teamwork), thuyết trình (presentation)
- Personal skills: quản lý thời gian (time management), chịu áp lực (stress tolerance)
- Thinking skills: giải quyết vấn đề (problem solving), sáng tạo (creativity)

**Examples:**
| Text | Annotation | Reason |
|------|------------|--------|
| kỹ năng giao tiếp | SKILL_SOFT | Communication skill |
| làm việc nhóm | SKILL_SOFT | Teamwork |
| chịu áp lực cao | SKILL_SOFT | Stress tolerance |
| quản lý thời gian | SKILL_SOFT | Time management |
| sáng tạo | SKILL_SOFT | Creative thinking |

### 2.4 SKILL_LANGUAGE

**Definition:** Languages (foreign languages).

**Indicators:**
- Language names: tiếng Anh (English), tiếng Nhật (Japanese), tiếng Trung (Chinese), Hàn Quốc (Korean)
- Proficiency levels: sơ cấp (beginner), trung cấp (intermediate), cao cấp (advanced), giao tiếp (conversational)

**Examples:**
| Text | Annotation | Reason |
|------|------------|--------|
| tiếng Anh | SKILL_LANGUAGE | English language |
| Japanese N3 | SKILL_LANGUAGE | Japanese with level |
| giao tiếp tiếng Trung | SKILL_LANGUAGE | Chinese conversation |
| TOEIC 650 | SKILL_LANGUAGE | English certification |

### 2.5 CERTIFICATION

**Definition:** Certifications, degrees, licenses.

**Indicators:**
- Certification names: PMP, CPA, CFA, ACCA, CCNA, MOS
- Degrees: đại học (university), cao đẳng (college), THPT (high school)
- Licenses: bằng lái xe B2 (driver license), chứng chỉ nghề (vocational certificate)

**Examples:**
| Text | Annotation | Reason |
|------|------------|--------|
| chứng chỉ PMP | CERTIFICATION | Project management cert |
| tốt nghiệp đại học | CERTIFICATION | University degree |
| bằng lái xe B2 | CERTIFICATION | Driver license |
| chứng chỉ nghề | CERTIFICATION | Vocational cert |

---

## 3. Boundary Rules

### 3.1 DO Annotate

- Standalone skill names
- Skill names following verbs but still as separate entity
- Compound skills (MIG/MAG, 2D/3D)
- Skills with proficiency levels (N3, B2, TOEIC 650)

### 3.2 DON'T Annotate

- Verbs standing alone: "biết hàn" -> only annotate "hàn"
- Adjectives without nouns: "tốt" is not a skill
- Full sentences/context: only annotate the actual skill portion

### 3.3 Good vs Bad Examples

| Text | Good Annotation | Bad Annotation | Reason |
|------|-----------------|---------------|--------|
| sử dụng Excel | "Excel" | "sử dụng Excel" | Don't include verb |
| kỹ năng giao tiếp tốt | "kỹ năng giao tiếp tốt" | "kỹ năng" | Include full skill phrase |
| biết lập trình | "lập trình" | "biết lập trình" | Don't include verb |

---

## 4. Ambiguous Cases

### 4.1 SKILL_TOOL vs SKILL_TECHNICAL

| Situation | Decision Rule |
|-----------|---------------|
| Software/app | SKILL_TOOL |
| Technical process/method | SKILL_TECHNICAL |
| Programming language | SKILL_TOOL |
| Programming methodology | SKILL_TECHNICAL |

**Examples:**
| Text | Label | Reason |
|------|-------|--------|
| Python | SKILL_TOOL | Programming language |
| Agile | SKILL_TECHNICAL | Methodology |
| Excel | SKILL_TOOL | Software |
| Debugging | SKILL_TECHNICAL | Technical process |

### 4.2 Compound Skills

When a phrase contains multiple skill types, use context to determine the primary type:

| Text | Label | Reason |
|------|-------|--------|
| kỹ năng bán hàng | SKILL_SOFT | Sales is a soft skill |
| kỹ năng hàn | SKILL_TECHNICAL | Welding is a technical skill |
| kỹ năng nấu ăn | SKILL_TECHNICAL | Cooking is a technical skill |

### 4.3 Skills with Multiple Components

Annotate the entire skill phrase:

| Text | Annotation |
|------|------------|
| MIG/MAG welding | hàn MIG/MAG (SKILL_TECHNICAL) |
| 2D/3D AutoCAD | AutoCAD 2D/3D (SKILL_TOOL) |
| English 4 skills | tiếng Anh 4 kỹ năng (SKILL_LANGUAGE) |

---

## 5. Vietnamese Language Specifics

### 5.1 Common Patterns

| Pattern | Example | Annotation |
|---------|---------|------------|
| biết (know) | biết Excel | Excel |
| sử dụng (use) | sử dụng SAP | SAP |
| có kỹ năng (have skill) | có kỹ năng giao tiếp | kỹ năng giao tiếp |
| thành thạo (proficient) | thành thạo AutoCAD | AutoCAD |
| yêu cầu (require) | yêu cầu tiếng Anh | tiếng Anh |

### 5.2 Vietnamese Skill Names

Many Vietnamese skills are written without spaces or with non-standard formatting:

| Text | Correct Annotation |
|------|-------------------|
| Ms Excel | Microsoft Excel or Excel |
| msword | Word |
| html/css | HTML, CSS |
| autocad | AutoCAD |

---

## 6. Quality Checklist

Before submitting annotations, verify:

- [ ] All entities have start < end
- [ ] Extracted text matches original text
- [ ] No overlapping entities
- [ ] All labels are from the allowed list
- [ ] Entity boundaries are precise
- [ ] Compound skills are handled correctly

---

## 7. Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    ANNOTATION QUICK REFERENCE                │
├───────────────────┬─────────────────────────────────────────┤
│ SKILL_TECHNICAL   │ hàn, lập trình, vận hành, gia công     │
├───────────────────┼─────────────────────────────────────────┤
│ SKILL_TOOL        │ Excel, AutoCAD, SAP, máy photocopy      │
├───────────────────┼─────────────────────────────────────────┤
│ SKILL_SOFT        │ giao tiếp, teamwork, quản lý thời gian │
├───────────────────┼─────────────────────────────────────────┤
│ SKILL_LANGUAGE    │ tiếng Anh, Japanese, Chinese             │
├───────────────────┼─────────────────────────────────────────┤
│ CERTIFICATION     │ PMP, CPA, đại học, bằng lái xe          │
└───────────────────┴─────────────────────────────────────────┘
```

---

**Document Version:** 1.0
**Last Updated:** 2026-05-27
**Authors:** ESCO Pipeline Team
