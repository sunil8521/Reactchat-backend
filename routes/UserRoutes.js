import express from "express";
import {
  login,
  signup,
  getme,
  logout,
  searchuser,
  SendFriendRequest,
  Notifications,
  AcceptFriendRequest,
  GetMyFriends,
} from "../functions/UserFunction.js";
import { Protecter } from "../utils/middlewares.js";
import { Getone } from "../functions/crud/Repeter.js";
import { Usermodel } from "../mongoose_scheme/UserScheme.js";
import { avtarMentUpload } from "../utils/multer.js";
const userRoutes = express.Router();

userRoutes.post("/login", login);
userRoutes.post("/signup", avtarMentUpload, signup);
userRoutes.get("/logout", logout);
userRoutes.get("/me", Protecter, getme, Getone(Usermodel));

//search user
userRoutes.get("/search", Protecter, searchuser);
//send and accept friend request
userRoutes.post("/frindrequest", Protecter, SendFriendRequest);
userRoutes.put("/acceptrequest", Protecter, AcceptFriendRequest);
//show all request
userRoutes.get("/notifications", Protecter, Notifications);
//show all friends
userRoutes.get("/myfriends", Protecter, GetMyFriends);

export default userRoutes;
