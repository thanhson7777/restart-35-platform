"""
Test ML Models - Make Predictions on Sample Data
================================================
Run: python -m scripts.ml.test_models
"""
import pandas as pd
import numpy as np
import pickle
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Paths
PROJECT_DIR = Path(__file__).parent.parent.parent
MODEL_DIR = PROJECT_DIR / 'models'
DATA_DIR = PROJECT_DIR / 'data'


def load_models():
    """Load trained models"""
    with open(MODEL_DIR / 'unemployment_risk_model.pkl', 'rb') as f:
        risk_data = pickle.load(f)
    
    with open(MODEL_DIR / 'employment_classifier.pkl', 'rb') as f:
        employment_data = pickle.load(f)
    
    return risk_data, employment_data


def prepare_worker_features(age, gender, education, experience, region, marital, job, barrier_count):
    """Prepare feature vector from worker data"""
    # Load data to get encoders
    df = pd.read_csv(DATA_DIR / 'workers.csv')
    
    # Encode values using the same encoding from training
    gender_map = {'male': 0, 'female': 1, 'other': 2}
    edu_map = {'primary': 0, 'upper_secondary': 1, 'college': 2, 'university': 3}
    region_map = {'north': 0, 'central': 1, 'south_east': 2, 'central_highlands': 3, 'mekong': 4}
    marital_map = {'single': 0, 'married': 1, 'divorced': 2, 'widowed': 3}
    
    # Job encoding (fit from data)
    job_encoder = pd.Categorical(df['target_job'].fillna('unknown'))
    job_map = {j: i for i, j in enumerate(job_encoder.categories)}
    
    # Calculate features
    exp_ratio = experience / max(age - 18, 1)
    
    features = {
        'age': age,
        'gender_encoded': gender_map.get(gender, 0),
        'education_encoded': edu_map.get(education, 0),
        'experience_years': experience,
        'region_encoded': region_map.get(region, 0),
        'marital_encoded': marital_map.get(marital, 0),
        'job_encoded': job_map.get(job, 0),
        'barrier_count': barrier_count,
        'has_barrier': 1 if barrier_count > 0 else 0,
        'exp_ratio': exp_ratio
    }
    
    return features


def predict_unemployment_risk(model_data, features):
    """Predict unemployment risk"""
    feature_names = model_data['features']
    X = np.array([[features[f] for f in feature_names]])
    
    # Scale
    X_scaled = model_data['scaler'].transform(X)
    
    # Predict
    prob = model_data['model'].predict_proba(X_scaled)[0][1]
    risk_level = 'HIGH' if prob > 0.5 else 'LOW'
    
    return prob, risk_level


def predict_employment_status(model_data, features):
    """Predict employment status"""
    feature_names = model_data['features']
    X = np.array([[features[f] for f in feature_names]])
    
    # Predict
    prediction = model_data['model'].predict(X)[0]
    
    # Map back to label
    labels = ['employed', 'retired', 'self-employed', 'unemployed']
    return labels[prediction]


def test_with_samples():
    """Test models with sample workers"""
    print("=" * 70)
    print("  ML MODEL PREDICTION TESTING")
    print("=" * 70)
    
    # Load models
    print("\nLoading trained models...")
    risk_model, employment_model = load_models()
    print("Models loaded successfully!")
    
    # Sample test cases
    test_cases = [
        {
            'name': 'Worker 1: Young female, entry level',
            'age': 36, 'gender': 'female', 'education': 'college',
            'experience': 8, 'region': 'south_east', 'marital': 'single',
            'job': 'Nhân viên bán hàng', 'barriers': 0
        },
        {
            'name': 'Worker 2: Senior male, highly experienced',
            'age': 58, 'gender': 'male', 'education': 'university',
            'experience': 28, 'region': 'north', 'marital': 'married',
            'job': 'Kế toán / Hành chính', 'barriers': 0
        },
        {
            'name': 'Worker 3: Middle-aged with barriers',
            'age': 52, 'gender': 'other', 'education': 'primary',
            'experience': 22, 'region': 'central', 'marital': 'divorced',
            'job': 'Lao động xây dựng', 'barriers': 2
        },
        {
            'name': 'Worker 4: Near retirement',
            'age': 63, 'gender': 'female', 'education': 'primary',
            'experience': 30, 'region': 'north', 'marital': 'widowed',
            'job': 'Bảo vệ', 'barriers': 1
        },
        {
            'name': 'Worker 5: Young, educated, urban',
            'age': 38, 'gender': 'male', 'education': 'university',
            'experience': 12, 'region': 'south_east', 'marital': 'married',
            'job': 'Công nhân sản xuất', 'barriers': 0
        },
        {
            'name': 'Worker 6: Vocational training',
            'age': 42, 'gender': 'female', 'education': 'college',
            'experience': 15, 'region': 'central_highlands', 'marital': 'married',
            'job': 'Pha chế', 'barriers': 0
        }
    ]
    
    print("\n" + "-" * 70)
    print(f"{'Test Case':<45} {'Risk Prob':<12} {'Risk':<8} {'Predicted Status'}")
    print("-" * 70)
    
    for tc in test_cases:
        features = prepare_worker_features(
            tc['age'], tc['gender'], tc['education'], tc['experience'],
            tc['region'], tc['marital'], tc['job'], tc['barriers']
        )
        
        # Predict unemployment risk
        risk_prob, risk_level = predict_unemployment_risk(risk_model, features)
        
        # Predict employment status
        predicted_status = predict_employment_status(employment_model, features)
        
        print(f"\n{tc['name']}")
        print(f"  Profile: age={tc['age']}, edu={tc['education']}, exp={tc['experience']}, "
              f"region={tc['region']}, barriers={tc['barriers']}")
        print(f"  → Unemployment Risk: {risk_prob:.1%} ({risk_level})")
        print(f"  → Predicted Status: {predicted_status}")
    
    print("\n" + "=" * 70)
    print("  INTERPRETATION GUIDE")
    print("=" * 70)
    print("""
  Unemployment Risk:
    - HIGH (>50%): Worker likely to become unemployed
    - LOW  (<50%): Worker likely to maintain employment
    
  Predicted Status (multi-class):
    - employed: Currently working
    - unemployed: Without work, seeking job
    - self-employed: Running own business/freelance
    - retired: No longer working
    
  Key Risk Factors (from feature importance):
    1. exp_ratio (experience/working_years) - Most important
    2. job_encoded - Type of job matters
    3. age - Younger/older workers have different risks
    4. education_encoded - Higher education = lower risk
    5. barrier_count - More barriers = higher risk
    """)


def test_against_real_data():
    """Test models against real data from dataset"""
    print("\n" + "=" * 70)
    print("  TESTING AGAINST REAL DATA")
    print("=" * 70)
    
    df = pd.read_csv(DATA_DIR / 'workers.csv')
    
    # Calculate barrier_count from barriers column
    def count_barriers(barrier_str):
        if pd.isna(barrier_str) or barrier_str == '':
            return 0
        return len(str(barrier_str).split('|'))
    
    df['barrier_count'] = df['barriers'].apply(count_barriers)
    
    # Load models
    risk_model, employment_model = load_models()
    
    # Test on first 20 records
    print("\nComparing predictions vs actual status:\n")
    print(f"{'Worker ID':<15} {'Age':<5} {'Exp':<5} {'Actual':<15} {'Predicted':<15} {'Match'}")
    print("-" * 75)
    
    correct = 0
    for i in range(20):
        row = df.iloc[i]
        
        # Prepare features
        features = prepare_worker_features(
            row['age'], row['gender'], row['education'],
            row['experience_years'], row['region'], row['marital_status'],
            row['target_job'], row['barrier_count']
        )
        
        # Predict
        predicted_status = predict_employment_status(employment_model, features)
        actual = row['employment_status']
        match = "✓" if predicted_status == actual else "✗"
        
        if match == "✓":
            correct += 1
        
        print(f"{row['id']:<15} {row['age']:<5} {row['experience_years']:<5} "
              f"{actual:<15} {predicted_status:<15} {match}")
    
    accuracy = correct / 20 * 100
    print(f"\nAccuracy on 20 samples: {accuracy:.1f}%")


if __name__ == '__main__':
    test_with_samples()
    test_against_real_data()
    
    print("\n" + "=" * 70)
    print("  TESTING COMPLETE")
    print("=" * 70)
