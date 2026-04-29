export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private embeddingModel: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY as string;
    this.apiUrl = process.env.OPENROUTER_URL as string || 'https://openrouter.ai/api/v1'; // ✅
    this.embeddingModel = process.env.OPENROUTER_EMBEDING_MODEL as string;
  }

  async generateEmbedding(text: string) {
    if (!this.apiKey) {
      throw new Error("Api Key is missing");
    }

    const response = await fetch(`${this.apiUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        model: this.embeddingModel,
      }),
    });

    if (!response.ok) {  // ✅
      const errText = await response.text();
      throw new Error(`Embedding API error: ${errText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

}