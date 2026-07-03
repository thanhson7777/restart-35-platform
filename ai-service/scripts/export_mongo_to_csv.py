import os
import sys
import pandas as pd
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def export_mongo_to_csv():
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DB', 'restart-35-platform')
    
    print(f"Connecting to MongoDB at {mongo_uri}")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['scraped_jobs']
    
    print("Querying active jobs...")
    cursor = collection.find({'isActive': True})
    jobs = list(cursor)
    print(f"Found {len(jobs)} active jobs.")
    
    if not jobs:
        print("No active jobs found. Exiting.")
        return
        
    df = pd.DataFrame(jobs)
    
    # Map fields to match jobs.csv schema
    field_mappings = {
        'scrapedJobId': 'id',
        'sourceUrl': 'job_url',
        'scrapedAt': 'scraped_at',
        'salaryMin': 'salary_min',
        'salaryMax': 'salary_max',
        'experienceRequired': 'experience_required',
        'educationRequired': 'education_required',
        'agePreference': 'age_preference'
    }
    
    for old_col, new_col in field_mappings.items():
        if old_col in df.columns:
            df[new_col] = df[old_col]
    
    def process_skills(skills):
        if isinstance(skills, list):
            valid_skills = [str(s).strip() for s in skills if s and str(s).strip()]
            return '|'.join(valid_skills)
        return str(skills) if pd.notna(skills) else ''
        
    if 'skills' in df.columns:
        df['skills'] = df['skills'].apply(process_skills)
        
    output_columns = [
        'id', 'title', 'company', 'skills', 'location', 
        'salary_min', 'salary_max', 'type', 'age_preference', 
        'experience_required', 'education_required', 'description', 
        'category', 'source', 'job_url', 'scraped_at'
    ]
    
    for col in output_columns:
        if col not in df.columns:
            df[col] = ''
            
    df_out = df[output_columns]
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '..', 'data', 'jobs.csv')
    output_path = os.path.normpath(output_path)
    
    print(f"Saving to {output_path}...")
    df_out.to_csv(output_path, index=False, encoding='utf-8')
    print("Saved successfully.")
    
    try:
        api_port = os.getenv('AI_SERVICE_PORT', '8000')
        url = f"http://localhost:{api_port}/api/v1/ai/reload-data"
        print(f"Calling API to reload data: {url}")
        res = requests.post(url)
        if res.status_code == 200:
            print(f"API reloaded data successfully: {res.json()}")
        else:
            print(f"API returned status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"Failed to call reload API: {e}")

if __name__ == '__main__':
    export_mongo_to_csv()
