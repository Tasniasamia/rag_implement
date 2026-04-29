import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { EmbeddingService } from "./embedding.service";
import { IndexingService } from "./indexing.service";

const convertLiteral = (data: number[]) => {
  return `[${data?.join(",")}]`;
  // output: "[0.23,-0.87,0.41]"  ← PostgreSQL vector format
};

export class RagService{
private indexingService:IndexingService;
private embeddingService:EmbeddingService;
constructor(){
this.indexingService=new IndexingService();
this.embeddingService=new EmbeddingService();
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
    asJson:string){

    const retrivalDocuments=await  this.retrivalDocument( query, limit,sourceType );
}


}