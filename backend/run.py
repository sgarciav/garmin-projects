from flask import Flask, request, jsonify, session
from flask_cors import CORS
from garminconnect import Garmin, GarminConnectAuthenticationError
import pandas as pd
import datetime
import os

app = Flask(__name__)
app.secret_key = "super_secret_key" # Needed for Flask sessions
CORS(app, supports_credentials=True)

TOKEN_STORE_DIR = os.path.expanduser("~/.garminconnect")
os.makedirs(TOKEN_STORE_DIR, exist_ok=True)

# Global variable to temporarily hold the MFA callback context (for simplicity in single-user dev)
mfa_context = {}

def mfa_callback():
    """This is triggered by the Garmin library if MFA is required."""
    # We raise a custom exception to catch it in the route and tell the frontend
    raise Exception("MFA_REQUIRED")

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    mfa_code = data.get('mfaCode')

    try:
        # Initialize Garmin client with token storage
        # garmin = Garmin(email, password, is_mfa_prompt=lambda: mfa_code)
        garmin = Garmin(email, password)

        # If we have a token directory, it will try to use it automatically
        garmin.login(TOKEN_STORE_DIR)

        return jsonify({"status": "success", "message": "Logged in successfully"})

    except Exception as e:
        if str(e) == "MFA_REQUIRED" or "mfa" in str(e).lower():
            return jsonify({"status": "mfa_required", "message": "Please enter MFA code"}), 401
        return jsonify({'error': str(e)}), 500

@app.route('/api/activities', methods=['POST'])
@app.route('/api/activities', methods=['POST'])
def get_activities():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    start_date = data.get('startDate', '2024-01-01')
    activity_type = data.get('activityType', 'running')

    try:
        print("1. Authenticating...")
        garmin = Garmin(email, password)
        garmin.login(TOKEN_STORE_DIR)

        print(f"2. Fetching activities from {start_date}...")
        end_date = datetime.date.today().isoformat()
        activities = garmin.get_activities_by_date(start_date, end_date, activity_type)

        if not activities:
            print("No activities found.")
            return jsonify([])

        print(f"3. Found {len(activities)} activities. Processing with Pandas...")
        df = pd.DataFrame(activities)

        desired_columns = ['activityId', 'startTimeLocal', 'activityType', 'distance', 'averageHR', 'maxHR']
        df_filtered = df.reindex(columns=desired_columns).copy()

        print("4. Calculating distance...")
        df_filtered['distance_mi'] = df_filtered['distance'].apply(lambda x: x / 1609.34 if pd.notnull(x) else 0)

        print("5. Parsing activity type...")
        df_filtered['activityType'] = df_filtered['activityType'].apply(lambda x: x['typeKey'] if isinstance(x, dict) else x)

        print("6. Cleaning up NaNs...")
        # Using a safer method to replace NaNs for JSON serialization
        import numpy as np
        df_filtered = df_filtered.replace({np.nan: None})

        print("7. Sending response...")
        return jsonify(df_filtered.to_dict(orient='records'))

    except Exception as e:
        import traceback
        print("ERROR OCCURRED:")
        traceback.print_exc() # This will print the exact line that failed in your terminal
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
