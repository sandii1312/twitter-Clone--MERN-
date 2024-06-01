import express from "express";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";
import connectMongoDB from "./db/connectMongoDB.js";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 8000;

dotenv.config();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(cookieParser());


// console.log(process.env.MONGO_URI);

app.use("/api/auth",authRoutes);

app.listen(PORT, () => {
    console.log(`server is running on port: ${PORT}`);
    connectMongoDB();
});