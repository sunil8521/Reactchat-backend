import models,{ Schema, Types, model } from "mongoose";

const Chatschema = new Schema(
  {
    name: {
      type: String,
      required: [function () { return this.groupChat; },"Give a name to group chat."],
    },
    groupChat: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: Types.ObjectId,
      ref: "Usermodel",
    },
    members: [
      {
        type: Types.ObjectId,
        ref: "Usermodel",
      },
    ],
  },
  {
    timestamps: true,
  }
);
Chatschema.pre("save", function (next) {
  if(!this.groupChat){
    this.name=undefined
  }
  next();
});

export const Chatmodel = models.Chatmodel || model("chat", Chatschema);
