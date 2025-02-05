declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string }): GenerativeModel;
  }

  export interface GenerativeModel {
    generateContent(prompt: string): Promise<GenerateContentResult>;
  }

  export interface GenerateContentResult {
    response: {
      text(): string;
    };
  }
}