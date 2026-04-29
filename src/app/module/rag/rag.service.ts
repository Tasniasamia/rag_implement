import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { EmbeddingService } from "./embedding.service";
import { IndexingService } from "./indexing.service";
import { LLMService } from "./llm.service";

const convertLiteral = (data: number[]) => {
  return `[${data?.join(",")}]`;
  // output: "[0.23,-0.87,0.41]"  ← PostgreSQL vector format
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

async ingestDoctors(){

return await this.indexingService.indexingDoctor();
}

//retrival process
 async retrivalDocument(query:string,limit:number,sourceType:string){
    const embeddingdata =await this.embeddingService.generateEmbedding(query as string);
    const vectorLiteral = convertLiteral(embeddingdata);
    const results = await prisma.$queryRaw(Prisma.sql`
          SELECT id, "chunkey", "sourceType", "sourceId", "sourceLabel", content, metadata, embedding, "isDeleted", "deletedAt", "createdAt", "updatedAt", 
          1 - (embedding <=> CAST(${vectorLiteral} AS vector)) as similarity  
          FROM "documentEmbedding"
          WHERE "isDeleted" = false
          ${sourceType ? Prisma.sql`AND "sourceType" = ${sourceType}` : Prisma.empty}  
          ORDER BY embedding <=> CAST(${vectorLiteral} AS vector)
          Limit ${limit}
          `);
       return results;

  }


async generateAnswer(query:string,
    limit:number,
    sourceType:string,
    asJson:boolean){

    const retrivalDocuments=await  this.retrivalDocument( query, limit,sourceType );
   
    const context=(retrivalDocuments as any)?.filter((doc:any)=>doc.content)?.map((doc:any)=>doc.content);

    let answer = await this.llmService.generateAnswer( query,context,asJson);

}


}