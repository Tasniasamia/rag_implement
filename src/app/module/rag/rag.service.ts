import { EmbeddingService } from "./embedding.service";
import { IndexingService } from "./indexing.service";

export class RagService{
private indexingService:IndexingService;
// private embeddingService:EmbeddingService;
constructor(){
    this.indexingService=new IndexingService();
}
async ingestDoctors(){

return await this.indexingService.indexingDoctor();
}

}