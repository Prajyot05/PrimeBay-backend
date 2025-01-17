import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    shippingInfo: {
        address:{
            type: String,
            required: [true, "Please enter Address"]
        },
        city:{
            type: String,
            required: [true, "Please enter City"]
        },
        state:{
            type: String,
            required: [true, "Please enter State"]
        },
        country:{
            type: String,
            required: [true, "Please enter Country"]
        },
        pinCode:{
            type: Number,
            required: [true, "Please enter Pin Code"]
        },
        phone:{
            type:Number,
            required:[true, "Please enter Mobile Number"]
        }
    },

    user: {
        type: String,
        ref: "User",
        required: [true, "Please enter User ID"]
    },

    orderType: {
        type: String,
        enum : ['COD','PREPAID'],
        default: 'PREPAID'
    },

    subTotal: {
        type: Number,
        required: [true, "Please enter Sub Total"]
    },

    tax: {
        type: Number,
        required: [true, "Please enter Tax"]
    },

    shippingCharges: {
        type: Number,
        required: [true, "Please enter Shipping Charges"],
        default: 0
    },

    discount: {
        type: Number,
        required: [true, "Please enter Discount"],
        default: 0
    },

    total: {
        type: Number,
        required: [true, "Please enter Total"]
    },

    status: {
        type: String,
        enum:["Processing", "Shipped", "Delivered"],
        default: "Processing"
    },

    orderItems: [{
        name: String,
        photo: String,
        price: Number,
        quantity: Number,
        productID: {
            type: mongoose.Types.ObjectId,
            ref: "Product"
        }
    }]
}, {timestamps: true});

export const Order = mongoose.model("Order", schema);