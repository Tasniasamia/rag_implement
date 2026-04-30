import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { EmbeddingService } from "./embedding.service";
import { IndexingService } from "./indexing.service";
import { LLMService } from "./llm.service";

const convertLiteral = (data: number[]) => {
  return `[${data?.join(",")}]`;

};

export class RagService{
private indexingService:IndexingService;
private embeddingService:EmbeddingService;
private llmService:LLMService;
constructor(){
this.indexingService=new IndexingService();
this.embeddingService=new EmbeddingService();
this.llmService=new LLMService();
}
  
//ingestion process
 async ingestDoctors(){

return await this.indexingService.indexingDoctor();
}

//retrival process
async retrivalDocument(query: string, limit: number, sourceType: string) {
    const embeddingdata = await this.embeddingService.generateEmbedding(query);
    const vectorLiteral = convertLiteral(embeddingdata);

    const results = await prisma.$queryRaw(Prisma.sql`
        SELECT 
            id, "chunkey", "sourceType", "sourceId", "sourceLabel", 
            content, metadata, "isDeleted", "deletedAt", "createdAt", "updatedAt",
            1 - (embedding <=> CAST(${vectorLiteral} AS vector)) AS similarity
        FROM "documentEmbedding"
        WHERE "isDeleted" = false
        ${sourceType ? Prisma.sql`AND "sourceType" = ${sourceType}` : Prisma.empty}
        ORDER BY similarity DESC
        LIMIT ${limit}
    `);

    return results;
}

//retrival and augmented process
async generateAnswer(
    query: string,
    limit: number,
    sourceType: string,
    asJson: boolean
) {
    const retrivalDocuments = await this.retrivalDocument(query, limit, sourceType);

    console.log("retrivalDocuments:", retrivalDocuments);

    const context = (retrivalDocuments as any)
        ?.filter((doc: any) => doc.content)
        ?.map((doc: any) => doc.content);

    let answer = await this.llmService.generateAnswer(query, context, asJson);

    let parsedAnswer: any = answer;

    if (asJson) {
        try {
            if (answer.startsWith("```json")) {
                answer = answer.replace(/```json\n?/, "").replace(/```$/, "").trim();
            } else if (answer.startsWith("```")) {
                answer = answer.replace(/```\n?/, "").replace(/```$/, "").trim();
            }
            parsedAnswer = JSON.parse(answer);
        } catch (error) {
            console.error("Failed to parse LLM response as JSON:", error);
            throw new Error("LLM response is not valid JSON");
        }
    }

    return {
        answer: parsedAnswer,
        sources: (retrivalDocuments as any).map((doc: any) => ({ // ✅ relevantDocs → retrivalDocuments
            id: doc.id,
            chunkKey: doc.chunkey,  // ✅ DB তে "chunkey" (lowercase)
            sourceType: doc.sourceType,
            sourceId: doc.sourceId,
            sourceLabel: doc.sourceLabel,
            content: doc.content,
            similarity: doc.similarity,
        })),
        contextUsed: context.length > 0,
    };
}









//get stats data from documentEmbedding model
async getStats() {
    try {
      const totalDocuments = await prisma.$queryRaw(Prisma.sql`
        SELECT COUNT(*) as count FROM "documentEmbedding" WHERE "isDeleted" = false;
        `);

      const sourceTypeCounts = await prisma.$queryRaw(Prisma.sql`
        SELECT "sourceType", COUNT(*) as count FROM "documentEmbedding" WHERE "isDeleted" = false GROUP BY "sourceType"
        `);

      return {
        totalActiveDocuments: Number((totalDocuments as any)[0]?.count ?? 0),
        sourceTypeBreakdown: (sourceTypeCounts as any).reduce(
          (acc: any, curr: any) => {
            acc[curr.sourceType] = Number(curr.count);
            return acc;
          },
          {},
        ),
        timestamp: new Date(),
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

}