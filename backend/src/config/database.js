import mongoose from "mongoose";
import { config } from "./config.js";
import { logger } from "../utils/logger.js";

async function connectDB(){
    try{
        await mongoose.connect(config.MONGODB_URI);
        logger.info("database_connected");
    } catch (error) {
        logger.fatal("database_connection_failed", {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
        });
        process.exit(1);
    }
}

export default connectDB
