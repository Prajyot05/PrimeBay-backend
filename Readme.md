# PrimeBay Ecommerce Backend

This is the backend repository for the **MERN Stack Ecommerce** project. It provides the API and server-side logic needed to manage products, users, orders, and payments for an online store.

## Table of Contents

- [Project Overview](#project-overview)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Installation](#installation)
- [Environment Variables](#environment-variables)

## Project Overview

This project provides a robust backend for an ecommerce platform built with the MERN (MongoDB, Express, React, Node.js) stack. The backend handles authentication, user management, product management, orders, and payments.

## Technologies Used

- **Node.js** - Server-side JavaScript runtime
- **Express** - Web framework for Node.js
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling tool
- **JWT** - JSON Web Token for user authentication
- **bcrypt** - Password hashing
- **Stripe** - Payment processing

## Features

- User authentication and authorization (JWT)
- User roles (admin and customer)
- CRUD operations for products, users, and orders
- Payment integration (Stripe)
- Secure password handling

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/your-repo-name.git

2. Navigate to the project directory:
    ```bash
    cd your-repo-name

2. Install dependencies:
    ```bash
    npm install

## Environment Variables
Create a .env file in the root directory and add the following environment variables:

    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    PAYMENT_SECRET=your_payment_provider_secret
    PORT=5000

## Start the server:

    npm start