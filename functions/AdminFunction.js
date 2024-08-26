import { ErrorHandling, GlobalError } from "../error/error.js";
import { Usermodel } from "../mongoose_scheme/UserScheme.js";
import { Chatmodel } from "../mongoose_scheme/ChatScheme.js";
import { Messagemodel } from "../mongoose_scheme/MessageScheme.js";
// export const verify=GlobalError(async(req, res, next)=>{
//     const {email}=req.body
//     const user=await Usermodel.findOne({email})
//     if(user){
//         return next(new ErrorHandling("user already exist",400))
//     }
//     next()
// })

export const AllUsers = GlobalError(async (req, res, next) => {
  const allUsers = await Usermodel.find();
  if (!allUsers) return next(new ErrorHandling("no users found", 400));

  const users = await Promise.all(
    allUsers.map(async ({ _id, name, avtar, username, email }) => {
      const friends = await Chatmodel.countDocuments({
        groupChat: false,
        members: _id,
      });
      const groups = await Chatmodel.countDocuments({
        groupChat: true,
        members: _id,
      });

      return {
        _id,
        name,
        username,
        email,
        avtar: avtar.url,
        friends,
        groups,
      };
    })
  );
  res.status(200).json({ users });
});

export const AllChats = GlobalError(async (req, res, next) => {
  const allChats = await Chatmodel.find()
    .populate({
      path: "members",
      model: Usermodel,
      select: "name avtar",
    })
    .populate({
      path: "creator",
      model: Usermodel,
      select: "name avtar",
    });
  const chats = await Promise.all(
    allChats.map(async ({ _id, name, creator, members }) => {
      const allMember = members.map(({ _id, name, avtar }) => ({
        _id,
        name,
        avtar: avtar.url,
      }));

      const messages = await Messagemodel.countDocuments({
        chat: _id,
      });
      return {
        _id,
        name: name ? name : "Personal chat",
        creator: creator
          ? { _id: creator._id, name: creator.name, avtar: creator.avtar.url }
          : undefined,
        allMember,
        totalmembers: allMember.length,
        messages,
      };
    })
  );
  res.status(200).json({ chats });
});

export const AllMessages = GlobalError(async (req, res, next) => {
  const allMessages = await Messagemodel.find()
    .populate({
      path: "sender",
      model: Usermodel,
      select: "name avtar",
    })
    .populate({
      path: "chat",
      model: Chatmodel,
      select: "name groupChat",
    });

  const messages = await Promise.all(
    allMessages.map(
      async ({ _id, content, sender, chat, attachment, createdAt }) => {
        return {
          _id,
          content,
          attachment,
          sender: {
            _id: sender._id,
            name: sender.name,
            avtar: sender.avtar.url,
          },
          chat: {
            _id: chat._id,
            name: chat.name ? chat.name : "Personal chat",
            groupChat: chat.groupChat ? chat.groupChat : false,
          },
          createdAt,
        };
      }
    )
  );
  res.status(200).json({ messages });
});

export const DashBoard = GlobalError(async (req, res, next) => {
  const [userCount, groupCount, messageCount, totalChat] = await Promise.all([
    Usermodel.countDocuments(),
    Chatmodel.countDocuments({ groupChat: true }),
    Messagemodel.countDocuments(),
    Chatmodel.countDocuments(),
  ]);
  const today=new Date()
  const last7=new Date()
  last7.setDate(last7.getDate()-7)


  const last7Messages=await Messagemodel.find({
    createdAt:{$gte:last7,$lte:today}
  }).select("createdAt")

  const messages=new Array(7).fill(0)
  const TF=1000*60*60*24
  last7Messages.forEach((message)=>{
    
    const index=Math.floor((message.createdAt.getTime()-last7.getTime())/TF)
    messages[6-index]+=1
  })

  const start = {
    userCount,
    groupCount,
    messageCount,
    totalChat,
    messages
  };

  res.status(200).json(start);
});
