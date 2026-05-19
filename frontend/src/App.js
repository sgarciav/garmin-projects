import React, { useState, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import {
  Container, Typography, TextField, Button, Box, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Card, CardContent, AppBar, Toolbar
} from '@mui/material';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

dayjs.extend(isoWeek);

function App() {
  const [email, setEmail] = useState(() => localStorage.getItem('garmin_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('garmin_password') || '');
  const [mfaCode, setMfaCode] = useState('');

  // step 0: Login, step 1: MFA, step 2: Dashboard
  const [step, setStep] = useState(() => Number(localStorage.getItem('garmin_step')) || 0);
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'month'));
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
        startDate: startDate.format('YYYY-MM-DD'),
        activityType: 'running'
      });
      setActivities(response.data);
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
    setMfaCode('');
  };

  const calendarData = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    
    const dailyDistances = {};
    activities.forEach(act => {
      // Parse the local time and get the YYYY-MM-DD string
      const dateStr = dayjs(act.startTimeLocal).format('YYYY-MM-DD');
      dailyDistances[dateStr] = (dailyDistances[dateStr] || 0) + (act.distance_mi || 0);
    });

    const sortedDates = activities.map(a => dayjs(a.startTimeLocal)).sort((a, b) => a.valueOf() - b.valueOf());
    const firstDate = sortedDates[0].startOf('isoWeek');
    const lastDate = sortedDates[sortedDates.length - 1].endOf('isoWeek');

    const weeks = [];
    let currentWeekStart = firstDate;
    
    while (currentWeekStart.valueOf() <= lastDate.valueOf()) {
      const week = {
        label: `${currentWeekStart.format('MMM D')} - ${currentWeekStart.add(6, 'day').format('MMM D')}`,
        days: []
      };
      let weekTotal = 0;
      for (let i = 0; i < 7; i++) {
        const dateStr = currentWeekStart.add(i, 'day').format('YYYY-MM-DD');
        const dist = dailyDistances[dateStr] || 0;
        week.days.push({ date: dateStr, dist });
        weekTotal += dist;
      }
      week.total = weekTotal;
      weeks.push(week);
      currentWeekStart = currentWeekStart.add(7, 'day');
    }

    // Calculate percentage difference from previous week
    for (let i = 0; i < weeks.length; i++) {
      if (i === 0 || weeks[i - 1].total === 0) {
        weeks[i].percentChange = null;
      } else {
        weeks[i].percentChange = ((weeks[i].total - weeks[i - 1].total) / weeks[i - 1].total) * 100;
      }
    }

    return weeks;
  }, [activities]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh', pb: 4 }}>
        <AppBar position="static" color="primary">
          <Toolbar>
            <DirectionsRunIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Garmin Running Dashboard
            </Typography>
            {step === 2 && (
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {(step === 0 || step === 1) && (
            <Card sx={{ maxWidth: 400, mx: 'auto', mt: 8, boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom align="center">
                  {step === 0 ? 'Login to Garmin' : 'Enter MFA Code'}
                </Typography>
                <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  {step === 0 ? (
                    <>
                      <TextField
                        label="Email"
                        type="email"
                        variant="outlined"
                        fullWidth
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                      <TextField
                        label="Password"
                        type="password"
                        variant="outlined"
                        fullWidth
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </>
                  ) : (
                    <TextField
                      label="MFA Code"
                      type="text"
                      variant="outlined"
                      fullWidth
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value)}
                      required
                    />
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                    sx={{ mt: 1 }}
                  >
                    {loading ? <CircularProgress size={24} /> : (step === 0 ? 'Login' : 'Submit MFA')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Box>
              <Paper sx={{ p: 3, mb: 4, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', boxShadow: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { variant: 'outlined' } }}
                />
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={fetchActivities} 
                  disabled={loading}
                  sx={{ height: 56, px: 4 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Fetch Activities'}
                </Button>
              </Paper>

              {calendarData.length > 0 && (
                <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                  <Table sx={{ minWidth: 650 }} aria-label="running calendar table">
                    <TableHead sx={{ backgroundColor: '#eeeeee' }}>
                      <TableRow>
                        <TableCell><strong>Week</strong></TableCell>
                        <TableCell align="center"><strong>Mon</strong></TableCell>
                        <TableCell align="center"><strong>Tue</strong></TableCell>
                        <TableCell align="center"><strong>Wed</strong></TableCell>
                        <TableCell align="center"><strong>Thu</strong></TableCell>
                        <TableCell align="center"><strong>Fri</strong></TableCell>
                        <TableCell align="center"><strong>Sat</strong></TableCell>
                        <TableCell align="center"><strong>Sun</strong></TableCell>
                        <TableCell align="center" sx={{ backgroundColor: '#e0e0e0' }}><strong>Total (mi)</strong></TableCell>
                        <TableCell align="center" sx={{ backgroundColor: '#e0e0e0' }}><strong>% Change</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calendarData.map((week, idx) => (
                        <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell component="th" scope="row" sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                            {week.label}
                          </TableCell>
                          {week.days.map((day, i) => (
                            <TableCell key={i} align="center" sx={{ color: day.dist > 0 ? 'primary.main' : 'text.disabled', fontWeight: day.dist > 0 ? 'bold' : 'normal' }}>
                              {day.dist > 0 ? day.dist.toFixed(2) : '-'}
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f9f9f9', color: week.total > 0 ? 'secondary.main' : 'inherit' }}>
                            {week.total.toFixed(2)}
                          </TableCell>
                          <TableCell align="center" sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: '#f9f9f9', 
                            color: week.percentChange > 0 ? 'success.main' : (week.percentChange < 0 ? 'error.main' : 'inherit') 
                          }}>
                            {week.percentChange !== null ? `${week.percentChange > 0 ? '+' : ''}${week.percentChange.toFixed(1)}%` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {!loading && activities.length === 0 && (
                <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 4 }}>
                  No activities found for the selected date range. Click "Fetch Activities" to load data.
                </Typography>
              )}
            </Box>
          )}
        </Container>
      </Box>
    </LocalizationProvider>
  );
}

export default App;
