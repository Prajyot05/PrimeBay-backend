import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { OrderItemType, ShippingInfoType } from "../types/types.js";
import { generateOrderId } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import {Cashfree} from 'cashfree-pg';

// export const createPaymentIntent = TryCatch(async(req, res, next) => {
//     const {amount} = req.body;

//     if(!amount) return next(new ErrorHandler("Please Enter Amount", 400));

//     const paymentIntent = await stripe.paymentIntents.create({amount: Number(amount) * 100, currency: "inr"});

//     return res.status(201).json({
//         success: true,
//         clientSecret: paymentIntent.client_secret
//     });
// });

export const createPaymentIntent = TryCatch(async (req, res, next) => {
    const { id } = req.query;
  
    const user = await User.findById(id).select("name");
  
    if (!user) return next(new ErrorHandler("Please login first", 401));
  
    const {
      items,
      shippingInfo,
      coupon,
    }: {
      items: OrderItemType[];
      shippingInfo: ShippingInfoType | undefined;
      coupon: string | undefined;
    } = req.body;
  
    if (!items) return next(new ErrorHandler("Please send items", 400));
  
    if (!shippingInfo)
      return next(new ErrorHandler("Please send shipping info", 400));
  
    let discountAmount = 0;
  
    if (coupon) {
      const discount = await Coupon.findOne({ code: coupon });
      if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));
      discountAmount = discount.amount;
    }
  
    const productIDs = items.map((item) => item.productId);
  
    const products = await Product.find({
      _id: { $in: productIDs },
    });
  
    const subtotal = products.reduce((prev, curr) => {
      const item = items.find((i) => i.productId === curr._id.toString());
      if (!item) return prev;
      return curr.price * item.quantity + prev;
    }, 0);
  
    const tax = subtotal * 0.18;
  
    const shipping = subtotal > 1000 ? 0 : 200;
  
    const total = Math.floor(subtotal + tax + shipping - discountAmount);
  
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100,
      currency: "inr",
      description: "PrimeBay",
      shipping: {
        name: user.name,
        address: {
          line1: shippingInfo.address,
          postal_code: shippingInfo.pinCode.toString(),
          city: shippingInfo.city,
          state: shippingInfo.state,
          country: shippingInfo.country,
        },
      },
    });
  
    return res.status(201).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
});

export const newCoupon = TryCatch(async(req, res, next) => {
    const {code, amount} = req.body;

    if(!code || !amount) return next(new ErrorHandler("Please Enter both Coupon and Amount", 400));

    await Coupon.create({code: code, amount})

    return res.status(201).json({
        success: true,
        message: `Coupon ${code} Created Successfully`
    })
});

export const applyDiscount = TryCatch(async(req, res, next) => {
    const {coupon} = req.query;

    const discount = await Coupon.findOne({code: coupon});

    if(!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));

    return res.status(200).json({
        success: true,
        discount: discount.amount
    })
});

export const allCoupons = TryCatch(async(req, res, next) => {
    const coupons = await Coupon.find({});

    return res.status(200).json({
        success: true,
        coupons
    })
});

// export const getCoupon = TryCatch(async(req, res, next) => {
    
//     const {id} = req.params;

//     const {code, amount} = req.body;

//     const coupon = await Coupon.findById(id);

//     if(!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

//     return res.status(200).json({
//         success: true,
//         coupon
//     })
// });

export const getCoupon = TryCatch(async (req, res, next) => {
    const { id } = req.params;
  
    const coupon = await Coupon.findById(id);
  
    if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));
  
    return res.status(200).json({
      success: true,
      coupon,
    });
});

export const updateCoupon = TryCatch(async(req, res, next) => {
    
    const {id} = req.params;

    const {code, amount} = req.body;

    const coupon = await Coupon.findById(id);

    if(!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

    if(code) coupon.code = code;
    if(amount) coupon.amount = amount;

    await coupon.save();

    return res.status(200).json({
        success: true,
        message: `Coupon ${coupon?.code} Updated Successfully`
    })
});

export const deleteCoupon = TryCatch(async(req, res, next) => {
    
    const {id} = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if(!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

    return res.status(200).json({
        success: true,
        message: `Coupon ${coupon?.code} Deleted Successfully`
    })
});

export const getSessionId = TryCatch(async(req, res, next) => {
  console.log('here');
  const {
    shippingInfo,
    orderItems,
    subTotal,
    tax,
    discount,
    shippingCharges,
    total,
    user
  } = req.body;

  const request = {
    order_amount: total,
    order_currency: "INR",
    order_id: await generateOrderId(),
    customer_details: {
      customer_id: user._id,
      customer_phone: "+919420902892",
      customer_name: user.name,
      customer_email: user.email,
    },
    shipping_address: shippingInfo,
    order_notes: {
      items: JSON.stringify(orderItems),
      sub_total: subTotal,
      tax: tax,
      discount: discount,
      shipping_charges: shippingCharges,
    }
  };

  console.log('request', request);

  Cashfree.PGCreateOrder("2023-08-01", request).then(response => {
    res.json(response.data);
  }).catch(error => {
      console.error(error.response.data.message);
  })
});

export const verifyCashfreePayment = TryCatch(async (req, res, next) => {
  const { orderId } = req.body;
  console.log("ORDER ID IN BACKEND: ", orderId);

  // Cashfree.PGOrderFetchPayments("2024-12-02", orderId)
  Cashfree.PGOrderFetchPayments("2023-08-01", orderId)
      .then((response) => {
          const paymentStatus = response.data;

          console.log("PAYMENT STATUS: ", paymentStatus);

          // Emit a success event if payment is successful
          // if (paymentStatus.some((transaction) => transaction.payment_status === "SUCCESS")) {
          //   if (req.io) {
          //     req.io.emit("transaction_completed", {
          //         orderId,
          //         status: "SUCCESS",
          //         timestamp: new Date().toISOString(),
          //     });
          //   }          

          //   return res.json({
          //       success: true,
          //       message: "Payment successful",
          //       data: paymentStatus,
          //   });
          // }

          // Handle other payment statuses
          // if (req.io) {
          //   req.io.emit("transaction_failed", {
          //       orderId,
          //       status: "FAILED",
          //       timestamp: new Date().toISOString(),
          //   });
          // }

          // return res.json({
          //     success: false,
          //     message: "Payment failed or still processing",
          //     data: paymentStatus,
          // });
          return res.json({
                success: true,
                message: "Payment completed",
                data: paymentStatus,
          });
      })
      .catch((error) => {
          console.error("Cashfree Verify Error: ", error);

          // Emit an error event for payment failure
          // if (req.io) {
          //   req.io.emit("transaction_failed", {
          //       orderId,
          //       status: "ERROR",
          //       error: error.message,
          //       timestamp: new Date().toISOString(),
          //   });
          // }

          next(new ErrorHandler("Payment verification failed", 500));
      });
});