import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model.js";
import { NewUserRequestBody } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "../middlewares/error.js";

export const newUser = TryCatch(
    async (req:Request<{}, {}, NewUserRequestBody>, res:Response, next:NextFunction) => {
        const {name, email, phone, photo, gender, _id, dob} = req.body;

        let user = await User.findById(_id);

        if(user) return res.status(200).json({
            success: true,
            message: `Welcome, ${user.name}`
        })

        if(!_id || !name || !phone || !email || !photo || !gender || !dob){
            return next(new ErrorHandler("Please add all fields", 400));
        }

        const phoneRegex = /^[0-9]{10}$/; // Only allows 10-digit phone numbers
        if (!phoneRegex.test(phone)) {
            return next(new ErrorHandler("Invalid phone number format", 400));
        }
    
        user = await User.create({
            name, email, phone, photo, gender, _id, dob:new Date(dob)
        });
    
        return res.status(201).json({
            success: true,
            message: `Welcome, ${user.name}`
        })
    }
);

export const getAllUsers = TryCatch(async (req, res, next) => {
    const users = await User.find({}); // Finds all users
    return res.status(200).json({
        success: true,
        users
    });
});

export const getUser = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(id);

    if(!user) return next(new ErrorHandler("Invalid ID", 400));

    return res.status(200).json({
        success: true,
        user
    });
});

export const deleteUser = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(id);

    if(!user) return next(new ErrorHandler("Invalid ID", 400));

    await user.deleteOne();

    return res.status(200).json({
        success: true,
        message: "User Deleted Successfully"
    });
});