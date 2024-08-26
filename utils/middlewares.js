import { GlobalError, ErrorHandling } from "../error/error.js";
import { config } from "dotenv";
config();
import jwt from "jsonwebtoken";
import { promisify } from "util";
import { Usermodel } from "../mongoose_scheme/UserScheme.js";

export const Protecter = GlobalError(async (req, res, next) => {
  let token;
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new ErrorHandling(
        `You are not logged in! Please login to get access..`,
        401
      )
    );
  }
  const decode = await promisify(jwt.verify)(token, process.env.JWT);
  const user = await Usermodel.findById(decode.id).select("+role");
  //   .select("+role");
  if (!user) {
    return next(new ErrorHandling("This user no longer exist", 401));
  }
  //   if (user.Passwordchangedchecker(decode.iat)) {
  //     return next(
  //       new ErrorHandling(
  //         "User recently changed password. Please log in again!",
  //         401
  //       )
  //     );
  //   }
  req.user = user;
  next();
});

export const SocketAuth = async (socket, next) => {
  try {
    const token = socket.request.cookies.jwt;
    if (!token) {
      return next(new ErrorHandling("Login to access this", 400));
    }
    const decode = jwt.verify(token, process.env.JWT);
    const user = await Usermodel.findById(decode.id);

    if (!user) {
      return next(new ErrorHandling("This user no longer exist", 401));
    }
    socket.user = user;

    next();
  } catch (err) {
    return next(new ErrorHandling("Login to access this", 400));
  }
};

export const Restrictto = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandling(
          "you do not have permission to perform this action",
          403
        )
      );
    }
    next();
  };
};
