import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Admin } from "../models/admin.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { calculatePercentage, getCharData, getInventories, getOrCreateOrderStatus } from "../utils/features.js";

export const getDashboardStats = TryCatch(async(req, res, next) => {
    let stats = {};
    const key = "admin-stats";

    if(myCache.has(key)) stats = JSON.parse(myCache.get(key) as string);

    else{
        const today = new Date();
        const sixMonthsAgo = new Date();

        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Function to convert a date to IST and set specific hours
        const toIST = (date: Date) => {
            const istOffset = 330; // IST is UTC+5:30
            const offsetDate = new Date(date.getTime() + istOffset * 60 * 1000);
            return offsetDate;
        };

        // Set the start time of the daily window to today at 3 PM
        const last24HoursStart = toIST(new Date());
        last24HoursStart.setHours(15, 0, 0, 0);

        // If the current time is before 3 PM today, move the start time to yesterday at 3 PM
        if (today.getTime() < last24HoursStart.getTime() - 330 * 60 * 1000) {
            last24HoursStart.setDate(last24HoursStart.getDate() - 1);
        }

        // Previous 24-hour window starts 24 hours before the current window
        const prev24HoursStart = new Date(last24HoursStart);
        prev24HoursStart.setDate(prev24HoursStart.getDate() - 1);

        // End time for the previous 24-hour window
        const prev24HoursEnd = new Date(last24HoursStart);

        const last24HoursOrdersPromise = Order.find({
            createdAt: {
                $gte: last24HoursStart,
                $lte: today
            }
        });

        const prev24HoursOrdersPromise = Order.find({
            createdAt: {
                $gte: prev24HoursStart,
                $lte: prev24HoursEnd
            }
        });        

        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today
        }
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0)
        }

        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        });

        const lastMonthProductsPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        });

        const thisMonthUsersPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        });

        const lastMonthUsersPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        });

        const thisMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        });

        const lastMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        });

        const lastSixMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today
            }
        });

        const latestTransactionsPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4);

        const [thisMonthOrders, 
            thisMonthProducts, 
            thisMonthUsers, 
            lastMonthOrders, 
            lastMonthProducts, 
            lastMonthUsers,
            productsCount,
            usersCount,
            allOrders,
            lastSixMonthOrders,
            last24HoursOrders,
            prev24HoursOrders,
            categories,
            femaleUsersCount,
            latestTransactions
        ] = await Promise.all([thisMonthOrdersPromise, 
                thisMonthProductsPromise, 
                thisMonthUsersPromise, 
                lastMonthOrdersPromise, 
                lastMonthProductsPromise, 
                lastMonthUsersPromise,
                Product.countDocuments(),
                User.countDocuments(),
                Order.find({}).select("total"),
                lastSixMonthOrdersPromise,
                last24HoursOrdersPromise,
                prev24HoursOrdersPromise,
                Product.distinct("category"),
                User.countDocuments({gender: "female"}),
                latestTransactionsPromise
            ]);

        const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (order.total || 0), 0);

        const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + (order.total || 0), 0);

        const last24HoursOrdersCount = last24HoursOrders.length;
        const last24HoursRevenue = last24HoursOrders.reduce((total, order) => total + (order.total || 0), 0);

        const prev24HoursOrdersCount = prev24HoursOrders.length;
        const prev24HoursRevenue = prev24HoursOrders.reduce((total, order) => total + (order.total || 0), 0);
        
        let changePercent = {
            revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
            product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),
            user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
            order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length),
            dailyTransactions: calculatePercentage(last24HoursOrdersCount, prev24HoursOrdersCount),
            dailyRevenue: calculatePercentage(last24HoursRevenue, prev24HoursRevenue)
        }

        const revenue = allOrders.reduce((total, order) => total + (order.total || 0), 0);

        const count = {
            revenue,
            user: usersCount,
            product: productsCount,
            order: allOrders.length,
            dailyOrders: last24HoursOrdersCount,
            dailyRevenue: last24HoursRevenue
        };

        const orderMonthCounts = getCharData({length: 6, today, docArr: lastSixMonthOrders});
        const orderMonthlyRevenue = getCharData({length: 6, today, docArr: lastSixMonthOrders, property: "total"});

        const categoryCount = await getInventories({categories, productsCount});

        const userRatio = {
            male: usersCount - femaleUsersCount,
            female: femaleUsersCount
        }

        const modifiedLatestTransactions = latestTransactions.map((i) => ({
            _id: i._id,
            discount: i.discount,
            amount: i.total,
            quantity: i.orderItems.length,
            status: i.status
        }))

        stats = {
            categoryCount,
            changePercent,
            count,
            chart: {
                order: orderMonthCounts,
                revenue: orderMonthlyRevenue
            },
            userRatio,
            latestTransactions: modifiedLatestTransactions
        };

        myCache.set(key, JSON.stringify(stats));
    }

    return res.status(200).json({
        success: true,
        stats
    });
});

export const getPieChart = TryCatch(async(req, res, next) => {
    let charts;
    const key = "admin-pie-charts";

    if(myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);

    else{
        const [processingOrder, shippedOrder, deliveredOrder, categories, productsCount, productsOutOfStock, allOrders, allUsers, adminUsers, customerUsers] = await Promise.all([
            Order.countDocuments({status: "Processing"}),
            Order.countDocuments({status: "Shipped"}),
            Order.countDocuments({status: "Delivered"}),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({stock: 0}),
            Order.find({}).select(["total", "discount", "subtotal", "tax", "shippingCharges"]),
            User.find({}).select(["dob"]),
            User.countDocuments({role: "admin"}),
            User.countDocuments({role: "user"}),
        ]);

        const orderFullFillment = {
            processing: processingOrder,
            shipped: shippedOrder,
            delivered: deliveredOrder
        };

        const productCategories = await getInventories({categories, productsCount});

        const stockAvailability = {
            inStock: productsCount - productsOutOfStock,
            outOfStock: productsOutOfStock
        };

        const grossIncome = allOrders.reduce((prev, order) => prev + (order.total || 0), 0);

        const discount = allOrders.reduce((prev, order) => prev + (order.discount || 0), 0);

        const productionCost = allOrders.reduce((prev, order) => prev + (order.shippingCharges || 0), 0);

        const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0);

        const marketingCost = Math.round(grossIncome * (30 / 100));

        const netMargin = grossIncome - discount - productionCost - burnt - marketingCost;

        const revenueDistribution = {
            netMargin,
            discount,
            productionCost,
            burnt,
            marketingCost
        };

        const usersAgeGroup = {
            teen: allUsers.filter(i => i.age < 20).length,
            adult: allUsers.filter(i => i.age >= 20 && i.age < 40).length,
            old: allUsers.filter(i => i.age >= 40).length
        }

        const adminCustomer = {
            admin: adminUsers,
            customer: customerUsers
        }

        charts = {
            orderFullFillment,
            productCategories,
            stockAvailability,
            revenueDistribution,
            usersAgeGroup,
            adminCustomer
        };

        myCache.set(key, JSON.stringify(charts));
    }

    return res.status(200).json({
        success: true,
        charts
    });
});

export const getBarChart = TryCatch(async(req, res, next) => {
    let charts;
    const key = "admin-bar-charts";

    if(myCache.has("key")) charts = JSON.parse(myCache.get(key) as string);

    else{
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const sixMonthProductPromise = Product.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today
            }
        }).select("createdAt");

        const sixMonthUsersPromise = User.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today
            }
        }).select("createdAt");

        const twelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today
            }
        }).select("createdAt");

        const [products, users, orders] = await Promise.all([
            sixMonthProductPromise,
            sixMonthUsersPromise,
            twelveMonthOrdersPromise
        ]);

        const productCounts = getCharData({length: 6, today, docArr: products});
        const usersCounts = getCharData({length: 6, today, docArr: users});
        const ordersCounts = getCharData({length: 12, today, docArr: orders});
        
        charts = {
            users: usersCounts,
            products: productCounts,
            orders: ordersCounts
        };

        myCache.set(key, JSON.stringify(charts));
    }

    res.status(200).json({
        success: true,
        charts
    });
});

export const getLineChart = TryCatch(async(req, res, next) => {
    let charts;
    const key = "admin-line-charts";

    if(myCache.has("key")) charts = JSON.parse(myCache.get(key) as string);

    else{
        const today = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const twelveMonthProductsPromise = Product.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today
            }
        }).select("createdAt");

        const twelveMonthUsersPromise = User.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today
            }
        }).select("createdAt");

        const twelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today
            }
        }).select(["createdAt", "discount", "total"]);

        const [products, users, orders] = await Promise.all([
            twelveMonthProductsPromise,
            twelveMonthUsersPromise,
            twelveMonthOrdersPromise
        ]);

        const productCounts = getCharData({length: 12, today, docArr: products});
        const usersCounts = getCharData({length: 12, today, docArr: users});
        const discount = getCharData({length: 12, today, docArr: orders, property: "discount"});
        const revenue = getCharData({length: 12, today, docArr: orders, property: "total"});
        
        charts = {
            users: usersCounts,
            products: productCounts,
            discount,
            revenue
        };

        myCache.set(key, JSON.stringify(charts));
    }

    res.status(200).json({
        success: true,
        charts
    });
});

export const getOrderStatus = TryCatch(async(req, res, next) => {
    if(process.env.ADMIN_ID){
        const orderStatus = await getOrCreateOrderStatus(process.env.ADMIN_ID);

        res.status(200).json({
            success: true,
            orderStatusInfo: orderStatus.orderStatus
        });
    }
    else{
        console.log("Admin ID not found!");
    }
});

export const updateOrderStatus = TryCatch(async(req, res, next) => {
    if(process.env.ADMIN_ID){
        const { isEnabled: orderStatus } = req.body;
        console.log('ORDER STATUS: ', orderStatus)

        // console.log("Update Order Status: ", id, orderStatus);

        const updatedAdmin = await Admin.findOneAndUpdate(
            { userId: process.env.ADMIN_ID },
            { orderStatus },
            { new: true, upsert: true }
        );

        // Emit the updated order status to all connected clients
        if (req.io){
            req.io.emit("orderStatusUpdate", updatedAdmin.orderStatus);
        } else {
            // console.log("Socket.IO instance not attached to request.");
        }

        res.status(200).json({
            success: true,
            message: "Order status updated",
            orderStatus: updatedAdmin.orderStatus
        });
    }
});