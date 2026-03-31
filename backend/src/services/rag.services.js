// backend/src/services/rag.services.js
// This service calls the Python client's /query endpoint.
// It NEVER calls OpenAI directly — the Python client owns all RAG logic.

import { UserProfile } from "../models/userprofile.models.js";
import { StudentDetails } from "../models/studentdetails.models.js";

const PYTHON_CLIENT_URL = process.env.PYTHON_CLIENT_URL || "http://localhost:8001";
const SERVICE_KEY = process.env.SERVICE_KEY;

/**
 * Calls Python client /query endpoint.
 * @param {Object} params
 * @param {string} params.question  - The user's message
 * @param {string} params.sessionId - MongoDB session _id (used as Pinecone namespace)
 * @param {string} params.userId    - To fetch UserProfile for prompt injection
 * @param {string} params.mode      - "grounded" | "extended"
 * @returns {{ answer, sources, confidence, mode }}
 */
const query = async ({ question, sessionId, userId, mode = "grounded" }) => {
  // Fetch the user's academic profile to inject into the prompt
  const [userProfile, studentDetails] = await Promise.all([
    UserProfile.findOne({ userId }),
    StudentDetails.findOne({ userId }),
  ]);

  // Build a profile object to send to Python
  const profile = {
    branch:       userProfile?.branch       || null,
    year:         userProfile?.year         || null,
    university:   userProfile?.university   || null,
    bio:          userProfile?.bio          || null,
    interests:    userProfile?.interests    || [],
    domains:      userProfile?.domains      || [],
    education:    studentDetails?.education || null,
    stream:       studentDetails?.stream    || null,
    courseBranch: studentDetails?.courseBranch || null,
  };

  // AbortController gives us a proper timeout for fetch (fetch has none built-in)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout — RAG pipeline (embed + search + GPT) can take 60-90s

  let response;
  try {
    response = await fetch(`${PYTHON_CLIENT_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": SERVICE_KEY,
      },
      body: JSON.stringify({
        question,
        session_id: sessionId.toString(),
        user_profile: profile,
        // Pass mode from frontend toggle so Python can honour the user's explicit choice.
        // Python's detect_mode() still runs but Node's mode acts as a hint/override
        // when the user explicitly flips the toggle to "general" / "extended".
        mode,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Python client /query timed out after 120s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Python client /query failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  // Normalise response shape — Python client returns snake_case
  return {
    answer:     data.answer,
    sources:    data.sources    || [],
    confidence: data.confidence || null,
    mode:       data.mode       || mode,
  };
};

export const ragService = { query };
