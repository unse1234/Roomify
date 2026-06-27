import express from "express";
import connectDB from "./config/database.js";
const app = express();
connectDB();

export default app;
