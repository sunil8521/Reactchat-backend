import express from "express"
const admintRoutes=express.Router()
import {AllUsers,AllChats,AllMessages,DashBoard} from "../functions/AdminFunction.js"
import {Protecter,Restrictto} from "../utils/middlewares.js"

admintRoutes.use(Protecter)
admintRoutes.use(Restrictto("admin"))

admintRoutes.post("/verify")

admintRoutes.get("/users",AllUsers )
admintRoutes.get("/chats",AllChats )
admintRoutes.get("/messages",AllMessages )
admintRoutes.get("/dashboard", DashBoard)


export default admintRoutes