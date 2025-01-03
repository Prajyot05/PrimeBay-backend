import express from 'express';
import { connectDB, getOrCreateOrderStatus } from './utils/features.js';
import { errorMiddleware } from './middlewares/error.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import NodeCache from 'node-cache';
import {config} from 'dotenv';
import morgan from 'morgan';
import Stripe from 'stripe';
import cors from 'cors';
import {v2 as cloudinary} from 'cloudinary';
import {Cashfree} from 'cashfree-pg';

// Importing Routes
import userRoute from './routes/user.route.js';
import productRoute from './routes/products.route.js';
import orderRoute from './routes/orders.route.js';
import paymentRoute from './routes/payment.route.js';
import adminRoute from './routes/admins.route.js';

config({
    path: "./.env"
})

// Basic variables confid
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI || "";
const stripeKey = process.env.STRIPE_KEY || "";
const clientURL = process.env.CLIENT_URL || "";
const webURL = process.env.WEB_URL || "";
const appURL = process.env.APP_URL || "";

connectDB(mongoURI);

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

// Cashfree config
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
Cashfree.XEnableErrorAnalytics = false;

export const stripe = new Stripe(stripeKey);
export const myCache = new NodeCache();

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(morgan("dev"));

// app.use(
//     cors({
//     origin: [clientURL],
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
//     credentials: true
// }));

const allowedOrigins = [clientURL, webURL, appURL];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        credentials: true,
    })
);

app.get("/", (req, res) => {
    res.send("API is Working with /api/v1");
})

// Create HTTP server for Express and Socket.IO
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: clientURL,
        methods: ["GET", "PATCH"]
    }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Using Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", adminRoute);

app.use("/uploads", express.static("uploads")); // Whenever I go to /uploads/anything route, it opens image from 'uploads' folder
app.use(errorMiddleware);

let globalOrderStatus = true;

const fetchOrderStatusForUser = async () => {
    try {
        // const orderStatusInfo = await getOrCreateOrderStatus(userId);
        // globalOrderStatus = orderStatusInfo.orderStatus;
        const tempId1 = "EYWbhGJsw2VranumeCuzcK8TOPE2";
        const orderStatusInfo1 = await getOrCreateOrderStatus(tempId1);
        const tempId2 = "KchqAhyr72bJNEPXSuRUWhsOgR22";
        const orderStatusInfo2 = await getOrCreateOrderStatus(tempId2);
        const tempId3 = "Pd6zWGkSjLTh8IpOobO35dbA2IJ2";
        const orderStatusInfo3 = await getOrCreateOrderStatus(tempId3);
        const tempId4 = "Fs7NfKSvp8XV6qhFLQ6WyjfOwLv1";
        const orderStatusInfo4 = await getOrCreateOrderStatus(tempId4);

        const finalValue = orderStatusInfo1.orderStatus && orderStatusInfo2.orderStatus && orderStatusInfo3.orderStatus && orderStatusInfo4.orderStatus;
        // console.log("Initial Value: ", finalValue);
        
        globalOrderStatus = finalValue;
    } catch (error) {
        console.error("Error fetching initial store status:", error);
        return null;
    }
};

io.on("connection", (socket) => {
    fetchOrderStatusForUser();
    // console.log("New client connected");

    // Send the current order status to the newly connected client
    socket.emit("orderStatusUpdate", globalOrderStatus);
    // console.log('ORDER STATUS: ', globalOrderStatus);

    // Listen for admin updates to order status
    socket.on("updateOrderStatus", (newStatus) => {
        globalOrderStatus = newStatus;

        // Broadcast the new status to all connected clients
        io.emit("orderStatusUpdate", globalOrderStatus);
    });

    socket.on("disconnect", () => {
        // console.log("Client disconnected");
    });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});