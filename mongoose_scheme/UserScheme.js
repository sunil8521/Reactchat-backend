import models, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const Userschema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      lowercase: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters long."],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      select: false,
    },
    avtar: {
      public_id: {
        type: String,
        required: [true, "Give a id to avtar"],
      },
      url: {
        type: String,
        require: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

Userschema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 8);
  next();
});

Userschema.methods.Checkpassword=async function (password,hashpassword){
  return await bcrypt.compare(password,hashpassword);
}

export const Usermodel = models.Usermodel || model("user", Userschema);
