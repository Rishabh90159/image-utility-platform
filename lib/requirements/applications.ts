import type { ApplicationRequirements, ImageSpec, RequirementSet } from "./types";

/**
 * Exam and recruitment photo requirements, verified against the official
 * documents listed in each `source`. Read the rules in ./types.ts before
 * editing. When a new notification is published, add or replace the set,
 * update `lastVerified`, and update the tool's `updated` date in the registry.
 */

// ---------------------------------------------------------------- IBPS / SBI shared wording
// IBPS's three 2026 Common Recruitment Process notifications and SBI's 2026
// advertisements state the same photo and signature specification. They are
// still stored per notification, because any one of them may change.

const BANKING_PHOTO_RULES = [
  "Recent passport-style colour photograph",
  "Taken against a light-coloured, preferably white, background",
  "Look straight at the camera with a relaxed face",
  "No harsh shadows; no red-eye if flash is used",
  "If you wear glasses, no reflections and eyes clearly visible",
  "Caps, hats and dark glasses are not acceptable; religious headwear is allowed but must not cover the face",
];

const BANKING_SIGNATURE_RULES = [
  "Sign on white paper with a black ink pen",
  "Must be signed by the applicant only",
  "Signature in CAPITAL LETTERS is not accepted",
];

function bankingPhoto(): ImageSpec {
  return {
    kind: "photo",
    format: "JPG/JPEG",
    widthPx: 200,
    heightPx: 230,
    pixelBasis: "preferred",
    physical: "4.5 cm × 3.5 cm",
    aspect: 200 / 230,
    minKB: 20,
    maxKB: 50,
    rules: BANKING_PHOTO_RULES,
  };
}

function bankingSignature(): ImageSpec {
  return {
    kind: "signature",
    format: "JPG/JPEG",
    widthPx: 140,
    heightPx: 60,
    pixelBasis: "preferred",
    aspect: 140 / 60,
    minKB: 10,
    maxKB: 20,
    rules: BANKING_SIGNATURE_RULES,
  };
}

const IBPS_NOTES = [
  "In addition to the uploaded photograph, the application asks you to capture a live photograph with a webcam or phone.",
  "The system won't let you continue until the photograph and signature match the specification.",
];

const BANKING_LIVE_NOTE =
  "In addition to the uploaded photograph, the application asks you to capture a live photograph with a webcam or phone.";

// ---------------------------------------------------------------- IBPS

const IBPS_SETS: RequirementSet[] = [
  {
    id: "ibps-crp-po-mt-xvi",
    name: "CRP PO/MT-XVI (Probationary Officers / Management Trainees, vacancies 2027-28)",
    photo: bankingPhoto(),
    signature: bankingSignature(),
    notes: IBPS_NOTES,
    source: {
      title: "Notification CRP PO/MT-XVI",
      url: "https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI_Final_V1_30.06.2026.pdf",
      publisher: "Institute of Banking Personnel Selection (IBPS)",
      section: "Guidelines for scanning and upload of photograph, signature and documents",
      lastVerified: "2026-10-07",
    },
  },
  {
    id: "ibps-crp-csa-xvi",
    name: "CRP CSA-XVI (Customer Service Associates / Clerks, vacancies 2027-28)",
    photo: bankingPhoto(),
    signature: bankingSignature(),
    notes: IBPS_NOTES,
    source: {
      title: "Notification CRP CSA-XVI",
      url: "https://www.ibps.in/wp-content/uploads/Notification_CRP_CSA_XVI-Final.pdf",
      publisher: "Institute of Banking Personnel Selection (IBPS)",
      section: "Guidelines for scanning and upload of photograph, signature and documents",
      lastVerified: "2026-10-07",
    },
  },
  {
    id: "ibps-crp-spl-xvi",
    name: "CRP SPL-XVI (Specialist Officers, vacancies 2027-28)",
    photo: bankingPhoto(),
    signature: bankingSignature(),
    notes: IBPS_NOTES,
    source: {
      title: "Notification CRP SPL-XVI",
      url: "https://www.ibps.in/wp-content/uploads/Detailed-Notification-CRP-SPL-XVI_Final_V1_30.06.2026.pdf",
      publisher: "Institute of Banking Personnel Selection (IBPS)",
      section: "Guidelines for scanning and upload of photograph, signature and documents",
      lastVerified: "2026-10-07",
    },
  },
];

// ---------------------------------------------------------------- SBI

const SBI_SETS: RequirementSet[] = [
  {
    id: "sbi-po-2026-27-09",
    name: "Probationary Officers 2026 (Advertisement CRPD/PO/2026-27/09)",
    photo: bankingPhoto(),
    signature: bankingSignature(),
    notes: [BANKING_LIVE_NOTE],
    source: {
      title: "Recruitment of Probationary Officers – Advertisement No. CRPD/PO/2026-27/09",
      url: "https://sbi.bank.in/csfile/18062026_1_Detailed_Adv.2026.pdf",
      publisher: "State Bank of India, Central Recruitment & Promotion Department",
      section: "Guidelines for scanning and upload of photograph, signature, left-hand thumb impression and hand-written declaration",
      lastVerified: "2026-10-07",
    },
  },
  {
    id: "sbi-rs-2026-27-06",
    name: "Retired Bank Officers as Resolvers (Advertisement CRPD/RS/2026-27/06)",
    photo: { ...bankingPhoto(), physical: undefined },
    signature: bankingSignature(),
    source: {
      title: "Engagement of Retired Bank Officers as Resolvers – Advertisement No. CRPD/RS/2026-27/06",
      url: "https://sbi.bank.in/documents/77530/57941334/15042026_ADVERTISEMENT_ADV_CRPD_RS_2026_27_06.pdf/8cae2a8a-b88d-c8e4-6b34-33c49038304a",
      publisher: "State Bank of India, Central Recruitment & Promotion Department",
      section: "Photograph file type/size; Signature file type/size",
      lastVerified: "2026-10-07",
    },
  },
];

// ---------------------------------------------------------------- SSC
// SSC's 2026 notices capture the photograph live in the application module and
// reject applications that photograph a pre-existing photo. Only the signature is uploaded.

const SSC_LIVE_RULES = [
  "You don't need a pre-existing photograph: the application module captures your photo when prompted",
  "Find a place with good light and a plain background",
  "Keep the camera at eye level, sit or stand directly in front of it and look straight ahead",
  "Keep your face fully inside the area marked by the camera, neither too close nor too far",
  "Don't wear a cap, mask or glasses/spectacles",
  "Never capture a photo of an existing photograph: such applications are rejected",
];

const SSC_SIGNATURE: ImageSpec = {
  kind: "signature",
  format: "JPEG/JPG",
  physical: "about 6.0 cm (width) × 2.0 cm (height)",
  aspect: 3,
  minKB: 10,
  maxKB: 20,
  rules: ["Upload a scanned signature", "Blurred or miniature signatures are rejected"],
};

const SSC_SETS: RequirementSet[] = [
  {
    id: "ssc-cgle-2026",
    name: "Combined Graduate Level Examination, 2026",
    signature: SSC_SIGNATURE,
    livePhotoCapture: { rules: SSC_LIVE_RULES },
    notes: ["Applications submitted through Aadhaar-based authentication are not rejected on these photo and signature grounds."],
    source: {
      title: "Notice: Combined Graduate Level Examination, 2026",
      url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf",
      publisher: "Staff Selection Commission (SSC)",
      section: "Paragraphs 9.4 to 9.6",
      lastVerified: "2026-10-07",
    },
  },
  {
    id: "ssc-chsle-2026",
    name: "Combined Higher Secondary (10+2) Level Examination, 2026",
    signature: SSC_SIGNATURE,
    livePhotoCapture: { rules: SSC_LIVE_RULES },
    notes: ["Applications submitted through Aadhaar-based authentication are not rejected on these photo and signature grounds."],
    source: {
      title: "Notice: Combined Higher Secondary (10+2) Level Examination, 2026",
      url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsle_2026.pdf",
      publisher: "Staff Selection Commission (SSC)",
      section: "Paragraphs 9.4 to 9.6",
      lastVerified: "2026-10-07",
    },
  },
];

// ---------------------------------------------------------------- NEET (UG)

const NEET_SETS: RequirementSet[] = [
  {
    id: "neet-ug-2026",
    name: "NEET (UG) 2026",
    photo: {
      kind: "photo",
      format: "JPG/JPEG",
      minKB: 10,
      maxKB: 200,
      rules: [
        "Recent passport-size photograph, in colour or black & white",
        "Taken after 01 January 2026",
        "White background",
        "Face without mask, ears visible; about 80% of the image should be the face",
        "Spectacles only if worn regularly",
        "Polaroid and computer-generated photos are not acceptable",
      ],
    },
    signature: { kind: "signature", format: "JPG/JPEG", minKB: 10, maxKB: 100, rules: ["Upload a scanned signature, clearly legible"] },
    notes: [
      "The bulletin does not specify pixel dimensions for the photograph; it specifies the format and file size.",
      "A live photograph is also captured during the application and matched with your Aadhaar record.",
      "Use the same passport-size photo for the form and for the attendance sheet; keep 6–8 passport-size and 4–6 postcard-size (4\" × 6\") colour photos with a white background.",
    ],
    source: {
      title: "Information Bulletin NEET (UG)-2026",
      url: "https://neet.nta.nic.in/document/information-bulletin-english/",
      publisher: "National Testing Agency (NTA)",
      section: "Upload scanned images (photograph, signature) and live photograph instructions",
      lastVerified: "2026-10-07",
    },
  },
];

// ---------------------------------------------------------------- Applications

export const APPLICATIONS = {
  ssc: { name: "SSC", fullName: "Staff Selection Commission", sets: SSC_SETS },
  upsc: {
    name: "UPSC",
    fullName: "Union Public Service Commission",
    sets: [],
    unverified: {
      reason:
        "UPSC's current photo instructions are published inside its online application portal. The publicly available UPSC documents we checked give different pixel limits from each other, so we couldn't confirm which values apply to the current application form.",
      whereToCheck: [
        { label: "UPSC online application portal (Instructions and FAQs > Photos and Signature)", url: "https://upsconline.nic.in/" },
        { label: "UPSC website: examination notices", url: "https://upsc.gov.in/" },
      ],
      checkedOn: "2026-10-07",
    },
  },
  ibps: { name: "IBPS", fullName: "Institute of Banking Personnel Selection", sets: IBPS_SETS },
  sbi: { name: "SBI", fullName: "State Bank of India", sets: SBI_SETS },
  neet: { name: "NEET", fullName: "National Eligibility cum Entrance Test (UG), conducted by NTA", sets: NEET_SETS },
} satisfies Record<string, ApplicationRequirements>;

export type ApplicationId = keyof typeof APPLICATIONS;
