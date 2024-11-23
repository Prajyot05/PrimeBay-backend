import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { Product } from "../models/product.model.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";
import { deleteFromCloudinary, findAverageRatings, invalidateCache, uploadToCloudinary } from "../utils/features.js";
import { Types } from "mongoose";
import { User } from "../models/user.model.js";
import { Review } from "../models/review.model.js";

export const getLatestProducts = TryCatch(async (req, res, next) => {

    let products;

    if(myCache.has("latest-product")) products = JSON.parse(myCache.get("latest-product") as string);
    
    else{
        products = await Product.find({}).sort({createdAt: -1}); //.limit(10)
        myCache.set("latest-product", JSON.stringify(products));
    }

    return res.status(200).json({
        success: true,
        products
    });
});

export const getAllCategories = TryCatch(async (req, res, next) => {

    let categories;

    if(myCache.has("categories")) categories = JSON.parse(myCache.get("categories") as string);
    
    else{
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories));
    }
    
    return res.status(200).json({
        success: true,
        categories
    });
});

export const getAdminProducts = TryCatch(async (req, res, next) => {

    let products;

    if(myCache.has("all-products")) products = JSON.parse(myCache.get("all-products") as string);
    
    else{
        products = await Product.find({});
        myCache.set("all-products", JSON.stringify(products));
    }
    
    return res.status(200).json({
        success: true,
        products
    });
});

export const getSingleProduct = TryCatch(async (req, res, next) => {

    let product;
    const id = req.params.id;

    if(myCache.has(`product-${id}`)) product = JSON.parse(myCache.get(`product-${id}`) as string);
    
    else{
        product = await Product.findById(id);
        myCache.set(`product-${id}`, JSON.stringify(product));
    }
        
    if(!product) return next(new ErrorHandler("Product not found", 404));

    return res.status(200).json({
        success: true,
        product,
    });
});

export const getAllProducts = TryCatch(async (req:Request<{}, {}, {}, SearchRequestQuery>, res, next) => {

    const {search, sort, category, price} = req.query
    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = limit * (page - 1);

    const baseQuery:BaseQuery = {}

    if(search) baseQuery.name = {
        $regex:search,
        $options: 'i'
    }
    if(price) baseQuery.price = {
        $lte: Number(price),
    }
    if(category) baseQuery.category = category;

    const productsPromise = 
    Product
        .find(baseQuery)
        .sort(sort && {price: sort === 'asc' ? 1 : -1})
        .limit(limit)
        .skip(skip)

    const [products, filteredOnlyProducts] = await Promise.all([productsPromise, Product.find(baseQuery)]);  
    
    const totalPage = Math.ceil(filteredOnlyProducts.length / limit); // ceil always rounds off to the greater number
    
    return res.status(200).json({
        success: true,
        products,
        totalPage
    });
});

export const newProduct = TryCatch(async (req: Request<{}, {}, NewProductRequestBody>, res, next) => {
    const {name, category, stock, price, description} = req.body;
    const photos = req.files as Express.Multer.File[] | undefined;

    if(!photos) return next(new ErrorHandler("Please add Photos", 400));

    if(photos.length < 1) return next(new ErrorHandler("Please add atleast one Photo", 400));

    if(photos.length > 5) return next(new ErrorHandler("You can only add upto 5 Photos", 400));

    if(!name || !category || !stock || !price || !description){
        // rm(photo.path, () => {
        //     console.log("Deleted");
        // })
        return next(new ErrorHandler("Please enter all fields", 400));
    }

    const photosURL = await uploadToCloudinary(photos);

    await Product.create({
        name,
        price,
        stock,
        category: category.toLowerCase(),
        photos: photosURL,
        description
    });
    
    myCache.del("latest-product");

    await invalidateCache({product: true, admin: true});

    return res.status(201).json({
        success: true,
        message: "Product Created Successfully"
    })
});

export const updateProduct = TryCatch(async (req, res, next) => {
    const {id} = req.params
    const {name, category, stock, price, description} = req.body;
    const photos = req.files as Express.Multer.File[] | undefined;
    const product = await Product.findById(id);

    if(!product) return next(new ErrorHandler("Product not found", 404));

    if(photos && photos.length > 0){
        const photosURL = await uploadToCloudinary(photos);  
        const ids = product.photos.map((photo) => photo.public_id);   
        await deleteFromCloudinary(ids);   

        product.photos = photosURL as unknown as Types.DocumentArray<{ public_id: string; url: string }>;
        // product.photos = photosURL;
    }

    if(name) product.name = name;
    if(price) product.price = price;
    if(stock) product.stock = stock;
    if(category) product.category = category;
    if(description) product.description = description;

    await product.save();

    myCache.del("latest-product");

    await invalidateCache({product: true, productID: String(product._id), admin: true});

    return res.status(200).json({
        success: true,
        message: "Product Updated Successfully"
    })
});

export const deleteProduct = TryCatch(async (req, res, next) => {
    
    const product = await Product.findById(req.params.id);

    if(!product) return next(new ErrorHandler("Product not found", 404));

    // rm(product.photo!, () => {
    //     console.log("Product photo deleted");
    // });  

    const ids = product.photos.map((photo) => photo.public_id);
    await deleteFromCloudinary(ids);

    await product.deleteOne();

    myCache.del("latest-product");

    await invalidateCache({product: true, productID: String(product._id), admin: true});
    
    return res.status(200).json({
        success: true,
        message: "Product Deleted Successfully"
    });
});

export const newReview = TryCatch(async (req, res, next) => {

    const user = await User.findById(req.query.id);
    if(!user) return next(new ErrorHandler("Not Logged In", 404));
    
    const product = await Product.findById(req.params.id);
    if(!product) return next(new ErrorHandler("Product not found", 404)); 

    const {comment, rating} = req.body;

    const alreadyReviewed = await Review.findOne({
        user: user._id,
        product: product._id
    })

    if(alreadyReviewed){
        alreadyReviewed.comment = comment;
        alreadyReviewed.rating = rating;

        await alreadyReviewed.save();
    }
    else{
        await Review.create({
            comment,
            rating,
            user: user?._id,
            product: product._id
        });
    }

    const {ratings, numberOfReviews} = await findAverageRatings(product._id);

    product.ratings = ratings;
    product.numberOfReviews = numberOfReviews;

    await product.save();

    await invalidateCache({product: true, productID: String(product._id), admin: true});
    
    return res.status(alreadyReviewed ? 200 : 201).json({
        success: true,
        message: alreadyReviewed ? "Review Updated Successfully" : "Review Added Successfully"
    });
});

export const allReviewsOfProduct = TryCatch(async (req, res, next) => {

    const reviews = await Review.find({
        product: req.params.id
    }).populate("user", "name photo").sort({updatedAt: -1});

    return res.status(200).json({
        success: true,
        reviews
    });
});

export const deleteReview = TryCatch(async (req, res, next) => {

    const user = await User.findById(req.query.id);
    if(!user) return next(new ErrorHandler("Not Logged In", 404));

    const review = await Review.findById(req.params.id);
    if(!review) return next(new ErrorHandler("Review doesn't exist", 404));

    const isAuthenticUser = review.user.toString() === user._id.toString();
    if(!isAuthenticUser) return next(new ErrorHandler("Not Authorized", 401));

    await review.deleteOne();

    const product = await Product.findById(review.product);
    if(!product) return next(new ErrorHandler("Product Not Found", 404));

    const {ratings, numberOfReviews} = await findAverageRatings(product._id);

    product.ratings = ratings;
    product.numberOfReviews = numberOfReviews;

    await product.save();

    await invalidateCache({product: true, productID: String(product._id), admin: true});
    
    return res.status(200).json({
        success: true,
        message: "Review Deleted Successfully"
    });
});