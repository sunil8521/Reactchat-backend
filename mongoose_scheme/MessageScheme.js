import models, { Schema, Types, model } from "mongoose";

const Messageschema = new Schema(
  {
    content: String,
    attachment: [
      {
        public_id: {
          type: String,
          required: [true, "Give a id for attachment"],
        },
        url: {
          type: String,
          require: true,
        },
      },
    ],
    sender: {
      type: Types.ObjectId,
      ref: "Usermodel",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chatmodel",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Messagemodel =
  models.Messagemodel || model("message", Messageschema);
