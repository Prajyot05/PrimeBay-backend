import express from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { allReviewsOfProduct, deleteProduct, deleteReview, getAdminProducts, getAllCategories, getAllProducts, getLatestProducts, getSingleProduct, newProduct, newReview, updateProduct } from '../controllers/product.controller.js';
import { multiUpload } from '../middlewares/multer.js';

const app = express.Router();

// Route: /api/v1/user/{nameOfRoute}
app.post("/new", adminOnly, multiUpload, newProduct);
app.get("/latest", getLatestProducts);
app.get("/all", getAllProducts);
app.get("/categories", getAllCategories);
app.get("/admin-products", adminOnly, getAdminProducts);
app.route("/:id")
    .get(getSingleProduct)
    .put(adminOnly, multiUpload, updateProduct)
    .delete(adminOnly, deleteProduct);

app.get("/reviews/:id", allReviewsOfProduct);
app.post("/review/new/:id", newReview);
app.delete("/review/:id", deleteReview);

export default app;