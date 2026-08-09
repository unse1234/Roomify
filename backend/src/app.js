import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import propertyRoutes from "./routes/property.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from './routes/review.routes.js';
import chatRoutes from './routes/chat.routes.js';
import cors from "cors";
const app = express();
app.use(cookieParser());
app.use(express.json());


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
export default app;
