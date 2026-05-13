#!/usr/bin/env python3
"""
Build RAG Index Script
======================
Script để build và rebuild RAG index từ data files.

Usage:
    python scripts/build_rag_index.py              # Build index (skip nếu đã có)
    python scripts/build_rag_index.py --rebuild    # Force rebuild index
    python scripts/build_rag_index.py --stats      # Show index stats only
    python scripts/build_rag_index.py --test       # Test retrieval với sample profile
"""
import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.rag.rag_engine import CareerRAGEngine
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def show_stats(engine: CareerRAGEngine):
    """Show RAG index statistics"""
    stats = engine.get_index_stats()
    print("\n" + "=" * 50)
    print("RAG INDEX STATISTICS")
    print("=" * 50)
    for key, value in stats.items():
        print(f"  {key}: {value}")
    print("=" * 50 + "\n")


def test_retrieval(engine: CareerRAGEngine):
    """Test retrieval với sample profiles"""
    print("\n" + "=" * 50)
    print("TESTING RAG RETRIEVAL")
    print("=" * 50)

    # Sample profiles
    test_profiles = [
        {
            "name": "Người 42 tuổi, ngành hành chính, muốn chuyển sang HR Manager",
            "profile": {
                "basicInfo": {
                    "age": 42,
                    "gender": "Nam",
                    "province": "TP.HCM",
                    "education": "Cao đẳng"
                },
                "employmentHistory": [
                    {"industry": "hanh_chinh", "role": "thu_ky", "duration": 60}
                ],
                "aspirations": {
                    "targetJob": "hr_manager",
                    "skills": ["Word", "Excel", "PowerPoint"],
                    "targetSalary": "25 triệu"
                },
                "barriers": {
                    "techGap": True,
                    "family": False
                }
            }
        },
        {
            "name": "Người 38 tuổi, ngành IT, muốn học Data Analyst",
            "profile": {
                "basicInfo": {
                    "age": 38,
                    "gender": "Nữ",
                    "province": "Hà Nội",
                    "education": "Đại học"
                },
                "employmentHistory": [
                    {"industry": "it", "role": "lap_trinh_vien", "duration": 84}
                ],
                "aspirations": {
                    "targetJob": "data_analyst",
                    "skills": ["Python", "SQL", "Git"],
                    "targetSalary": "30 triệu"
                },
                "barriers": {
                    "techGap": False
                }
            }
        }
    ]

    for i, test_case in enumerate(test_profiles, 1):
        print(f"\n--- Test Case {i}: {test_case['name']} ---")
        try:
            context = engine.get_recommendation_context_sync(test_case["profile"])
            print(f"Context retrieved ({len(context)} chars):")
            print("-" * 40)
            print(context[:800] + "..." if len(context) > 800 else context)
            print("-" * 40)
            print(f"Sources: {engine.get_sources()}")
        except Exception as e:
            print(f"ERROR: {e}")

    print("\n" + "=" * 50 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Build RAG index for Career Recommendation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/build_rag_index.py              Build index
  python scripts/build_rag_index.py --rebuild   Force rebuild
  python scripts/build_rag_index.py --stats     Show stats only
  python scripts/build_rag_index.py --test      Test retrieval
  python scripts/build_rag_index.py -r -t       Rebuild and test
        """
    )
    parser.add_argument(
        "--rebuild", "-r",
        action="store_true",
        help="Force rebuild index (xóa index cũ và tạo mới)"
    )
    parser.add_argument(
        "--stats", "-s",
        action="store_true",
        help="Show index statistics only"
    )
    parser.add_argument(
        "--test", "-t",
        action="store_true",
        help="Test retrieval với sample profiles"
    )

    args = parser.parse_args()

    # Initialize engine
    print("\n" + "=" * 50)
    print("RAG INDEX BUILDER")
    print("=" * 50 + "\n")

    try:
        engine = CareerRAGEngine()

        if args.stats:
            # Show stats only
            show_stats(engine)
            return

        # Check if index exists (for info)
        try:
            current_count = engine.vector_store.count()
            if current_count > 0 and not args.rebuild:
                print(f"Current index: {current_count} documents")
        except:
            current_count = 0

        # Build or rebuild index
        if args.rebuild:
            logger.info("Rebuilding RAG index (--rebuild flag)...")

        engine.initialize_index(force_rebuild=args.rebuild)

        # Show stats after build
        show_stats(engine)

        # Test retrieval if requested
        if args.test:
            test_retrieval(engine)

        print("Done!")

    except Exception as e:
        logger.error(f"Failed to build RAG index: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
