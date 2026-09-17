import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thiếu biến môi trường MONGODB_URI");
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("[db] Đã kết nối MongoDB");
}
