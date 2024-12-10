import mongoose, { Document } from "mongoose"
import { InvalidateCacheProps, OrderItemType } from "../types/types.js";
import { myCache } from "../app.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import {UploadApiResponse, v2 as cloudinary} from 'cloudinary';
import { Review } from "../models/review.model.js";
import crypto from 'crypto';
import { Admin } from "../models/admin.model.js";

const getBase64 = (file: Express.Multer.File) => (
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
);

export const uploadToCloudinary = async (files: Express.Multer.File[]) => {
    // const promises = [];
    // for(let i = 0; i < files.length; i++){
    //     promises.push(cloudinary.uploader.upload(getBase64(files[i])));
    // }
    // return await Promise.all(promises);
    
    const promises = files.map(async (file) => {
        return new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload(getBase64(file), (error, result) => {
                if(error) return reject(error);
                resolve(result!);
            });
        });
    });

    const result = await Promise.all(promises);

    return result.map((i) => ({
        public_id: i.public_id,
        url: i.url
    }));
};

export const deleteFromCloudinary = async (publicIds: string[]) => {
    const promises = publicIds.map((id) => {
        return new Promise<void>((resolve, reject) => {
            cloudinary.uploader.destroy(id, (error, result) => {
                if(error) return reject(error);
                resolve();
            });
        });
    });
    await Promise.all(promises);
};

export const connectDB = (uri: string) => {
    mongoose.connect(uri, {
        dbName: "Ecommerce_24"
    })
    .then(c => console.log(`DB connected to ${c.connection.host}`))
    .catch(e => console.log(e));
};

export const invalidateCache = async ({product, order, admin, userID, orderID, productID}: InvalidateCacheProps) => {
    if(product){
        const productKeys:string[] = ["latest-products", "categories", "all-products", `product-${productID}`];

        if(typeof(productID) === "string") productKeys.push(`product-${productID}`);

        if(typeof productID === "object") productID.forEach(i => productKeys.push(`product-${i}`));

        myCache.del(productKeys);
    }
    if(order){
        const orderKeys: string[] = ['all-orders', `my-orders-${userID}`, `order-${orderID}`];

        const orders = await Order.find({}).select("_id");
        orders.forEach(i => {
            orderKeys.push();
        });

        myCache.del(orderKeys);
    }
    if(admin){
        myCache.del(["admin-stats", "admin-pie-charts", "admin-bar-charts", "admin-line-charts"]);
    }
};

export const reduceStock = async (orderItems: OrderItemType[]) => {
    for(let i = 0; i < orderItems.length; i++){
        const order = orderItems[i];
        const product = await Product.findById(order.productId);
        if(!product) throw new Error("Product Not Found");
        product.stock -= order.quantity;
        await product.save();
    }
}

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if(lastMonth === 0) return thisMonth * 100;
    const percent = (thisMonth / lastMonth) * 100
    return Number(percent.toFixed(0));
};

export const findAverageRatings = async (productId: mongoose.Types.ObjectId) => {
    let totalRating = 0;

    const reviews = await Review.find({product: productId});
    reviews.forEach((review) => {
        totalRating += review.rating;
    });

    const averageRating = Math.floor(totalRating / reviews.length) || 0;
    
    return {
        ratings: averageRating,
        numberOfReviews: reviews.length
    }
};

export const getInventories = async ({categories, productsCount} : {categories : string[]; productsCount: number}) => {
    const categoriesCountPromise = categories.map((category) => Product.countDocuments({category}));

    const categoriesCount = await Promise.all(categoriesCountPromise);

    const categoryCount:Record<string, number>[] = [];

    categories.forEach((category, i) => {
        categoryCount.push(
            {
                [category] : Math.round((categoriesCount[i] / productsCount) * 100)
            }
        );
    });

    return categoryCount;
}

interface MyDocument extends Document {
    createdAt: Date;
    discount?: number;
    total?: number;
}

export const getCharData = ({length, docArr, today, property}: {length: number, docArr: MyDocument[], today: Date, property?: "discount" | "total"}) => {
    const data: number[] = new Array(length).fill(0);

    docArr.forEach(i => {
        const creationDate = i.createdAt;
        const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

        if(monthDiff < 12){
            data[length - 1 - monthDiff] += property ? i[property]! : 1;
        }
    });

    return data;
}

export const generateOrderId = () => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
  
    const hash = crypto.createHash('sha256');
    hash.update(uniqueId);
  
    const orderId = hash.digest('hex');
  
    return orderId.substr(0, 12);
}

export const getOrCreateOrderStatus = async (userId: string) => {
    if (!userId) {
        throw new Error("User ID is required.");
    }

    let orderStatusInfo = await Admin.findOne({ userId });
    if (!orderStatusInfo) {
        console.log('Creating new Entry in Admin Table...');
        orderStatusInfo = await Admin.create({ userId });
    }

    return orderStatusInfo;
};