export class LLMService {
  private apiKey: string;
  private apiUrl: string;
  private llmModel: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY as string;
    this.apiUrl = process.env.OPENROUTER_URL as string || 'https://openrouter.ai/api/v1'; // ✅
    this.llmModel = process.env.OPENROUTER_LLM_MODEL as string;
  }

  async generateAnswer(prompt:string,context: string[] = [],asJson:boolean) {

    if (!this.apiKey) {
      throw new Error("Api Key is missing");
    }
  try {
  
      let fullPrompt =
        context.length > 0
          ? `Context information:\n${context.join("\n\n")}\n\nQuestion: ${prompt}\n\nAnswer based on the context above.`
          : prompt;


      if (asJson) {
        fullPrompt += `\n\nReturn ONLY a valid JSON object matching this structure: {"doctors": [{"name": "Doctor Name", "reason": "Why they are suitable", "specialty": "Their specialty"}]}. Do not include any markdown formatting like \`\`\`json.`;
      }


      const systemMessage = asJson
        ? "You are a helpful assistant for a healthcare management system. Answer questions based on the provided context. You MUST respond with ONLY valid JSON format. Do not include markdown tags."
        : "You are a helpful assistant for a healthcare management system. Answer questions based on the provided context. If the context does not contain the answer, say you don't have enough information.";


      const bodyPayload: any = {
        model: this.llmModel,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        temperature: 0.1, // Lower temperature for more deterministic JSON
        max_tokens: 1500,
      };




      if (
        asJson &&
        (this.llmModel.includes("gpt") || this.llmModel.includes("openai"))
      ) {
        bodyPayload.response_format = { type: "json_object" };
      }


      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
         },

        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData.error?.message} || "unknown error"`,
        );
      }

      const data = await response.json();

      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating LLM response:", error);
      throw error;
    }


  
  }

}