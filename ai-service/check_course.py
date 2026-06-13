from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017')
course = client['restart-35-platform']['courses'].find_one()
print(course.keys())
print("URL:", course.get('url'))
print("Source:", course.get('source'))
