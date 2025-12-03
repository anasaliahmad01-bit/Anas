import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../utils/constants";
import { Message, Role } from "../types";

// Initialize the client
// NOTE: We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;

// Helper to extract base64 data and mimeType
const parseBase64 = (base64Data: string) => {
  const match = base64Data.match(/^data:(.*?);base64,(.*)$/);
  if (match && match.length === 3) {
    return {
      mimeType: match[1],
      data: match[2]
    };
  }
  return null;
};

export const startChat = (history?: Message[]): void => {
  const geminiHistory: Content[] | undefined = history?.map(msg => {
    const parts: Part[] = [];
    
    // If message has an image, add it as a part
    if (msg.image) {
      const parsed = parseBase64(msg.image);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data
          }
        });
      }
    }

    // Add text part (even if empty string, though usually messages have text)
    // Gemini prefers text parts to not be empty if they are the only part, but here we might have image.
    if (msg.text || parts.length === 0) {
      parts.push({ text: msg.text || " " });
    }

    return {
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: parts
    };
  });

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topK: 40,
    },
    history: geminiHistory
  });
};

export const sendMessageToGemini = async function* (message: string, image?: string): AsyncGenerator<string, void, unknown> {
  if (!chatSession) {
    startChat();
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  try {
    let messageContent: string | Array<string | Part> = message;

    if (image) {
      const parsed = parseBase64(image);
      if (parsed) {
        messageContent = [
          {
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.data
            }
          },
          { text: message }
        ];
      }
    }

    const responseStream = await chatSession.sendMessageStream({ message: messageContent });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};

export const resetChat = () => {
  chatSession = null;
  startChat();
};