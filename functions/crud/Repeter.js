import { GlobalError, ErrorHandling } from "../../error/error.js";

export const Getone = (model) =>
  GlobalError(async (req, res, next) => {
    let query = model.findById(req.params.Id);
    const doc = await query;
    if (!doc) {
      return next(new ErrorHandling("No document found with that ID", 404));
    }
    res.status(200).json({
      status: "success",
      data: doc,
    });
  });
