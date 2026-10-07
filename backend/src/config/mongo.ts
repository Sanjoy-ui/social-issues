import mongoose from "mongoose";

let isConnected = false;

/**
 * Connect to MongoDB instance using Mongoose
 */
export const connectMongoDB = async (): Promise<typeof mongoose | null> => {
  if (isConnected) {
    return mongoose;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn(" MONGODB_URI is not set in environment variables. MongoDB connection skipped.");
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(" MongoDB connected successfully via Mongoose");
    return conn;
  } catch (error) {
    console.error(" Failed to connect to MongoDB:", error);
    return null;
  }
};

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn(" MongoDB connection disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error(" MongoDB connection error:", err);
});
