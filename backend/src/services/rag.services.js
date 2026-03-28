import StudentDetails from "../models/studentdetails.models.js";

// Replace this with your actual AI SDK (OpenAI, Gemini, Anthropic, etc.)
// Example uses OpenAI — swap as needed
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GROUNDED_SYSTEM_PROMPT = `
You are a highly focused academic assistant. 
You ONLY answer questions related to the student's field of study, domain interests, 
and academic topics. If a question is off-topic, politely redirect the user to 
ask something relevant to their academic domain.
Be precise, cite concepts clearly, and keep answers structured.
`;

const GENERAL_SYSTEM_PROMPT = `
You are a helpful, friendly AI assistant. 
Answer any question the user has — academic, general knowledge, coding, advice, etc.
Be conversational, clear, and helpful.
`;

/**
 * @param {Array} messages - chat history [{role, content}]
 * @param {String} mode - "grounded" | "general"
 * @param {String} userId - to fetch student context for grounded mode
 */
exports.getResponse = async (messages, mode, userId) => {
  try {
    let systemPrompt = mode === "grounded" ? GROUNDED_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT;

    // In grounded mode, inject student's academic context
    if (mode === "grounded") {
      const details = await StudentDetails.findOne({ userId });
      if (details) {
        systemPrompt += `
\nStudent Context:
- Education Level: ${details.education}
- Stream: ${details.stream}
- Course/Branch: ${details.courseBranch}
- Year of Passing: ${details.yearOfPassing}
- Interests/Domains: ${details.interests.join(", ")}

Always tailor your responses to this student's academic background.
        `;
      }
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedMessages,
      ],
      max_tokens: 1500,
    });

    return response.choices[0].message.content;
  } catch (err) {
    throw new Error("AI service error: " + err.message);
  }
};