#!/usr/bin/env python3

# system includes
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

import datetime
from datetime import timezone
import json
import logging
import os
import sys
from getpass import getpass

import readchar
import requests
from garth.exc import GarthHTTPError

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
    GarminConnectTooManyRequestsError,
)

# Configure debug logging
# logging.basicConfig(level=logging.DEBUG)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


tokenstore = os.getenv("GARMINTOKENS") or "~/.garminconnect"
tokenstore_base64 = os.getenv("GARMINTOKENS_BASE64") or "~/.garminconnect_base64"
api = None


available_tasks = {
    '1' : 'Write all activities specified since STARTDATE to CSV file',
    '2' : 'Update weekly milage of specified activity'
}

# ========================
# Copied from: https://github.com/cyberjunky/python-garminconnect/blob/master/example.py
# ========================

def get_mfa():
    """Get MFA."""
    return input("MFA one-time code: ")


def init_api(email, password):
    """Initialize Garmin API with your credentials."""

    try:
        # Using Oauth1 and OAuth2 token files from directory
        print(
            f"Trying to login to Garmin Connect using token data from directory '{tokenstore}'...\n"
        )

        filename = os.path.join(tokenstore, 'oauth1_token.json')
        if not os.path.exists(filename):
            print(f'-- File ({filename}) does not exist. Attempting to login through provided credentials.')

        # Using Oauth1 and Oauth2 tokens from base64 encoded string
        # print(
        #     f"Trying to login to Garmin Connect using token data from file '{tokenstore_base64}'...\n"
        # )
        # dir_path = os.path.expanduser(tokenstore_base64)
        # with open(dir_path, "r") as token_file:
        #     tokenstore = token_file.read()

        garmin = Garmin()
        garmin.login(tokenstore)

    except (FileNotFoundError, GarthHTTPError, GarminConnectAuthenticationError):
        # Session is expired. You'll need to log in again
        print(
            "Login tokens not present, login with your Garmin Connect credentials to generate them.\n"
            f"They will be stored in '{tokenstore}' for future use.\n"
        )
        try:
            # # Ask for credentials if not set as environment variables
            # if not email or not password:
            #     email, password = get_credentials()
            if not email or not password:
                print(f'-- No email or password provided')
                return None

            garmin = Garmin(
                email=email, password=password, is_cn=False, return_on_mfa=True
            )
            result1, result2 = garmin.login()
            if result1 == "needs_mfa":  # MFA is required
                mfa_code = get_mfa()
                garmin.resume_login(result2, mfa_code)

            # Save Oauth1 and Oauth2 token files to directory for next login
            garmin.garth.dump(tokenstore)
            print(
                f"Oauth tokens stored in '{tokenstore}' directory for future use. (first method)\n"
            )

            # Encode Oauth1 and Oauth2 tokens to base64 string and safe to file for next login (alternative way)
            token_base64 = garmin.garth.dumps()
            dir_path = os.path.expanduser(tokenstore_base64)
            with open(dir_path, "w") as token_file:
                token_file.write(token_base64)
            print(
                f"Oauth tokens encoded as base64 string and saved to '{dir_path}' file for future use. (second method)\n"
            )

            # Re-login Garmin API with tokens
            garmin.login(tokenstore)
        except (
            FileNotFoundError,
            GarthHTTPError,
            GarminConnectAuthenticationError,
            requests.exceptions.HTTPError,
        ) as err:
            logger.error(err)
            return None

    return garmin


def get_args():
    parser = argparse.ArgumentParser(description = 'Analyze Garmin data.')
    parser.add_argument('mode',
                        choices=['write', 'weekly_milage'],
                        help='Specify mode')

    parser.add_argument('-v', '--verbose', action='store_true', default=False, help='Print debug messages.')
    parser.add_argument('-e', '--email', type=str, default="sergioernesto88@gmail.com", help='User email.')
    parser.add_argument('-p', '--password', type=str, default=None, help='User password.')
    parser.add_argument('--start-date', type=str, default="2025-01-01", help='Start date of analysis in format YYYY-MM-DD.')

    parser.add_argument('--activity-type', type=str, default="running", help='Options: running, swimming, walking, cycling.')
    # parser.add_argument('--activity-types', metavar='N', nargs='+', type=str, default='running', help='Options: running, swimming, walking, cycling.')

    return parser.parse_args()


def dateStrToDatetime(date_str):
    ds = date_str.split("-")
    return datetime.date(int(ds[0]), int(ds[1]), int(ds[2]))


def print_available_tasks():
    for i in available_tasks:
        print(i)


def main(args):


    # Connect to the API
    api = init_api(args.email, args.password)
    if api is None:
        print("-- An error occurred while initializing the API")
        return

    # Determine time perid
    startdate = dateStrToDatetime(args.start_date)
    enddate = datetime.date.today()

    # # set the start and end date nine months apart
    # activity_start_date = datetime.date(2025, 1, 1)
    # activity_end_date = datetime.date(2025, 2, 10)

    # TODO: This should be a for loop to group all acitivies specified.

    # Call the api and create a list of activities from that timeframe
    activities = api.get_activities_by_date(
        startdate.isoformat(),
        enddate.isoformat(),
        args.activity_type
    )

    activities_df = pd.DataFrame(activities)

    # Select columns of interest
    activities_df_filtered = activities_df[[
        'activityId','startTimeLocal','activityType','distance','averageHR','maxHR'
    ]]

    # Create new column showing distance in miles
    activities_df_filtered['distance_mi'] = activities_df_filtered['distance'].apply(lambda x: x/1609)

    # Update activityType column to only contain activity type name
    activities_df_filtered.loc[:, 'activityType'] = activities_df_filtered['activityType'].apply(lambda x: x['typeKey'])

    # Create new column showing duration as hours instead of seconds
    activities_df_filtered['distance_mi'] = activities_df_filtered['distance'].apply(lambda x: x/1609)

    # Select task
    # ------------------------
    if args.tasks == 'p':
        print_available_tasks()
    elif args.tasks == 1:
        filename = str(arsg.activity_type) + '_activities-' + str(startdate) + ':' + str(enddate) + '.csv'
        activities_df.to_csv(filename, index=False)
    # elif selected_task == "":
    else:
        print(f'Task [{task[selected_task]}] is not currently implemented.')
        return

    # # Plot the graph
    # plt.bar(activities_df_filtered.startTimeLocal,
    #         activities_df_filtered.distance_mi, color='b')
    # plt.set_xlabel('Date')
    # plt.set_ylabel('Distance [mi]')
    # plt.xticks(rotation=90)

    # # Show the plot
    # plt.show()


if __name__ == '__main__':
    main(get_args())
