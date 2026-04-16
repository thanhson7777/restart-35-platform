"""Check MongoDB user_interactions collection"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')

client = MongoClient(MONGODB_URI)
db = client[DATABASE_NAME]
collection = db['user_interactions']

print("=" * 50)
print("USER INTERACTIONS COLLECTION ANALYSIS")
print("=" * 50)

# Count documents
count = collection.count_documents({})
print(f"\n1. Total documents: {count}")

# Distinct actions
distinct_actions = collection.distinct('action')
print(f"\n2. Distinct actions: {distinct_actions}")

# Distinct users
distinct_users = collection.distinct('user_id')
print(f"\n3. Number of distinct users: {len(distinct_users)}")
print(f"   User IDs: {distinct_users[:10]}{'...' if len(distinct_users) > 10 else ''}")

# Aggregation by action type
print(f"\n4. Aggregation by action type:")
pipeline = [
    {"$group": {"_id": "$action", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]
results = collection.aggregate(pipeline)
for r in results:
    print(f"   - {r['_id']}: {r['count']}")

# Sample documents
print(f"\n5. Sample documents (first 3):")
for doc in collection.find().limit(3):
    print(f"\n   {doc}")

client.close()