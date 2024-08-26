import { NEW_MESSAGE_CAME, NEW_MESSAGE, ONLINE_USERS,LAST_MESSAGE } from "./constant.js";
import { GetSockets } from "./utils/features.js";
import { SocketAuth } from "./utils/middlewares.js";
import cookieParser from "cookie-parser";
import { Messagemodel } from "./mongoose_scheme/MessageScheme.js";

const userSocketIds = new Map();
const onlineUsers = new Set();
export const initializeSocket = (io) => {
  io.use((socket, next) => {
    cookieParser()(socket.request, socket.request.res || {}, async (err) => {
      if (err) {
        return next(new ErrorHandling("Cookie parsing error", 400));
      }
      SocketAuth(socket, next);
    });
  });

  io.on("connection", (socket) => {
    const userId = socket.user;

    onlineUsers.add(userId._id.toString());

    io.emit(ONLINE_USERS, Array.from(onlineUsers));

    userSocketIds.set(userId._id.toString(), socket.id);

    socket.on(NEW_MESSAGE_CAME, async ({ chatId, members, message }) => {
      const messageForRealTime = {
        chat: chatId,
        content: message,
        sender: {
          _id: userId._id,
          name: userId.name,
        },
      };
      const messageForDatabase = {
        chat: chatId,
        content: message,
        sender: userId._id,
      };
      //save message to database
      await Messagemodel.create(messageForDatabase);
      const userSockets = GetSockets(members);
      io.to(userSockets).emit(NEW_MESSAGE_CAME, messageForRealTime);
      io.to(userSockets).emit(NEW_MESSAGE, { chatId });
      
    });
   

    socket.on("disconnect", () => {
      userSocketIds.delete(userId._id.toString());
      onlineUsers.delete(userId._id.toString());
      io.emit(ONLINE_USERS, Array.from(onlineUsers));
      console.log("disconnected");
    });
  });

  // return io;
};
export { userSocketIds };
