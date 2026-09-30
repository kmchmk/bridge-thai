/** Short samples for the male/female voice previews on the setup page (and the admin audition). Pure data: safe for client bundles. */
export const PREVIEW_LINES = {
  male: { th: "สวัสดีครับ ยินดีที่ได้รู้จักครับ", rom: "sà-wàt-dii khráp yin-dii thîi dâai rúu-jàk khráp", en: "Hello, nice to meet you." },
  female: { th: "สวัสดีค่ะ ยินดีที่ได้รู้จักค่ะ", rom: "sà-wàt-dii khâ yin-dii thîi dâai rúu-jàk khâ", en: "Hello, nice to meet you." },
} as const;

/** Voice previews for the English course (accent-neutral wording). */
export const PREVIEW_LINES_EN = {
  male: { en: "Hello, nice to meet you. How are you today?", th: "สวัสดี ยินดีที่ได้รู้จัก วันนี้เป็นอย่างไรบ้าง" },
  female: { en: "Hello, nice to meet you. How are you today?", th: "สวัสดี ยินดีที่ได้รู้จัก วันนี้เป็นอย่างไรบ้าง" },
} as const;
