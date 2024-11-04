import mongoose from "mongoose";

const schema = new mongoose.Schema({
    comment: {
        type: String,
        maxlength: [200, "Comment must have less than 200 characters"]
    },
    rating: {
        type: Number,
        required: [true, "Please give a Rating"],
        min: [1, "Rating must be atleast 1"],
        max: [5, "Ratings cannot be greater than 5"]
    },
    user: {
        type: String,
        ref: "User",
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    }
}, {timestamps: true});

export const Review = mongoose.model("Review", schema);