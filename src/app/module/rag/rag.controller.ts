import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { RagService } from "./rag.service";

const ragService=new RagService();

const getStats = async (req: Request, res: Response) => {
  console.log("connected", req.query);
  res.status(200).json({ message: "connected rag apis" });
};

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

export const RagController = {
  getStats,
  ingestDoctors,
};