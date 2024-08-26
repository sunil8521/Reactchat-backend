import models, { Schema, Types, model } from "mongoose";
const Requestschema = new Schema(
  {
    satus: {
      type: String,
      default: "pending",
      enum: ["reject", "pending", "accept"],
    },
    rsender: {
      type: Types.ObjectId,
      ref: "Usermodel",
      required: [true,"Provide sender Id." ],
    },
    rrecever: {
      type: Types.ObjectId,
      ref: "Usermodel",
      required: [true,"Provide recever Id."],
    },
  },
  {
    timestamps: true,
  }
);

export const Requestmodel =
  models.Requestmodel || model("request", Requestschema);
