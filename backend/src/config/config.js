// import dotenv from "dotenv";

// dotenv.config();

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in envoirnment variables");
}

export const config = {
  MONGODB_URI: process.env.MONGO_URI,
};
