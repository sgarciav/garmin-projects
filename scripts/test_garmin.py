from garminconnect import Garmin
import datetime
import os

# Replace with your actual Garmin credentials
EMAIL = "sergioernesto88@gmail.com"
PASSWORD = "" # todo: argparse
TOKEN_STORE_DIR = os.path.expanduser("~/.garminconnect")

def test_fetch():
    try:
        print("Initializing Garmin client...")
        garmin = Garmin(EMAIL, PASSWORD)

        print("Attempting to login...")
        os.makedirs(TOKEN_STORE_DIR, exist_ok=True)
        garmin.login(TOKEN_STORE_DIR)
        print("Login successful!")

        print("Fetching activities...")
        start_date = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
        end_date = datetime.date.today().isoformat()

        # Fetch running activities from the last 30 days
        activities = garmin.get_activities_by_date(start_date, end_date, "running")

        print(f"Found {len(activities)} activities.")
        if activities:
            print("First activity data:")
            print(activities[0])

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_fetch()
