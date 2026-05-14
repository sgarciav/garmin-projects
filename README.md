# Garmin Projects

Let's use [Monkey
C](https://developer.garmin.com/connect-iq/connect-iq-basics/getting-started/)
to code some apps for the Garmin watch.

# Projects

### 200m Average

**Type**: Data Field

For track workouts, compute the average time per 200m.

# Data-analysis

## First Time Instructions

1. Setup directories and create/activate a python virtual environment:

        $ cd /path/to/this-repo
        $ python3 -m venv env
        $ source env/bin/activate

1. Install the dependencies of your env:

        $ cd /path/to/this-repo
        $ pip3 install -r requirements.txt
        $ pip install garminconnect

1. Create a new React app using Node.js (create the `frontend` directory and
   make sure it's empty):

        npx create-react-app frontend

Once you initialize the app, you'll be able to interact witn `npm`:

Inside that directory, you can run several commands:

    npm start
        Starts the development server.

    npm run build
        Bundles the app into static files for production.

    npm test
        Starts the test runner.

    npm run eject
      Removes this tool and copies build dependencies, configuration files
      and scripts into the app directory. If you do this, you can’t go back!

1. Install some React packages:

        cd frontend
        npm install axios recharts

## Development
