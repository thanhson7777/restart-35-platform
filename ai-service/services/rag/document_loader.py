"""
Document Loader - Load và chunk JSON data files cho RAG
"""
import json
import logging
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger(__name__)


class DocumentLoader:
    """Load career data files và convert thành chunks có metadata"""

    DATA_DIR = Path(__file__).parent.parent.parent / "data" / "rag"

    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir) if data_dir else self.DATA_DIR

    def load_all(self) -> List[Dict]:
        """Load tất cả JSON files trong data/rag/"""
        chunks = []

        if not self.data_dir.exists():
            logger.error(f"Data directory not found: {self.data_dir}")
            return chunks

        for json_file in self.data_dir.glob("*.json"):
            if json_file.name.startswith("."):
                continue

            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    file_chunks = self._process_file(json_file.stem, data)
                    chunks.extend(file_chunks)
                    logger.info(f"Loaded {len(file_chunks)} chunks from {json_file.name}")
            except Exception as e:
                logger.error(f"Error loading {json_file.name}: {e}")

        return chunks

    def _process_file(self, file_name: str, data: Dict) -> List[Dict]:
        """Process file và tạo chunks"""
        chunks = []

        if file_name == "salary_benchmarks":
            chunks.extend(self._process_salary(data))
        elif file_name == "industry_trends":
            chunks.extend(self._process_trends(data))
        elif file_name == "job_requirements":
            chunks.extend(self._process_requirements(data))
        elif file_name == "skill_matrix":
            chunks.extend(self._process_skills(data))
        elif file_name == "startup_playbooks":
            chunks.extend(self._process_startups(data))

        return chunks

    def _process_salary(self, data: Dict) -> List[Dict]:
        """Process salary data thành chunks"""
        chunks = []
        industries = data.get("industries", {})

        for industry, industry_data in industries.items():
            industry_label = industry_data.get("label", industry)
            positions = industry_data.get("positions", {})

            for position_key, position_data in positions.items():
                position_label = position_data.get("label", position_key)
                salary = position_data.get("salary_range", "N/A")
                senior = position_data.get("senior_range", "N/A")
                growth = position_data.get("growth_rate", "N/A")
                locations = position_data.get("locations", {})
                commission = position_data.get("commission", "")

                # Format locations
                loc_text = ""
                if locations:
                    loc_parts = [f"{k}: {v}" for k, v in locations.items()]
                    loc_text = f"Theo khu vực: {', '.join(loc_parts)}"

                # Format commission
                comm_text = f", Hoa hồng: {commission}" if commission else ""

                chunk_text = f"""
Ngành: {industry_label}
Vị trí: {position_label}
Mức lương khởi điểm: {salary}/tháng
Mức lương senior: {senior}/tháng
Tăng trưởng lương: {growth}
{loc_text}{comm_text}
""".strip()

                chunks.append({
                    "content": chunk_text,
                    "metadata": {
                        "type": "salary",
                        "industry": industry,
                        "industry_label": industry_label,
                        "position": position_key,
                        "position_label": position_label,
                        "source": "salary_benchmarks.json"
                    }
                })

        return chunks

    def _process_trends(self, data: Dict) -> List[Dict]:
        """Process trends data thành chunks"""
        chunks = []
        industries = data.get("industries", {})

        for industry, industry_data in industries.items():
            trend = industry_data.get("trend", "")
            advice = industry_data.get("advice", "")
            opportunities = industry_data.get("opportunities", [])
            opportunities_text = ", ".join(opportunities) if opportunities else "N/A"
            growth = industry_data.get("growth_rate", "")
            demand = industry_data.get("demand", "")
            outlook = industry_data.get("salary_outlook", "")

            chunk_text = f"""
Ngành: {industry}
Xu hướng 2026: {trend}
Tăng trưởng: {growth}
Nhu cầu thị trường: {demand}
Lời khuyên: {advice}
Triển vọng lương: {outlook}
Cơ hội việc làm: {opportunities_text}
""".strip()

            chunks.append({
                "content": chunk_text,
                "metadata": {
                    "type": "trend",
                    "industry": industry,
                    "source": "industry_trends.json"
                }
            })

        # Also add overall trends
        overall = data.get("2026_overall", {})
        trends = overall.get("trends", {})

        dang_tang = ", ".join(trends.get("dang_tang", []))
        dang_giam = ", ".join(trends.get("dang_giam", []))
        xuat_hien_moi = ", ".join(trends.get("xuat_hien_moi", []))

        overall_chunk = f"""
TỔNG QUAN XU HƯỚNG VIỆT NAM 2026

Ngành đang tăng trưởng: {dang_tang}

Ngành đang giảm: {dang_giam}

Ngành mới xuất hiện: {xuat_hien_moi}
""".strip()

        chunks.append({
            "content": overall_chunk,
            "metadata": {
                "type": "trend",
                "industry": "overall",
                "source": "industry_trends.json"
            }
        })

        return chunks

    def _process_requirements(self, data: Dict) -> List[Dict]:
        """Process job requirements thành chunks"""
        chunks = []
        requirements = data.get("requirements", {})

        for industry, industry_positions in requirements.items():
            for position_key, position_data in industry_positions.items():
                hard_skills = position_data.get("hard_skills", [])
                soft_skills = position_data.get("soft_skills", [])
                certs = position_data.get("certifications", [])
                experience = position_data.get("experience", "N/A")
                education = position_data.get("education", "N/A")

                hard_text = ", ".join(hard_skills) if hard_skills else "N/A"
                soft_text = ", ".join(soft_skills) if soft_skills else "N/A"
                certs_text = ", ".join(certs) if certs else "Không yêu cầu"

                chunk_text = f"""
Ngành: {industry}
Vị trí: {position_key}
Yêu cầu kinh nghiệm: {experience}
Yêu cầu học vấn: {education}
Kỹ năng cứng (hard skills): {hard_text}
Kỹ năng mềm (soft skills): {soft_text}
Chứng chỉ khuyến nghị: {certs_text}
""".strip()

                chunks.append({
                    "content": chunk_text,
                    "metadata": {
                        "type": "requirements",
                        "industry": industry,
                        "position": position_key,
                        "source": "job_requirements.json"
                    }
                })

        return chunks

    def _process_startups(self, data: Dict) -> List[Dict]:
        """Process startup playbooks thành chunks"""
        chunks = []
        models = data.get("startup_models", {})

        for model_key, model_data in models.items():
            name = model_data.get("name", "")
            target_audience = model_data.get("target_audience", "")
            estimated_budget = model_data.get("estimated_budget", "")
            timeline = model_data.get("timeline", "")
            expected_profit = model_data.get("expected_profit", "")
            
            essential_skills = model_data.get("essential_skills", [])
            important_skills = model_data.get("important_skills", [])
            risks = model_data.get("risks", [])

            essential_text = ", ".join(essential_skills) if essential_skills else "N/A"
            important_text = ", ".join(important_skills) if important_skills else "N/A"
            risks_text = ", ".join(risks) if risks else "N/A"

            chunk_text = f"""
Mô hình Khởi nghiệp: {name}
Phù hợp với: {target_audience}
Vốn dự kiến: {estimated_budget}
Thời gian triển khai: {timeline}
Lợi nhuận dự kiến: {expected_profit}
Kỹ năng bắt buộc (Essential): {essential_text}
Kỹ năng quan trọng (Important): {important_text}
Rủi ro cần lưu ý: {risks_text}
""".strip()

            chunks.append({
                "content": chunk_text,
                "metadata": {
                    "type": "startup",
                    "model_key": model_key,
                    "source": "startup_playbooks.json"
                }
            })

        return chunks

    def _process_skills(self, data: Dict) -> List[Dict]:
        """Process skill matrix thành chunks"""
        chunks = []
        skill_clusters = data.get("skill_clusters", {})

        for cluster_key, cluster_data in skill_clusters.items():
            cluster_label = cluster_data.get("label", cluster_key)
            common_jobs = cluster_data.get("common_jobs", [])
            transferable_to = cluster_data.get("transferable_to", [])
            transferable_skills = cluster_data.get("transferable_skills", [])
            skill_gap = cluster_data.get("skill_gap", [])

            jobs_text = ", ".join(common_jobs) if common_jobs else "N/A"
            transfer_text = ", ".join(transferable_to) if transferable_to else "N/A"
            skills_text = ", ".join(transferable_skills) if transferable_skills else "N/A"
            gap_text = ", ".join(skill_gap) if skill_gap else "N/A"

            chunk_text = f"""
Nhóm kỹ năng cốt lõi: {cluster_label}
Các nghề thường có kỹ năng này: {jobs_text}
Có thể chuyển đổi ngang sang: {transfer_text}
Kỹ năng hiện tại có thể dùng: {skills_text}
Kỹ năng cần học thêm: {gap_text}
""".strip()

            chunks.append({
                "content": chunk_text,
                "metadata": {
                    "type": "skill_transfer",
                    "cluster": cluster_key,
                    "source": "skill_matrix.json"
                }
            })

        # Add endangered skills
        endangered = data.get("endangered_skills_2026", {})
        endangered_skills = endangered.get("skills", [])

        if endangered_skills:
            endangered_texts = []
            for item in endangered_skills:
                endangered_texts.append(
                    f"- {item.get('skill', 'N/A')}: {item.get('reason', '')}. Thay thế bởi: {item.get('替代', 'N/A')}"
                )
            endangered_chunk = f"""
KỸ NĂNG ĐANG MẤT GIÁ TRỊ 2026
===========================
{chr(10).join(endangered_texts)}
""".strip()

            chunks.append({
                "content": endangered_chunk,
                "metadata": {
                    "type": "skill_transfer",
                    "industry": "overall",
                    "source": "skill_matrix.json"
                }
            })

        # Add future proof skills
        future_proof = data.get("future_proof_skills_2026", {})
        future_skills = future_proof.get("skills", [])

        if future_skills:
            future_texts = []
            for item in future_skills:
                future_texts.append(
                    f"- {item.get('skill', 'N/A')}: {item.get('reason', '')}. Độ khó: {item.get('difficulty', 'N/A')}, Thời gian: {item.get('timeline', 'N/A')}"
                )
            future_chunk = f"""
KỸ NĂNG TƯƠNG LAI BẢO TOÀN GIÁ TRỊ 2026
====================================
{chr(10).join(future_texts)}
""".strip()

            chunks.append({
                "content": future_chunk,
                "metadata": {
                    "type": "skill_transfer",
                    "industry": "overall",
                    "source": "skill_matrix.json"
                }
            })

        return chunks
