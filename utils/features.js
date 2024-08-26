import { userSocketIds } from "../socket.js";

export const GetSockets = (user = []) => {
  const sockets = user.map((user) => userSocketIds.get(user.toString()));

  return sockets;
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");

  const userSockets = GetSockets(users);
  io.to(userSockets).emit(event, data);


};
