"""
Generate Sample Interaction Data

Script này tạo sample interaction data để test ML system.
Chỉ dùng cho development/testing!

Usage:
    python scripts/ml/generate_sample_interactions.py
"""

import json
import os
import random
from datetime import datetime, timedelta

# Sample users (worker profiles)
SAMPLE_USERS = [
    {'userId': 'worker_001', 'age': 45, 'skills': ['python', 'data analysis']},
    {'userId': 'worker_002', 'age': 52, 'skills': ['driving', 'logistics']},
    {'userId': 'worker_003', 'age': 38, 'skills': ['cooking', 'catering']},
    {'userId': 'worker_004', 'age': 55, 'skills': ['sewing', 'textile']},
    {'userId': 'worker_005', 'age': 42, 'skills': ['accounting', 'finance']},
    {'userId': 'worker_006', 'age': 48, 'skills': ['cleaning', 'housekeeping']},
    {'userId': 'worker_007', 'age': 50, 'skills': ['security', 'guard']},
    {'userId': 'worker_008', 'age': 44, 'skills': ['farming', 'agriculture']},
    {'userId': 'worker_009', 'age': 47, 'skills': ['mechanics', 'repair']},
    {'userId': 'worker_010', 'age': 39, 'skills': ['sales', 'retail']},
]

# Sample jobs
SAMPLE_JOBS = [
    {'jobId': 'job_001', 'title': 'Python Developer', 'category': 'IT'},
    {'jobId': 'job_002', 'title': 'Data Analyst', 'category': 'IT'},
    {'jobId': 'job_003', 'title': 'Tài xế xe tải', 'category': 'Logistics'},
    {'jobId': 'job_004', 'title': 'Đầu bếp', 'category': 'Food'},
    {'jobId': 'job_005', 'title': 'Nhân viên may', 'category': 'Textile'},
    {'jobId': 'job_006', 'title': 'Kế toán', 'category': 'Finance'},
    {'jobId': 'job_007', 'title': 'Lao công', 'category': 'Cleaning'},
    {'jobId': 'job_008', 'title': 'Bảo vệ', 'category': 'Security'},
    {'jobId': 'job_009', 'title': 'Nông dân', 'category': 'Agriculture'},
    {'jobId': 'job_010', 'title': 'Thợ sửa xe', 'category': 'Repair'},
    {'jobId': 'job_011', 'title': 'Nhân viên bán hàng', 'category': 'Sales'},
    {'jobId': 'job_012', 'title': 'Web Developer', 'category': 'IT'},
    {'jobId': 'job_013', 'title': 'Thu ngân', 'category': 'Finance'},
    {'jobId': 'job_014', 'title': 'Shipper', 'category': 'Logistics'},
    {'jobId': 'job_015', 'title': 'Trưởng nhóm bếp', 'category': 'Food'},
]

# Action weights (implicit feedback)
ACTION_WEIGHTS = {
    'apply': 5.0,
    'bookmark': 4.0,
    'save': 4.0,
    'click': 2.0,
    'view': 1.0,
    'skip': 0.0
}

# Action distribution (weighted random)
ACTIONS = ['click', 'click', 'click', 'view', 'view', 'bookmark', 'apply', 'skip']


def generate_interactions(num_users: int = 10, interactions_per_user: int = 20) -> list:
    """
    Generate synthetic interaction data

    Args:
        num_users: Number of users
        interactions_per_user: Interactions per user

    Returns:
        List of interaction dicts
    """
    interactions = []

    users = SAMPLE_USERS[:num_users]
    jobs = SAMPLE_JOBS

    base_time = datetime.now() - timedelta(days=30)

    for user in users:
        user_id = user['userId']
        user_skills = user['skills']

        # Each user interacts with random jobs
        interacted_jobs = random.sample(jobs, min(interactions_per_user, len(jobs)))

        for i, job in enumerate(interacted_jobs):
            # Bias towards relevant jobs
            action = random.choice(ACTIONS)

            # More likely to apply to relevant jobs
            if any(skill in job['title'].lower() for skill in user_skills):
                if random.random() < 0.3:  # 30% chance to apply
                    action = 'apply'

            interaction = {
                'userId': user_id,
                'jobId': job['jobId'],
                'jobTitle': job['title'],
                'action': action,
                'weight': ACTION_WEIGHTS[action],
                'context': {
                    'page': 'job_listing',
                    'position': i + 1,
                    'sessionId': f'session_{user_id}_{i // 5}'
                },
                'metadata': {
                    'jobCategory': job['category'],
                    'jobLocation': random.choice(['HCM', 'HN', 'DN', 'CT']),
                },
                'device': {
                    'platform': random.choice(['windows', 'android', 'ios']),
                    'browser': random.choice(['chrome', 'safari', 'edge'])
                },
                'createdAt': (base_time + timedelta(
                    days=random.randint(0, 30),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )).isoformat()
            }

            interactions.append(interaction)

    return interactions


def main():
    """Generate and save sample interactions"""
    print("Generating sample interaction data...")

    interactions = generate_interactions(
        num_users=len(SAMPLE_USERS),
        interactions_per_user=15
    )

    print(f"Generated {len(interactions)} interactions")

    # Save to file
    output_path = 'data/interactions_sample.json'
    os.makedirs('data', exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(interactions, f, indent=2, ensure_ascii=False)

    print(f"Saved to: {output_path}")

    # Print stats
    from collections import Counter
    action_counts = Counter(i['action'] for i in interactions)
    print(f"\nAction distribution: {dict(action_counts)}")


if __name__ == '__main__':
    import os
    import sys

    # Add parent directory to path (go up: ml -> scripts -> ai-service)
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    ML_DIR = os.path.dirname(SCRIPT_DIR)
    AI_SERVICE_DIR = os.path.dirname(ML_DIR)
    sys.path.insert(0, AI_SERVICE_DIR)

    main()