import { Usermodel } from "../mongoose_scheme/UserScheme.js";
import { Chatmodel } from "../mongoose_scheme/ChatScheme.js";
import { Requestmodel } from "../mongoose_scheme/RequestScheme.js";
import { ErrorHandling, GlobalError } from "../error/error.js";
import { CookieOption, tokenRespone } from "../utils/jwt.js";
import { NEW_REQUEST, REFETCH_CHAT } from "../constant.js";
import { emitEvent } from "../utils/features.js";
import { UploadToCloudnary } from "../utils/multer.js";

export const login = GlobalError(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return next(
      new ErrorHandling("Please provide username and password!", 400)
    );
  }
  const existuser = await Usermodel.findOne({ username }).select("+password");
  if (
    !existuser ||
    !(await existuser.Checkpassword(password, existuser.password))
  ) {
    return next(new ErrorHandling("Incorrect username or password!", 401));
  }
  tokenRespone(200, res, existuser);
});

export const signup = GlobalError(async (req, res, next) => {
  const file = req.file;
  if (!file) return next(new ErrorHandling("Please upload avtar", 400));

  const result = await UploadToCloudnary([file]);
  const avtar = {
    public_id: result[0].public_id,
    url: result[0].secure_url,
  };

  const newuser = await Usermodel.create({
    ...req.body,
    avtar: avtar,
  });
  tokenRespone(201, res, newuser);
});

export const getme = (req, res, next) => {
  req.params.Id = req.user.id;
  next();
};

export const logout = (req, res, next) => {
  res
    .status(200)
    .cookie("jwt", "", { ...CookieOption, maAgee: 0 })
    .json({
      success: true,
      message: "Logged out successfully.",
    });
};

export const searchuser = GlobalError(async (req, res, next) => {
  const { Name } = req.query;

  const myChat = await Chatmodel.find({
    groupChat: false,
    members: req.user._id,
  });
  const allUserFromMyChat = myChat.flatMap((chat) =>
    chat.members.filter((member) => !member.equals(req.user._id))
  );

  // const allUserFromMyChat = [...new Set(myChat.flatMap((chat) => chat.members.map(member => member.toString())))];

  const allUsersExpectMeAndFriends = await Usermodel.find({
    _id: { $nin: [...allUserFromMyChat, req.user._id] },
    name: { $regex: Name, $options: "i" },
  });

  const user = allUsersExpectMeAndFriends.map(({ _id, name, avtar }) => ({
    _id,
    name,
    avtar: avtar.url,
  }));

  res.status(200).json(user);
});

export const SendFriendRequest = GlobalError(async (req, res, next) => {
  const { recever } = req.body;
  const sender = req.user._id;
  console.log("call this");
  const request = await Requestmodel.findOne({
    $or: [
      { rrecever: recever, rsender: req.user._id },
      {
        rrecever: req.user._id,
        rsender: recever,
      },
    ],
  });
  if (request) {
    return next(new ErrorHandling("Request already sent", 400));
  }
  const createRequest = await Requestmodel.create({
    rsender: sender,
    rrecever: recever,
  });
  emitEvent(req, NEW_REQUEST, [recever]);

  res.status(200).json({ success: true, message: "Friend request sent" });
});

export const AcceptFriendRequest = GlobalError(async (req, res, next) => {
  const { requestId, accept } = req.body;
  let newChat;

  let success = false;
  let message = "Request rejected";
  const request = await Requestmodel.findById(requestId);
  if (!request) {
    return next(new ErrorHandling("Request not found", 400));
  }
  if (request.rrecever.toString() !== req.user._id.toString()) {
    return next(
      new ErrorHandling("You are not authorized to accept this request", 400)
    );
  }
  if (accept) {
    await Requestmodel.findByIdAndDelete(requestId);
     newChat = await Chatmodel.create({
      members: [request.rsender, request.rrecever],
    });
    // emitEvent(req, NEW_REQUEST, [request.rsender], "request rejected");
    success = true;
    message = "Request accepted";
  }


  // emitEvent(req, NEW_REQUEST, [request.rsender], "request accepted");
  emitEvent(req, REFETCH_CHAT, newChat.members);
  await Requestmodel.findByIdAndDelete(requestId);

  res.status(200).json({ success: success, message: message });
});

export const Notifications = GlobalError(async (req, res, next) => {
  const user = req.user._id;
  const request = await Requestmodel.find({ rrecever: user }).populate({
    path: "rsender",
    model: Usermodel,
    select: "name avtar",
  });
  const modifyRequest = request.map(({ _id, rsender }) => ({
    _id,
    sender: {
      _id: rsender._id,
      name: rsender.name,
      avtar: rsender.avtar.url,
    },
  }));

  res.status(200).json({ success: true, modifyRequest });
});

export const GetMyFriends = GlobalError(async (req, res, next) => {
  const { chatId } = req.query;
  const user = req.user._id;

  const chats = await Chatmodel.find({
    groupChat: false,
    members: user,
  }).populate({
    path: "members",
    model: Usermodel,
    select: "name avtar",
  });

  const modifyFriends = chats
    .map(({ members }) => {
      return members
        .filter((i) => i._id.toString() !== user.toString())
        .map(({ _id, name, avtar }) => ({
          _id,
          name,
          avtar: avtar.url,
        }));
    })
    .flat();

  let friends = modifyFriends;

  if (chatId) {
    const chats = await Chatmodel.findById(chatId);
    const availableFriends = modifyFriends.filter(({ _id }) => {
      return !chats.members.includes(_id);
    });
    friends = availableFriends;
  }
  res.status(200).json({ success: true, friends });
});
