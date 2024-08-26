import express from "express";
const chatRoutes = express.Router();
import { newgroup,getmychat,getmygroup ,addmemberinGroup,removememberfromGroup,leavegroup,sendattachment,getchat,renamegroup,deletechat,GetConversation} from "../functions/ChatFunction.js";
import {Protecter} from "../utils/middlewares.js"
import {attachMentUpload} from "../utils/multer.js"


chatRoutes.use(Protecter)
chatRoutes.post("/newgroup",newgroup)
chatRoutes.get("/getmychat",getmychat)
chatRoutes.get("/getmygroup", getmygroup)
chatRoutes.put("/addmember", addmemberinGroup)
chatRoutes.put("/removemember", removememberfromGroup)
chatRoutes.delete("/leavegroup/:groupid", leavegroup)
//for send attachment
chatRoutes.post("/sendattachment",attachMentUpload,sendattachment)
//for get conversation
chatRoutes.get("/conversation/:chatId",GetConversation)
//for sidebar
chatRoutes.route("/:chatId").get(getchat).put(renamegroup).delete(deletechat)

export default chatRoutes;
