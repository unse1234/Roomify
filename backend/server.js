import dotenv from "dotenv";
dotenv.config();

const { default: app } = await import("./src/app.js");
const { default: connectDB } = await import("./src/config/database.js");

connectDB();
app.listen(3000, () => {
    console.log("server is running")
})