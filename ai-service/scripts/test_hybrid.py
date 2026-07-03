import sys
import os
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.esco_normalizer import get_normalizer

def test_hybrid():
    print("🔄 Đang khởi tạo Normalizer...")
    start = time.time()
    normalizer = get_normalizer()
    print(f"⏱ Khởi tạo mất: {time.time() - start:.2f}s")
    
    test_skills = [
        "bán hàng rong",
        "lái xe máy",
        "docker container", # Should fallback to ESCO semantic match
        "tính toán tiền lẻ",
        "chăm sóc khách hàng"
    ]
    
    for skill in test_skills:
        print(f"\n🔍 Testing: '{skill}'")
        # normalizer.normalize might return a dictionary or something else, let's call _match_to_esco directly
        matches = normalizer._match_to_esco(skill)
        
        if matches:
            for i, m in enumerate(matches[:3]):
                print(f"  [{i+1}] {m.label} (Score: {m.score:.2f}, Type: {m.match_type}) -> {m.uri}")
        else:
            print("  ❌ No matches found!")

if __name__ == "__main__":
    test_hybrid()
