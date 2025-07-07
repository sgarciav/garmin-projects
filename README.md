# Garmin Projects

Let's use [Monkey
C](https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started/)
to code some apps for the Garmin watch.

# Projects

## 200m Average

**Type**: Data Field

For track workouts, compute the average time per 200m.

# Scripts

This repo also hosts some Python scripts to analyze data and get specific
information.

## First Time Instructions

1. Setup directories and create/activate a python virtual environment:

        $ cd /path/to/this-repo
        $ python3 -m venv env
        $ source env/bin/activate

2. Install the dependencies of your env:

        $ cd /path/to/this-repo
        $ pip3 install -r requirements.txt
        $ pip install garminconnect
