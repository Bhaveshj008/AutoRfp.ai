// src/validation/zodValidatorUtils.js
const {
  z,
  uuid,
  optionalNumber,
  requiredString,
  optionalString,
  listQueryFields,
  Enum,
  emailOrMobile,
} = require("zod-fragments");


const analyzeRfpPreviewSchema = z.object({
  prompt: requiredString("RFP Prompt"),
});


const createRfpSchema = z.object({
  prompt: requiredString("RFP Prompt"),
  structured: z.any(), // comes from Groq, already validated upstream
});

const listRfpsSchema = z.object({
  ...listQueryFields,
  status: Enum(["draft", "sent", "evaluating", "closed"], "Status").optional()
})

const sendRfpSchema = z.object({
  rfp_id: uuid("RFP ID"),
  vendor_ids: z
    .array(uuid("Vendor ID"))
    .min(1, "At least one vendor is required"),
});


const listEmailsSchema = z.object({
  rfp_id: uuid("RFP ID"),
  page: optionalNumber("Page"),
  limit: optionalNumber("Limit"),
});


const parseProposalsSchema = z.object({
  rfp_id: uuid("RFP ID"),
});


const awardProposalSchema = z.object({
  rfp_id: uuid("RFP ID"),
  vendor_id: uuid("Vendor ID"),
});


const rejectProposalSchema = z.object({
  rfp_id: uuid("RFP ID"),
  vendor_id: uuid("Vendor ID"),
});


const vendorCreateSchema = z
  .array(
    z.object({
      name: requiredString("Vendor Name"),
      email: emailOrMobile("Email"),
      tags: z.array(optionalString("Tags")),   // <-- tags is array now
      // rating: optionalNumber("Rating"),
    })
  )
  .min(1, "At least one vendor is required");

const vendorListSchema = z.object({
    ...listQueryFields
  })

const getRfpDetailsSchema = z.object({
  rfp_id: uuid("RFP ID"),
});

const listProposalsSchema = z.object({
  rfp_id: uuid("RFP ID"),
  page: optionalNumber("Page"),
  limit: optionalNumber("Limit"),
});

const vendorUpdateSchema = z.object({
  vendor_id: uuid("Vendor ID"),
  name: optionalString("Vendor Name"),
  email: z.string().email("Invalid email").optional(),
  tags: z.array(optionalString("Tags")).optional(),
});

const vendorDeleteSchema = z.object({
  vendor_id: uuid("Vendor ID"),
});
  
module.exports = {
  analyzeRfpPreviewSchema,
  createRfpSchema,
  sendRfpSchema,
  listEmailsSchema,
  parseProposalsSchema,
  awardProposalSchema,
  rejectProposalSchema,
  vendorCreateSchema,
  vendorListSchema,
  listRfpsSchema,
  getRfpDetailsSchema,
  listProposalsSchema,
  vendorUpdateSchema,
  vendorDeleteSchema,
};
