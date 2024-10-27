import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { getBarChart, getDashboardStats, getLineChart, getPieChart } from '../controllers/stats.controller.js';

const app = express.Router();

// Route: /api/v1/dashboard/{nameOfRoute}
app.get("/stats", adminOnly, getDashboardStats);
app.get("/pie", adminOnly, getPieChart);
app.get("/bar", adminOnly, getBarChart);
app.get("/line", adminOnly, getLineChart);

export default app;