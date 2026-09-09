require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { connectDB, getDBStatus } = require('./config/db');
const { authenticateToken } = require('./middleware/authMiddleware');
const doctorRoutes = require('./routes/doctorRoutes');
const reportRoutes = require('./routes/reportRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const authorityRoutes = require('./routes/authorityRoutes');
const authRoutes = require('./routes/authRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const patientSafetyRoutes = require('./routes/patientSafetyRoutes');

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global Authentication Token Extractor
app.use(authenticateToken);

// Basic Rate Limiting
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 verification requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'Unable to Verify',
    error: 'Too many verification requests from this IP. Please try again after 15 minutes.',
  },
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many reports submitted from this IP. Please try again later.',
  },
});

// Mount Routes with limiters
app.use('/api/auth', authRoutes);
app.use('/api/authorities', authorityRoutes);
app.use('/api/doctors/verify', verificationLimiter);
app.use('/api/doctors', doctorRoutes);
app.use('/api/reports', reportLimiter, reportRoutes);
app.use('/api/complaints', reportLimiter, complaintRoutes);
app.use('/api/patient-safety', reportLimiter, patientSafetyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', evidenceRoutes);

// Health check endpoint with DB status
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    status: 'ok',
    message: 'Health-Safe API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// Centralized 404 handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(port, () => {
  console.log(`[Health-Safe API] Server is running on port: ${port}`);
  console.log(`[Health-Safe API] Health check: http://localhost:${port}/api/health`);
});
