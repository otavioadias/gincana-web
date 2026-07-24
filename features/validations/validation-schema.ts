import { z } from "zod";

export const validationSchema = z
  .object({
    status: z.enum(["APPROVED", "PARTIALLY_APPROVED", "REJECTED", "NEEDS_CHANGES"]),
    approvedPoints: z.coerce.number().min(0).optional(),
    reason: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "PARTIALLY_APPROVED" && value.approvedPoints === undefined) {
      context.addIssue({ code: "custom", path: ["approvedPoints"], message: "Informe os pontos aprovados" });
    }
    if (["PARTIALLY_APPROVED", "REJECTED", "NEEDS_CHANGES"].includes(value.status) && !value.reason) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Explique o motivo para orientar quem enviou" });
    }
  });

export type ValidationValues = z.infer<typeof validationSchema>;
