import { Chatmodel } from "../mongoose_scheme/ChatScheme.js";
import { Usermodel } from "../mongoose_scheme/UserScheme.js";
import { Messagemodel } from "../mongoose_scheme/MessageScheme.js";
import { GlobalError, ErrorHandling } from "../error/error.js";
import { emitEvent } from "../utils/features.js";
import { deleteFromCloudnary, UploadToCloudnary } from "../utils/multer.js";
import {
  ALERT,
  REFETCH_CHAT,
  NEW_MESSAGE_CAME,
  NEW_MESSAGE,
} from "../constant.js";

export const newgroup = GlobalError(async (req, res, next) => {
  const { name, members } = req.body;
  if (members.length < 2) {
    return next(
      new ErrorHandling(
        "A group must have at least 2 members including you.",
        400
      )
    );
  }
  const allmembers = [...members, req.user._id];
  const newgroup = await Chatmodel.create({
    name,
    groupChat: true,
    creator: req.user._id,
    members: allmembers,
  });
  emitEvent(req, ALERT, allmembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHAT, members);//hre no need to naigate to "/"

  res
    .status(200)
    .json({ success: true, message: "Group created successfully." });
});

export const getmychat = GlobalError(async (req, res, next) => {
  const chats = await Chatmodel.find({ members: req.user._id }).populate({
    path: "members",
    model: Usermodel,
    select: "name avtar username",
  });

  const lastMessages = await Promise.all(
    chats.map(async (chat) => {
      const lastMessage = await Messagemodel.findOne({ chat: chat._id })
        .sort({ createdAt: -1 })
        .limit(1);
      return lastMessage;
    })
  );

  const transformChats = chats.map(
    ({ _id, name, members, groupChat }, index) => {
      const lastMessage = lastMessages[index];

      return {
        _id,
        name: groupChat
          ? name
          : members.find(
              (member) => member._id.toString() !== req.user._id.toString()
            ).name,
        groupChat,
        username: groupChat
          ? undefined
          : members.find(
              (member) => member._id.toString() !== req.user._id.toString()
            ).username,

        avtar: groupChat
          ? members.slice(0, 2).map(({ avtar }) => avtar.url)
          : members.reduce((accumulator, currentValue) => {
              if (currentValue._id.toString() !== req.user._id.toString()) {
                accumulator.push(currentValue.avtar.url);
              }
              return accumulator;
            }, []),

        members: members.reduce((accumulator, currentValue) => {
          if (currentValue._id.toString() !== req.user._id.toString()) {
            accumulator.push(currentValue._id);
          }
          return accumulator;
        }, []),

        lastMessage: lastMessage,
      };
    }
  );

  res.status(200).json({ success: true, chats: transformChats });
});

export const getmygroup = GlobalError(async (req, res, next) => {
  const chats = await Chatmodel.find({ creator: req.user._id }).populate({
    path: "members",
    model: Usermodel,
    select: "name avtar",
  });
  const transformGroups = chats.map(({ _id, name, members, groupChat }) => {
    return {
      _id,
      name,
      groupChat,
      avtar: members.map(({ avtar }) => avtar.url),
    };
  });
  res.status(200).json({ success: true, chats: transformGroups });
});



export const addmemberinGroup = GlobalError(async (req, res, next) => {
  const { members, groupId } = req.body;

  if (!members || !groupId || members.length === 0) {
    return next(new ErrorHandling("Members and groupId are required", 400));
  }

  const group = await Chatmodel.findById(groupId);
  if (!group) {
    return next(new ErrorHandling("Group not found", 404));
  }
  if (!group.groupChat) {
    return next(new ErrorHandling("Thsi is not a group chat", 400));
  }
  if (group.creator.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandling("You are not the creator of this group", 400)
    );
  }


  const allmembersPromise = members.map((i) => Usermodel.findById(i));
  const allmembers = await Promise.all(allmembersPromise);


  const validMembers = allmembers.filter((member) => member !== null);

  validMembers.forEach((member) => {
    if (
      !group.members.some(
        (existingMember) => existingMember.toString() === member._id.toString()
      )
    ) {
      group.members.push(member._id);
    }
  });
  if (group.members.length >= 15) {
    return next(new ErrorHandling("Group can have maximum 15 members", 400));
  }

  await group.save();

  emitEvent(
    req,
    ALERT,
    group.members,
    `You have been added to ${group.name} group`
  );
  emitEvent(req, REFETCH_CHAT, group.members); //hrere no need to navigate to "/"

  res
    .status(200)
    .json({ success: true, message: "members added successfully " });
});



export const removememberfromGroup = GlobalError(async (req, res, next) => {

  const { userId, groupId } = req.body;

  if (!userId || !groupId) {
    return next(new ErrorHandling("MembersId and groupId are required", 400));
  }
  const [group, userThatWillBeRemoved] = await Promise.all([
    Chatmodel.findById(groupId),
    Usermodel.findById(userId, "name"),
  ]);

  if (!group) return next(new ErrorHandling("Group not found", 404));

  if (!group.groupChat) {
    return next(new ErrorHandling("This is not a group chat", 400));
  }
  if (group.creator.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandling("You are not the creator of this group", 400)
    );
  }
  if (group.members.length <= 3) {
    return next(new ErrorHandling("Group must have at least 3 members", 400));
  }

  const allChatMembers = group.members.map((i) => i.toString());

  group.members = group.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await group.save();

  emitEvent(req, ALERT, group.members, {
    message: `${userThatWillBeRemoved.name} has been removed from the group`,
    groupId,
  });
  emitEvent(req, REFETCH_CHAT, allChatMembers,{chatId:groupId}); //here need to navigate to "/" only that person who is removed

  res
    .status(200)
    .json({ success: true, message: "Member removed successfully" });
});

export const leavegroup = GlobalError(async (req, res, next) => {
  const { groupid } = req.params;

  const userId = req.user._id;

  const group = await Chatmodel.findById(groupid);
  if (!group) {
    return next(new ErrorHandling("Group not found", 404));
  }

  const memberIndex = group.members.findIndex(
    (member) => member.toString() === userId.toString()
  );
  if (memberIndex === -1) {
    return next(new ErrorHandling("You are not a member of this group", 400));
  }
  group.members.splice(memberIndex, 1);

  if (group.creator.toString() === userId.toString()) {
    if (group.members.length >= 3) {
      group.creator = group.members[0];
    } else {
      await Chatmodel.deleteOne({ _id: group._id });
      return res.status(200).json({
        success: true,
        message: "Group deleted as there were no members left",
      });
    }
  }
  await group.save();

  emitEvent(req, ALERT, group.members, `You have left the group ${group.name}`);
  emitEvent(req, REFETCH_CHAT, group.members);//here need to navigate to "/"

  res
    .status(200)
    .json({ success: true, message: "You have left the group successfully" });
});
//for attachment
export const sendattachment = GlobalError(async (req, res, next) => {
  const { chatId } = req.body;
  const group = await Chatmodel.findById(chatId);
  if (!group) {
    return next(new ErrorHandling("Group not found", 404));
  }

  const file = req.files || [];
  if (file.length === 0) {
    return next(new ErrorHandling("Please attach a file", 400));
  }
  if (file.length > 5) {
    return next(
      new ErrorHandling("You can't upload more than 5 files at a time")
    );
  }
  const result = await UploadToCloudnary(file);

  const attachment = result.map(({ public_id, url }) => ({
    public_id: public_id,
    url: url,
  }));
  const forRealtime = {
    content: "",
    attachment,
    sender: { _id: req.user._id, name: req.user.username },
    chat: chatId,
  };
  const forDatabse = {
    content: "",
    attachment,
    sender: req.user._id,
    chat: chatId,
  };
  const message = await Messagemodel.create(forDatabse);

  emitEvent(req, NEW_MESSAGE_CAME, group.members, forRealtime);
  // emitEvent(req, NEW_MESSAGE, group.members, { chatId: chatId });

  res.status(200).json({ success: true, message, forRealtime });
});

//for fetching chat for sidebar
export const getchat = GlobalError(async (req, res, next) => {
  const { chatId } = req.params;

  if (req.query.populate === "true") {
    const chat = await Chatmodel.findById(chatId)
      .populate({
        path: "members",
        model: Usermodel,
        select: "name avtar",
      })
      .lean();
    if (!chat) {
      return next(new ErrorHandling("Chat not found", 404));
    }
    chat.members = chat.members.map((member) => ({
      _id: member._id,
      name: member.name,
      avtar: member.avtar.url,
    }));

    return res.status(200).json({ success: true, chat });
  } else {
    const chat = await Chatmodel.findById(chatId);
    if (!chat) {
      return next(new ErrorHandling("Chat not found", 404));
    }

    return res.status(200).json({ success: true, chat });
  }
});

export const renamegroup = GlobalError(async (req, res, next) => {
  const { name } = req.body;
  const { chatId } = req.params;
  const chat = await Chatmodel.findById(chatId);

  if (!chat) {
    return next(new ErrorHandling("Chat not found", 404));
  }
  if (!chat.groupChat) {
    return next(new ErrorHandling("This is not a group chat", 400));
  }
  if (chat.creator.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandling("You are not the creator of this group", 400)
    );
  }
  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHAT, chat.members);//here no need to navigate to "/"
  res.status(200).json({ success: true, message: "Group name updated" });
});


export const deletechat = GlobalError(async (req, res, next) => {
  const { chatId } = req.params;
  const { deletechat } = req.query;

  let message = "Messages deleted successfully";

  const chat = await Chatmodel.findById(chatId);
  if (!chat) {
    return next(new ErrorHandling("Chat not found", 404));
  }

  const members = chat.members;
  if (chat.groupChat && chat.creator.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandling("You are not the creator of this group", 400)
    );
  }

  if (!chat.groupChat && !members.includes(req.user._id.toString())) {
    return next(new ErrorHandling("You are not a member of this chat", 400));
  }

  const MessageWithAttachment = await Messagemodel.find({
    chat: chatId,
    attachment: { $exists: true, $ne: [] },
  });
  const publicIdForCloudNary = [];

  MessageWithAttachment.forEach(({ attachment }) => {
    attachment.forEach(({ public_id }) => {
      publicIdForCloudNary.push(public_id);
    });
  });
  await Promise.all([
    deleteFromCloudnary(publicIdForCloudNary),
    Messagemodel.deleteMany({ chat: chatId }),
    // chat.deleteOne(),
  ]);
  if (deletechat === "true") {
    await chat.deleteOne();
    message = "Chat deleted successfully";
    emitEvent(req, REFETCH_CHAT, members,{chatId});
  }

  if(deletechat === "false"){
    emitEvent(req, "REFETCH_MESSAGE", members);
  }


  res.status(200).json({ success: true, message: message });
});

//for convversation
export const GetConversation = GlobalError(async (req, res, next) => {
  const { chatId } = req.params;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;
  const chat = await Chatmodel.findById(chatId);
  if (!chat) {
    return next(new ErrorHandling("Chat not found", 404));
  }
  if (!chat.members.includes(req.user._id.toString())) {
    return next(new ErrorHandling("You are not a member of this chat", 400));
  }

  const [allMessages, countMessage] = await Promise.all([
    Messagemodel.find({ chat: chatId })
      .populate({
        path: "sender",
        model: Usermodel,
        select: "name avtar",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Messagemodel.countDocuments({ chat: chatId }),
  ]);
  const reversedMessages = allMessages.reverse();

  const totalPage = Math.ceil(countMessage / limit);

  res
    .status(200)
    .json({ success: true, allMessages: reversedMessages, totalPage });
});
