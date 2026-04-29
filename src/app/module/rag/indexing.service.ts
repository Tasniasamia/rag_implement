import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { EmbeddingService } from "./embedding.service";

const convertLiteral = (data: number[]) => {
  return `[${data?.join(",")}]`;
  // output: "[0.23,-0.87,0.41]"  ← PostgreSQL vector format
};

export class IndexingService {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async indexingDocument(
    chunkey: string,
    sourceType: string,
    sourceId: string,
    sourceLabel: string,
    content: string,
    metadata: Record<string, unknown>, // ✅ typo fix
  ) {
    const embeddingdata =
      await this.embeddingService.generateEmbedding(content);

    const vectorLiteral = convertLiteral(embeddingdata);

    await prisma.$executeRaw(Prisma.sql`
        INSERT INTO "documentEmbedding"
        (
            "id",
            "chunkey",        
            "sourceType",
            "sourceId",
            "sourceLabel",
            "content",
            "metadata",
            "embedding",
            "updatedAt"
        )
        VALUES
        (
            ${Prisma.raw("gen_random_uuid()")},  -- ✅ comma
            ${chunkey},
            ${sourceType},
            ${sourceId},
            ${sourceLabel || null},
            ${content},
            ${JSON.stringify(metadata || {})}::jsonb,
            CAST(${vectorLiteral} AS vector),
            NOW()
        )
        ON CONFLICT ("chunkey")               
        DO UPDATE SET
            "sourceType"  = EXCLUDED."sourceType",
            "sourceId"    = EXCLUDED."sourceId",
            "sourceLabel" = EXCLUDED."sourceLabel",
            "content"     = EXCLUDED."content",
            "metadata"    = EXCLUDED."metadata",
            "embedding"   = EXCLUDED."embedding",
            "isDeleted"   = false,
            "deletedAt"   = null,
            "updatedAt"   = NOW()
    `);
  }

  async indexingDoctor() {
    const doctors = await prisma.doctor.findMany({
      include: {
        specialties: { include: { specialty: true } },
        reviews: true,
        appointments: true,
      },
    });
    let indexingCount = 0;

    for (let doctor of doctors) {
      let specialties = doctor?.specialties
        ?.map((i) => i?.specialty?.title)
        .join("\n");
      let reviews = doctor?.reviews?.map(
        (i) =>
          `- Rating: ${i?.rating}/5 . Comment:${i?.comment || "No Comments"}`,
      );

      let chunkey = `${doctor?.id}-${doctor?.userId}`;
      let sourceType = "doctors";
      let sourceId = doctor?.id;
      let sourceLabel = "doctors";
      let content = `Doctor Name : ${doctor?.name} 
  Experience: ${doctor?.experience}
  Qualification: ${doctor?.qualification}
  Appointment Fee: ${doctor?.appointmentFee}
  Current Working Place: ${doctor?.currentWorkingPlace}
  Average Rating: ${doctor?.averageRating}
  Specialites:${specialties || "None Listed"}
  Patient Reviews: ${reviews || "No Reviews Yet"}`;
      // metdata → metadata
      let metadata = {
        // ✅
        doctorId: doctor?.id,
        name: doctor?.name,
        specialties: specialties,
        averageRating: doctor?.averageRating,
        experience: doctor?.experience,
      };

      await this.indexingDocument(
        chunkey,
        sourceType,
        sourceId,
        sourceLabel,
        content,
        metadata, // ✅
      );
      indexingCount++;
    }

    return indexingCount;
  }
 


}
