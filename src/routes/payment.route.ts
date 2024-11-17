import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { allCoupons, applyDiscount, createPaymentIntent, deleteCoupon, getCoupon, getSessionId, newCoupon, updateCoupon, verifyCashfreePayment } from '../controllers/payment.controller.js';

const app = express.Router();

// Route: /api/v1/payment/{nameOfRoute}
app.get("/discount", applyDiscount);
app.post("/coupon/new", adminOnly, newCoupon);
app.post("/create", createPaymentIntent);
app.get("/coupon/all", adminOnly, allCoupons);
app.route("/coupon/:id")
    .get(adminOnly, getCoupon)
    .put(adminOnly, updateCoupon)
    .delete(adminOnly, deleteCoupon);
app.post("/sessionId", getSessionId);
app.post("/verify", verifyCashfreePayment);

export default app;