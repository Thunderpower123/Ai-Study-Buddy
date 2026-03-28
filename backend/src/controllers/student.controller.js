import {StudentDetails} from "../models/studentdetails.models.js";
import {User} from "../models/user.models.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";

// POST /api/student-details
const saveStudentDetails = asyncHandler(async (req, res) => {
  const { education, stream, yearOfPassing, courseBranch, interests } = req.body;

  if (!education || !stream || !yearOfPassing || !courseBranch) {
    throw new ApiError(400, "All required fields must be provided");
  }

  const details = await StudentDetails.findOneAndUpdate(
    { userId: req.user._id },
    { education, stream, yearOfPassing: Number(yearOfPassing), courseBranch, interests: interests || [] },
    { new: true, upsert: true, runValidators: true }
  );

  // Mark profile complete on the User model
  await User.findByIdAndUpdate(req.user._id, { isProfileComplete: true });

  return res.status(200).json(
    new ApiResponse(200, details, "Student details saved successfully")
  );
});

// GET /api/student-details
const getStudentDetails = asyncHandler(async (req, res) => {
  const details = await StudentDetails.findOne({ userId: req.user._id });
  if (!details) throw new ApiError(404, "No student details found");
  return res.status(200).json(new ApiResponse(200, details));
});

module.exports = { saveStudentDetails, getStudentDetails };