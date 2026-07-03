import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.skill_gap_service import SkillGapService

def test_hybrid_skill_gaps():
    service = SkillGapService()
    
    user_skills = ["bán hàng", "tính tiền lẻ", "giao tiếp"]
    target_occupation = "Nhân viên bán hàng"
    
    gaps = service.analyze_esco_skill_gaps(
        user_skills=user_skills,
        target_occupation=target_occupation,
        max_gaps=5
    )
    
    print(f"Target: {target_occupation}")
    print(f"User skills: {user_skills}")
    print(f"Gaps found: {len(gaps)}")
    for gap in gaps:
        print(f"- {gap['skill_name']} ({gap['priority']}) - {gap['reason']}")

if __name__ == "__main__":
    test_hybrid_skill_gaps()
