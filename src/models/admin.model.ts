import mongoose from "mongoose";

const schema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "User",
        required: true
    },
    orderStatus: {
        type: Boolean,
        default: true
    }
}, {timestamps: true});

export const Admin = mongoose.model("Admin", schema);