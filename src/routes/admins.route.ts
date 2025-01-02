import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { getBarChart, getDashboardStats, getLineChart, getOrderStatus, getPieChart, updateOrderStatus } from '../controllers/admin.controller.js';

const app = express.Router();

// Route: /api/v1/dashboard/{nameOfRoute}
app.get("/stats", adminOnly, getDashboardStats);
app.get("/pie", adminOnly, getPieChart);
app.get("/bar", adminOnly, getBarChart);
app.get("/line", adminOnly, getLineChart);

app.get("/orderStatus", getOrderStatus); 
app.patch("/orderStatus", adminOnly, updateOrderStatus);

// For App
app.get("/app/stats", getDashboardStats);
app.get("/app/pie", getPieChart);
app.get("/app/bar", getBarChart);
app.get("/app/line", getLineChart);

app.get("/app/orderStatus", getOrderStatus); 
app.patch("/app/orderStatus", updateOrderStatus);

export default app;