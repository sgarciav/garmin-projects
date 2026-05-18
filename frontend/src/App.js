import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './App.css';

function App() {
  const [email, setEmail] = useState(() => localStorage.getItem('garmin_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('garmin_password') || '');
  const [mfaCode, setMfaCode] = useState('');

  // step 0: Login, step 1: MFA, step 2: Dashboard
  const [step, setStep] = useState(() => Number(localStorage.getItem('garmin_step')) || 0);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password,
        mfaCode: mfaCode || undefined
      });

      if (response.data.status === 'success') {
        localStorage.setItem('garmin_email', email);
        localStorage.setItem('garmin_password', password);
        localStorage.setItem('garmin_step', '2');
        setStep(2); // Move to dashboard
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setStep(1); // Move to MFA step
        setError('MFA required. Please check your email/phone.');
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/activities', {
        email,
        password,
        startDate: '2024-01-01', // You can make this dynamic later
        activityType: 'running'
      });

      // Format dates for the chart
      const formattedData = response.data.map(act => ({
        ...act,
        date: new Date(act.startTimeLocal).toLocaleDateString()
      })).reverse(); // Reverse to show chronological order

      setActivities(formattedData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('garmin_email');
    localStorage.removeItem('garmin_password');
    localStorage.removeItem('garmin_step');
    setStep(0);
    setActivities([]);
  };

  return (
    <div className="App" style={{ padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Garmin Activity Dashboard</h1>
        {step === 2 && (
          <button onClick={handleLogout} style={{ padding: '5px 10px', height: '35px' }}>Logout</button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {step === 0 && (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          <div>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <br />
          <div>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <br />
          <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={handleLogin}>
          <h2>Enter MFA Code</h2>
          <div>
            <input type="text" placeholder="MFA Code" value={mfaCode} onChange={e => setMfaCode(e.target.value)} required />
          </div>
          <br />
          <button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Submit MFA'}</button>
        </form>
      )}

      {step === 2 && (
        <div>
          <h2>Welcome!</h2>
          <button onClick={fetchActivities} disabled={loading}>
            {loading ? 'Loading...' : 'Fetch Running Activities'}
          </button>

          {activities.length > 0 && (
            <div style={{ width: '100%', height: 400, marginTop: '40px' }}>
              <h3>Running Distance (Miles)</h3>
              <ResponsiveContainer>
                <LineChart data={activities} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="distance_mi" stroke="#8884d8" activeDot={{ r: 8 }} name="Distance (mi)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
