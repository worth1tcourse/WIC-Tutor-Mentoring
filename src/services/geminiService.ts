import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGemini() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not defined");
    genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}

export async function generateQuote(topic: string = "pendidikan dan dedikasi") {
  try {
    const ai = getGemini();
    const prompt = `Act as a world-class educational psychologist and professional mentor.
    Your task is to craft one EXCLUSIVE, high-impact inspirational quote for educators at "Worth It Course" (WIC), an elite tutoring institution.
    
    Topic: ${topic}.
    Guidelines:
    1. Tone: Deeply professional, sophisticated, and authoritative.
    2. Focus: The transformative power of teaching and the teacher's legacy.
    3. Style: Elegant diction, evocative but sturdy.
    4. Language: Bahasa Indonesia (Indonesian), formal but soul-stirring (Bahasa Indonesia yang puitis namun berwibawa).
    5. Length: Maximum 18 words.
    
    Output only the quote text. No quotation marks.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    
    return response.text?.trim() || "Mendidik adalah seni menanam benih masa depan di hari ini.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Mendidik adalah seni menanam benih masa depan di hari ini.";
  }
}

export async function generateWABroadcast(topic: string, style: string, period: string) {
  try {
    const ai = getGemini();
    const prompt = `Act as a Master Copywriter and Senior PR Manager at "Worth It Course" (WIC) Jambi.
    Task: Write a high-conversion, professional WhatsApp Broadcast message for our Tutors.
    
    Context:
    - Main Topic: ${topic}
    - Tone/Vibe: ${style} (Extremely important to strictly follow this style)
    - Active Period: ${period}
    
    Copywriting Principles:
    1. Hook: Start with a captivating, professional greeting using [NAMA].
    2. Value: Highlight the importance of their contribution to Worth It Course.
    3. Call to Action/Info: Clearly state that payslips and performance reports for ${period} are ready on the Dashboard.
    4. Clarity: Use clean formatting, professional bullet points if needed.
    5. Closing: An inspiring sign-off that builds loyalty.
    
    Style-Specific Instructions:
    - If style is "Formal": Use standard Indonesian (EYD), authoritative yet appreciative.
    - If style is "Friendly": Use warm, supportive, and slightly casual but respectful language.
    - If style is "Urgent": Emphasize the importance of period ${period} review with efficiency.
    - If style is "Short": Focus strictly on the core info with high energy.
    
    Language: Bahasa Indonesia. Professional emojis only.
    Output: ONLY the message script. No meta-commentary.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    
    return response.text?.trim() || `Halo [NAMA], slip gaji periode ${period} sudah dapat diakses di Dashboard WIC. Terima kasih atas dedikasinya!`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Halo [NAMA], slip gaji periode ${period} sudah dapat diakses di Dashboard WIC. Terima kasih atas dedikasinya!`;
  }
}

export async function generateIndividualMessage(tutorName: string, gender: string, content: string, style: string) {
  try {
    const ai = getGemini();
    const prompt = `Act as a Master Copywriter and Senior PR Manager at "Worth It Course" (WIC) Jambi.
    Task: Re-write and polish this personal message for a Specific Tutor.
    
    Target: ${gender} ${tutorName}
    Tone/Vibe: ${style} (Strictly follow this)
    Core Message: ${content}
    
    Requirements:
    1. Greeting: Use "${gender} ${tutorName}" naturally at the start.
    2. Professionalism: Maintain the high standards of WIC even in friendly messages.
    3. Polish: Improve the flow and choice of words while keeping the core meaning.
    4. Language: Bahasa Indonesia. Professional emojis selectively.
    
    Output: ONLY the polished message script.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    
    return response.text?.trim() || `Halo ${gender} ${tutorName}, ${content}`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Halo ${gender} ${tutorName}, ${content}`;
  }
}

/**
 * Intelligent generator for curriculum chapters based on title, level, and description.
 * Generates an array of chapter titles (e.g., 'Bab 1: ...', 'Bab 2: ...') automatically.
 */
/**
 * Intelligent generator for curriculum chapters based on title, level, and description.
 * Strictly reads, respects, and structures chapters based on user-provided descriptions, reference books, and syllabi.
 */
export async function generateModuleChapters(title: string, level: string, description: string): Promise<string[]> {
  try {
    const ai = getGemini();
    const prompt = `Act as an expert curriculum designer, pedagogical director, and master educator for "Worth It Course" (WIC), an elite tutoring academy.
    
    TASK: Automatically generate a comprehensive, structured sequence of 6 to 8 chapter titles (Silabus Bab) for a learning module book.
    
    MODULE INPUT SPECIFICATIONS:
    - Judul Modul: ${title || 'Modul Pembelajaran WIC'}
    - Level / Program: ${level}
    - Deskripsi & Rujukan Acuan: ${description || 'Panduan belajar interaktif bertahap'}
    
    CRITICAL INSTRUCTION FOR RUJUKAN & DESKRIPSI (WAJIB DIBACA SAKSAMA):
    1. PRIORITAS UTAMA: Baca, telaah, dan pahami teks pada "Deskripsi & Rujukan Acuan" di atas.
    2. JIKA pengguna memasukkan referensi khusus (seperti nama kitab, surat Al-Qur'an, buku teks acuan, daftar materi pokok, topik grammar, capaian kompetensi, atau rincian silabus), Anda HARUS menyusun bab-bab yang benar-benar merujuk dan mencerminkan rujukan tersebut secara spesifik dan terstruktur.
    3. DILARANG KERAS mengabaikan deskripsi atau menghasilkan topik generik acak jika pengguna telah memberikan petunjuk rujukan atau pokok bahasan di dalam deskripsi.
    4. Setiap judul bab harus jelas, memiliki nilai pedagogis yang terukur, dan tersusun secara berurutan:
       - Bab 1: Fondasi / Pengantar materi rujukan
       - Bab 2 s/d Bab (N-1): Pembahasan bertahap, kaidah inti, latihan aplikatif sesuai rujukan
       - Bab Terakhir: Evaluasi, simulasi praktek, atau uji kompetensi rujukan
    5. Format setiap item dalam array HARUS diawali dengan "Bab X: [Judul Bab Spesifik]", contoh:
       ["Bab 1: Pengenalan Makhraj Al-Halq Berdasarkan Matan Al-Jazariyyah", "Bab 2: Kaidah Mad Thobi'i & Talaqqi Surat Al-Fatihah"]
    6. Return ONLY a valid JSON array of strings containing the chapter names. No markdown formatting, no explanation, no backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const raw = response.text?.trim() || '';
    const cleanJson = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => {
        const str = String(item).trim();
        return str.startsWith('Bab ') ? str : `Bab ${idx + 1}: ${str}`;
      });
    }
  } catch (err) {
    console.warn("Using smart reference-aware fallback curriculum generator for:", title, level);
  }

  // Smart domain-aware fallback generator that strictly extracts from description
  return fallbackCurriculumGenerator(title, level, description);
}

function fallbackCurriculumGenerator(title: string, level: string, description: string): string[] {
  // 1. If description contains bullet points, numbered lists, or newlines, parse directly from user text!
  if (description && description.trim().length > 10) {
    const rawLines = description
      .split(/\n|\r|;|\u2022|\*|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map(line => line.replace(/^[\s\-*\d.)\]]+/, '').trim())
      .filter(line => line.length > 4);

    if (rawLines.length >= 3) {
      return rawLines.slice(0, 8).map((line, idx) => `Bab ${idx + 1}: ${line}`);
    }
  }

  const combined = `${title} ${description}`.toLowerCase();

  // 2. Specific domain & reference keyword detection
  if (level === 'Tahsin & Tahfidz' || combined.includes('tahsin') || combined.includes('tahfidz') || combined.includes('quran') || combined.includes('tajwid') || combined.includes('tartil')) {
    if (combined.includes('juz 30') || combined.includes('amma')) {
      return [
        'Bab 1: Adab Tilawah & Fadhilah Menghafal Al-Qur\'an Juz 30',
        'Bab 2: Talaqqi & Makhraj Huruf Surat An-Nas sampai Al-Falaq',
        'Bab 3: Sifat Huruf & Setoran Surat Al-Ikhlas sampai Al-Lahab',
        'Bab 4: Kaidah Ghunnah & Hukum Nun Sukun (Surat An-Nashr s/d Al-Kafirun)',
        'Bab 5: Kaidah Mad Thobi\'i Aplikatif (Surat Al-Kautsar s/d Al-Ma\'un)',
        'Bab 6: Waqaf Ibtida & Muraja\'ah Bersama Surat Quraisy s/d Al-Fil',
        'Bab 7: Setoran Mutqin Surat Adh-Dhuha sampai An-Naba\'',
        'Bab 8: Ujian Komprehensif Tahfidz & Sertifikasi Tartil Juz 30'
      ];
    }
    return [
      'Bab 1: Pengenalan 5 Tempat Makharijul Huruf (Al-Halq & Al-Lisan Dasar)',
      'Bab 2: Karakteristik & Sifat-Sifat Huruf Hijaiyah (Hams, Jahr, Syiddah & Isti\'la)',
      'Bab 3: Kaidah Hukum Nun Sukun & Tanwin (Idzhar, Idgham, Iqlab, Ikhfa)',
      'Bab 4: Kaidah Hukum Mim Sukun & Idgham Mitslain Shaghir',
      'Bab 5: Kaidah Panjang Pendek (Mad Thobi\'i & Mad Far\'i Aplikatif)',
      'Bab 6: Hukum Alif Lam (Syamsiyah & Qamariyah) serta Ro Tarqiq & Tafkhim',
      'Bab 7: Tanda-tanda Waqaf, Washal, dan Saktah dalam Rasm Utsmani',
      'Bab 8: Setoran Talaqqi & Simulasi Uji Tartil Surat-surat Pilihan'
    ];
  }

  if (combined.includes('toefl') || combined.includes('ielts') || combined.includes('grammar')) {
    return [
      'Bab 1: Diagnostic Assessment & Structure Strategy Overview',
      'Bab 2: Subject-Verb Agreement & Clause Connectors Mastery',
      'Bab 3: Inversion, Reduced Relative Clauses & Complex Sentences',
      'Bab 4: Written Expression: Parallel Structure & Word Form Errors',
      'Bab 5: Reading Section: Main Idea & Inference Strategies',
      'Bab 6: Vocabulary in Context & Academic Reference Questions',
      'Bab 7: Full-Length Practice Test & Error Analysis Simulation'
    ];
  }

  if (level === 'Preschool' || combined.includes('phonics') || combined.includes('paud') || combined.includes('anak')) {
    return [
      'Bab 1: Fun Sound Phonics & Pengenalan Vokal (A, E, I, O, U)',
      'Bab 2: Mengenal Huruf Konsonan dengan Nyanyian & Cerita Bergambar',
      'Bab 3: Warna-Warni Dunia: Colors, Shapes & Sensory Matching',
      'Bab 4: Angka Ceria 1-10 & Animal Friends Movement Song',
      'Bab 5: Anggota Tubuh & Family Members Card Game',
      'Bab 6: Mini Storytime: Petualangan Si Kelinci Pintar & Review'
    ];
  }

  if (level === 'Beginner') {
    return [
      'Bab 1: Self Introduction & Percakapan Sapaan Pertama',
      'Bab 2: Classroom Expressions & Pertanyaan Praktis Sehari-hari',
      'Bab 3: Angka, Hari, Bulan, dan Waktu (Telling Time)',
      'Bab 4: My Family, Friends & Describing Appearance',
      'Bab 5: Daily Routines & Action Verbs Sederhana',
      'Bab 6: Role-play Mini Market & Belanja Kebutuhan Harian',
      'Bab 7: Review Komprehensif & Mini Speaking Challenge'
    ];
  }

  if (level === 'Kids') {
    return [
      'Bab 1: Grammar Discovery: Present Continuous & Action Clues',
      'Bab 2: Past Simple Adventure: Menceritakan Liburan & Dongeng',
      'Bab 3: Comparative & Superlative: Faster, Stronger, Smarter',
      'Bab 4: Creative Writing: Merancang Komik & Tokoh Fantasi',
      'Bab 5: Asking for Directions & Eksplorasi Tempat Umum',
      'Bab 6: Public Speaking Cilik: Show and Tell Project'
    ];
  }

  if (level === 'Teenager') {
    return [
      'Bab 1: Expressing Opinions, Debate, & Polite Argumentation',
      'Bab 2: Modern Slang, Collocations, & Natural Native Idioms',
      'Bab 3: 3-Minute TED Talk: Public Speaking & Presentation Skill',
      'Bab 4: Reading Comprehension: Analisis Artikel Sains & Pop Culture',
      'Bab 5: Academic Grammar Hacks & Trik Cepat Ujian Sekolah',
      'Bab 6: Essay Writing Essentials & Paraphrasing Skills'
    ];
  }

  // Adult / General default
  return [
    'Bab 1: Professional Self-Branding & Executive Elevator Pitch',
    'Bab 2: Business Email Etiquette & Professional Correspondence',
    'Bab 3: Meeting Facilitation, Brainstorming & Active Listening',
    'Bab 4: Negotiation Strategies & Persuasive Speaking Practice',
    'Bab 5: Job Interview Mastery & Framework STAR Simulation',
    'Bab 6: Cross-Cultural Fluency & Small Talk with Global Partners',
    'Bab 7: Professional Presentation & Final Capstone Project'
  ];
}
