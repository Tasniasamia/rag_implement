import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { RagService } from "./rag.service";

const ragService=new RagService();

const getStats = catchAsync(async (req: Request, res: Response) => {
  const result = await ragService.getStats();

  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: "RAG stats retrieved successfully",
    data: result,
  });
});

const ingestDoctors = catchAsync(async (req: Request, res: Response) => {
 
  const result = await ragService.ingestDoctors();
  if(result === null || result === undefined){  // ✅
    throw new Error("Doctors data ingestion failed")
  }
  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: `Doctors data ingestion completed. Total: ${result}`,
    data: { count: result }
  })
});


const queryRag=catchAsync(async(req: Request, res: Response)=>{

const {query}=req?.body;

let sourceType="doctors"
let limit=5
let asJson=true

    if(!query){
      throw new Error("Query is required");
    }

  const result = await ragService.generateAnswer(query, limit,sourceType,asJson);
  console.log("result",result);

  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: `Doctors data generate answer completed`,
    data: result
  })
})

export const RagController = {
  getStats,
  ingestDoctors,
  queryRag
};