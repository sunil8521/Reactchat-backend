import { config } from "dotenv";
config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import { v2 as cloudinary } from "cloudinary";

//file import start..
import { ErrorHandling, ErrorMiddleware } from "./error/error.js";
//allroutes
import userRoutes from "./routes/UserRoutes.js";
import chatRoutes from "./routes/ChatRoutes.js";
import admintRoutes from "./routes/AdminRoutes.js";
//events
// import { NEW_MESSAGE_CAME, NEW_MESSAGE } from "./constant.js";
// import { GetSockets } from "./utils/features.js";
// import { SocketAuth } from "./utils/middlewares.js";

//data base
import {Messagemodel} from "./mongoose_scheme/MessageScheme.js"

import {initializeSocket} from "./socket.js"




const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:[ "http://localhost:5173","https://goss-app.netlify.app"],
    credentials: true,
    
  },
});
app.set("io",io)

const port = process.env.PORT || 3001;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:5173","https://goss-app.netlify.app"],
    credentials: true,
  })
);
app.use(cookieParser());

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
//database connected
async function Database() {
  try {
    const connectedData = await mongoose.connect(process.env.DB_URI, {
      dbName: process.env.DB_NAME,
    });
    console.log(`connected to ${connectedData.connection.host}`);
  } catch (er) {
    console.log("unable to connect database", er);
  }
}
await Database();

//for check work or not
app.get("/", (req, res) => {
  res.status(200).json({ message: "server is running!?" });
});

//allroutes
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/admin", admintRoutes);
//handle if route not present
app.all("*", (req, res, next) => {
  next(
    new ErrorHandling(
      `Can't find ${req.protocol}://${req.get("host")}${
        req.originalUrl
      } on server!`,
      404
    )
  );
});

//socket connection
initializeSocket(io);

//for error handle
app.use(ErrorMiddleware);

//server start
server.listen(port, () => {
  console.log(`running on ${port} in ${process.env.NODE_ENV} mode`);
});
// export { userSocketIds };
