// backend/src/controllers/profile.controller.js
import { UserProfile } from "../models/userprofile.models.js";
import { StudentDetails } from "../models/studentdetails.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /api/profile
export const getProfile = asyncHandler(async (req, res) => {
  const [userProfile, studentDetails] = await Promise.all([
    UserProfile.findOne({ userId: req.user._id }),
    StudentDetails.findOne({ userId: req.user._id }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { userProfile, studentDetails })
  );
});

// PUT /api/profile
export const upsertProfile = asyncHandler(async (req, res) => {
  const {
    education, stream, yearOfPassing, courseBranch, interests,
    branch, year, university, bio, domains, linkedinUrl, githubUrl,
  } = req.body;

  // Build the StudentDetails update object from whatever fields were sent.
  // BUG FIX: the old code wrapped everything in `if (education || stream || ...)`
  // which meant `interests` was silently ignored if no education fields were
  // also present. A user updating only their interests would lose their data.
  // Now we build the update object independently and only write if there's
  // actually something to update.
  const studentUpdate = {
    ...(education     && { education }),
    ...(stream        && { stream }),
    ...(yearOfPassing && { yearOfPassing: Number(yearOfPassing) }),
    ...(courseBranch  && { courseBranch }),
    // interests belongs to StudentDetails — update it whenever it's provided,
    // regardless of whether other education fields are present
    ...(interests !== undefined && { interests }),
  };

  if (Object.keys(studentUpdate).length > 0) {
    await StudentDetails.findOneAndUpdate(
      { userId: req.user._id },
      studentUpdate,
      { new: true, upsert: true }
    );
  }

  // Update UserProfile fields
  const profile = await UserProfile.findOneAndUpdate(
    { userId: req.user._id },
    {
      userId: req.user._id,
      branch, year, university, bio,
      interests, domains, linkedinUrl, githubUrl
    },
    { new: true, upsert: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, profile, "Profile updated successfully")
  );
});
