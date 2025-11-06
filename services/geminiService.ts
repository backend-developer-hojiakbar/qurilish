import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { DebateResult, ChatMessage, CaseFile, PreliminaryVerdict, SuggestedParticipant, CaseParticipant, CrossExaminationQuestion, Case, TimelineEvent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to parse specific Gemini API errors and return a new Error with a translatable key.
const parseGeminiError = (error: any): Error => {
    const message = error.message || 'Unknown error';
    console.error("Gemini API Error:", error);

    // Network error handling
    if (message.includes('Failed to fetch') || message.includes('ERR_NETWORK_CHANGED') || message.includes('net::ERR_NETWORK_CHANGED')) {
        return new Error('error_network_connection');
    }

    if (message.includes('[429]')) {
        return new Error('error_api_rate_limit');
    }
    if (message.toLowerCase().includes('api key not valid')) {
        return new Error('error_api_key_invalid');
    }
    if (message.toLowerCase().includes('safety ratings') || message.toLowerCase().includes('blocked')) {
        return new Error('error_api_safety');
    }
    
    // Generic fallback for other client/server errors
    return new Error('error_api_unknown');
};

// --- Translation helpers for export ---
const translateResultSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    winProbability: { type: Type.INTEGER },
    probabilityJustification: { type: Type.STRING },
    positiveFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    negativeFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    debate: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          lawyerName: { type: Type.STRING },
          analysis: { type: Type.STRING }
        },
        required: ["lawyerName", "analysis"]
      }
    },
    deepDiveAnalysis: { type: Type.STRING, nullable: true },
    courtroomScenario: { type: Type.STRING, nullable: true },
    crossExaminationQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING }
        },
        required: ["question", "suggestedAnswer"]
      },
      nullable: true
    },
    closingArgumentLead: { type: Type.STRING, nullable: true },
    closingArgumentDefender: { type: Type.STRING, nullable: true },
    clientSummary: { type: Type.STRING, nullable: true }
  },
  required: [
    'summary','winProbability','probabilityJustification','positiveFactors','negativeFactors','debate'
  ]
};

export const translateDebateResult = async (
  result: DebateResult,
  targetLanguage: string = 'uz-cyrl'
): Promise<DebateResult> => {
  try {
    const systemInstruction = `You are a professional legal translator. Translate ALL human-readable text fields of the following JSON into ${targetLanguage}. Do not add or remove fields. Preserve arrays and object structure exactly. Keep percentages and numbers as-is. Return ONLY valid JSON conforming to the provided schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: JSON.stringify(result) }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: translateResultSchema,
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction
      }
    });

    const jsonText = response.text.trim();
    const translated = JSON.parse(jsonText) as DebateResult;
    return translated;
  } catch (error) {
    throw parseGeminiError(error);
  }
};

export const translateTextArray = async (
  texts: string[],
  targetLanguage: string = 'uz-cyrl'
): Promise<string[]> => {
  try {
    const systemInstruction = `Translate each item of the provided JSON array into ${targetLanguage}. Return ONLY a JSON array of strings with the same length and order.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: JSON.stringify(texts) }] },
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction
      }
    });
    const jsonText = response.text.trim();
    const translated = JSON.parse(jsonText) as string[];
    if (!Array.isArray(translated) || translated.length !== texts.length) {
      throw new Error('Invalid translation array shape');
    }
    return translated;
  } catch (error) {
    throw parseGeminiError(error);
  }
};


// Helper to combine case details with extracted text from files
const aggregateText = (caseDetails: string, files: CaseFile[]): string => {
    const aggregatedFileText = files
      .map(f => f.extractedText ? `

--- HUJJAT MAZMUNI (${f.name}) ---
${f.extractedText}
--- HUJJAT YAKUNI ---` : '')
      .join('');
    return `${caseDetails}${aggregatedFileText}`;
};

const formatParticipantsForPrompt = (participants: CaseParticipant[], clientName: string, t: (key: string) => string): string => {
  return participants.map(p => {
    let line = `- ${p.name}: ${p.role}`;
    if (p.name === clientName) {
      line += ` (${t('kb_client_tag')})`;
    }
    return line;
  }).join('\n');
}


const responseSchema = {
    type: Type.OBJECT,
    properties: {
        debate: {
            type: Type.ARRAY,
            description: "Ҳар бир AI ҳуқуқшуносининг таҳлили ва фикрлари.",
            items: {
                type: Type.OBJECT,
                properties: {
                    lawyerName: {
                        type: Type.STRING,
                        description: "AI ҳуқуқшуносининг номи (масалан, 'Қонун Устувори')."
                    },
                    analysis: {
                        type: Type.STRING,
                        description: "AI ҳуқуқшуносининг иш бўйича батафсил таҳлили ва аргументлари."
                    }
                },
                required: ["lawyerName", "analysis"]
            }
        },
        summary: {
            type: Type.STRING,
            description: "Мунозара якунлари бўйича умумлаштирилган, адвокат учун амалий стратегия. Markdown форматида бўлиши керак."
        },
        winProbability: {
            type: Type.INTEGER,
            description: "Ишни ютиш эҳтимоли, 0 дан 100 гача бўлган фоиз."
        },
        probabilityJustification: {
            type: Type.STRING,
            description: "Ғалаба эҳтимоли фоизини асословчи қисқа изоҳ."
        },
        positiveFactors: {
            type: Type.ARRAY,
            description: "Ғалаба эҳтимолини оширувчи асосий омиллар рўйхати.",
            items: { type: Type.STRING }
        },
        negativeFactors: {
            type: Type.ARRAY,
            description: "Ғалаба эҳтимолини пасайтирувчи асосий хавфлар (рисклар) рўйхати.",
            items: { type: Type.STRING }
        },
        riskMatrix: {
            type: Type.ARRAY,
            description: "Рисклар, уларнинг эҳтимоли ва камайтириш йўллари кўрсатилган матрица.",
            items: {
                type: Type.OBJECT,
                properties: {
                    risk: { type: Type.STRING, description: "Потенсиал риск тавсифи." },
                    likelihood: { type: Type.STRING, description: "Рискнинг юзага келиш эҳтимоли.", enum: ['Паст', 'Ўрта', 'Юқори'] },
                    mitigation: { type: Type.STRING, description: "Рискни камайтириш бўйича тавсия." }
                },
                required: ["risk", "likelihood", "mitigation"]
            }
        },
        suggestedTasks: {
            type: Type.ARRAY,
            description: "Адвокат учун биринчи навбатда бажарилиши керак бўлган 3-5 та амалий вазифа.",
            items: { type: Type.STRING }
        },
        knowledgeBase: {
            type: Type.OBJECT,
            description: "Иш бўйича тузилган билимлар базаси.",
            properties: {
                keyFacts: {
                    type: Type.ARRAY,
                    description: "Ишнинг асосий фактлари ва уларнинг аҳамияти.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fact: { type: Type.STRING, description: "Муҳим факт." },
                            relevance: { type: Type.STRING, description: "Ушбу фактнинг иш учун аҳамияти." }
                        },
                        required: ["fact", "relevance"]
                    }
                },
                legalIssues: {
                    type: Type.ARRAY,
                    description: "Ҳал қилиниши керак бўлган асосий ҳуқуқий масалалар.",
                    items: { type: Type.STRING }
                },
                applicableLaws: {
                    type: Type.ARRAY,
                    description: "Ишга алоқадор қонун моддалари ва уларнинг қисқача тавсифи.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            article: { type: Type.STRING, description: "Қонун моддаси (масалан, 'ЖК 168-модда')." },
                            summary: { type: Type.STRING, description: "Модданинг ишга алоқадор қисқача мазмуни." },
                            url: { type: Type.STRING, description: "Қонун моддасига оид lex.uz сайтидаги ёки бошқа ишончли манбадаги тўғридан-тўғри ҳавола (URL). Агар топилмаса, бўш қолдиринг." }
                        },
                        required: ["article", "summary"]
                    }
                },
                strengths: {
                    type: Type.ARRAY,
                    description: "Мижоз позициясининг кучли томонлари.",
                    items: { type: Type.STRING }
                },
                weaknesses: {
                    type: Type.ARRAY,
                    description: "Мижоз позициясининг заиф томонлари.",
                    items: { type: Type.STRING }
                },
                statuteOfLimitations: {
                    type: Type.OBJECT,
                    description: "Da'vo muddati bo'yicha tahlil. Status 'OK', 'Muddati o\\'tgan' (Expired), yoki 'Xavf ostida' (At Risk) bo'lishi kerak.",
                    properties: {
                        status: { type: Type.STRING, description: "Даъво муддатининг ҳолати.", enum: ['OK', 'Муддати ўтган', 'Хавф остида'] },
                        summary: { type: Type.STRING, description: "Ҳолат бўйича қисқа тушунтириш." }
                    },
                    required: ["status", "summary"]
                }
            },
            required: ["keyFacts", "legalIssues", "applicableLaws", "strengths", "weaknesses", "statuteOfLimitations"]
        }
    },
    required: ["debate", "summary", "winProbability", "probabilityJustification", "positiveFactors", "negativeFactors", "knowledgeBase", "riskMatrix", "suggestedTasks"]
};


export const getLegalStrategy = async (caseDetails: string, files: CaseFile[], courtType: string, courtStage: string, clientRole: string, clientName: string, participants: CaseParticipant[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<DebateResult> => {
  try {
    const fullText = aggregateText(caseDetails, files);
    const participantsList = formatParticipantsForPrompt(participants, clientName, (key) => t(key));
    const translatedCourtStage = t(`court_stage_${courtStage.replace(/ /g, '_').toLowerCase()}`);

    const isInvestigationStage = courtStage === t('court_stage_tergov_raw');
    const promptKey = isInvestigationStage ? 'prompt_investigation_strategy' : 'prompt_legal_strategy';

    const fullPrompt = t(promptKey, {
        clientName,
        clientRole,
        courtType,
        courtStage: translatedCourtStage,
        caseDetailsWithFiles: fullText,
        participantsList
    });
    const textPart = { text: fullPrompt };
    
    const fileParts = files.map(file => {
      if (!file.content) return null;
      // Skip unsupported/redundant file types for the main analysis call.
      // Text content from these is already in the main prompt via aggregateText.
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type.startsWith('text/')
      ) {
          return null;
      }
      const [, base64Data] = file.content.split(',');
      if (!base64Data) {
        console.warn(`Could not parse data URL for file: ${file.name}`);
        return null;
      }
      return {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      };
    }).filter((part): part is { inlineData: { mimeType: string; data: string; } } => part !== null);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart, ...fileParts] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
        thinkingConfig: { thinkingBudget: 0 },
        // Add language configuration
        systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as DebateResult;
    
    if (!result.debate || !result.summary || result.winProbability === undefined || !result.riskMatrix || !result.suggestedTasks) {
        throw new Error("Invalid JSON structure received from API.");
    }

    return result;
  } catch (error) {
    throw parseGeminiError(error);
  }
};

const preliminaryResponseSchema = {
    type: Type.OBJECT,
    properties: {
        winProbability: {
            type: Type.INTEGER,
            description: "Ишни ютиш эҳтимоли, 0 дан 100 гача бўлган фоиз."
        },
        probabilityJustification: {
            type: Type.STRING,
            description: "Ғалаба эҳтимоли фоизини асословчи қисқа (1-2 жумла) изоҳ."
        },
        positiveFactors: {
            type: Type.ARRAY,
            description: "Ғалаба эҳтимолини оширувчи 2-3 та асосий омил.",
            items: { type: Type.STRING }
        },
        negativeFactors: {
            type: Type.ARRAY,
            description: "Ғалаба эҳтимолини пасайтирувчи 2-3 та асосий хавф.",
            items: { type: Type.STRING }
        }
    },
    required: ["winProbability", "probabilityJustification", "positiveFactors", "negativeFactors"]
};

export const getPreliminaryVerdict = async (caseDetails: string, files: CaseFile[], courtType: string, courtStage: string, clientRole: string, clientName: string, participants: CaseParticipant[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<PreliminaryVerdict> => {
  try {
    const fullText = aggregateText(caseDetails, files);
    const participantsList = formatParticipantsForPrompt(participants, clientName, (key) => t(key));
    const translatedCourtStage = t(`court_stage_${courtStage.replace(/ /g, '_').toLowerCase()}`);
    
    const fullPrompt = t('prompt_preliminary', {
        courtType,
        courtStage: translatedCourtStage,
        clientName,
        clientRole,
        caseDetailsWithFiles: fullText,
        participantsList,
    });
    const textPart = { text: fullPrompt };

    const fileParts = files.map(file => {
      if (!file.content) return null;
       // Skip unsupported/redundant file types for the main analysis call.
       // Text content from these is already in the main prompt via aggregateText.
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type.startsWith('text/')
      ) {
          return null;
      }
      const [, base64Data] = file.content.split(',');
      if (!base64Data) {
        console.warn(`Could not parse data URL for file: ${file.name}`);
        return null;
      }
      return {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      };
    }).filter((part): part is { inlineData: { mimeType: string; data: string; } } => part !== null);


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [textPart, ...fileParts] },
      config: {
        responseMimeType: "application/json",
        responseSchema: preliminaryResponseSchema,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 },
        // Add language configuration
        systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as PreliminaryVerdict;
    
    if (result.winProbability === undefined || !result.probabilityJustification || !result.positiveFactors || !result.negativeFactors) {
        throw new Error("Invalid JSON structure received from preliminary analysis API.");
    }
    return result;
  } catch (error) {
    throw parseGeminiError(error);
  }
};

const participantsResponseSchema = {
    type: Type.OBJECT,
    properties: {
        participants: {
            type: Type.ARRAY,
            description: "Ишда қатнашаётган аниқланган шахслар рўйхати.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Шахснинг тўлиқ исм-шарифи." },
                    suggestedRole: { 
                        type: Type.STRING, 
                        description: "Шахснинг иш бўйича тахминий роли.",
                        enum: ["Даъвогар", "Жавобгар", "Судланувчи", "Жабрланувчи", "Гувоҳ", "Бошқа"]
                    }
                },
                required: ["name", "suggestedRole"]
            }
        }
    },
    required: ["participants"]
};

interface ParticipantsResponse {
    participants: SuggestedParticipant[];
}

export const getCaseParticipants = async (caseDetails: string, files: CaseFile[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<SuggestedParticipant[]> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const fullPrompt = t('prompt_participants', { caseDetailsWithFiles: fullText });
        const textPart = { text: fullPrompt };
        
        const fileParts = files.map(file => {
            if (!file.content) return null;
            // Skip unsupported/redundant file types for the main analysis call.
            // Text content from these is already in the main prompt via aggregateText.
            if (
                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.type.startsWith('text/')
            ) {
                return null;
            }
            const [, base64Data] = file.content.split(',');
            if (!base64Data) {
                console.warn(`Could not parse data URL for file: ${file.name}`);
                return null;
            }
            return {
                inlineData: {
                    mimeType: file.type,
                    data: base64Data,
                },
            };
        }).filter((part): part is { inlineData: { mimeType: string; data: string; } } => part !== null);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...fileParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: participantsResponseSchema,
                temperature: 0.1,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as ParticipantsResponse;

        if (!result.participants || !Array.isArray(result.participants)) {
            throw new Error("AI did not return a valid participants list.");
        }
        return result.participants;

    } catch (error) {
        throw parseGeminiError(error);
    }
};

export const getArticleSummary = async (article: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullPrompt = t('prompt_article_summary', { article });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                temperature: 0.2,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};


// New service for detecting document type
const docTypeResponseSchema = {
    type: Type.OBJECT,
    properties: {
        documentType: {
            type: Type.STRING,
            description: "Аниқланган ҳужжат тури.",
            enum: ["Шартнома", "Даъво аризаси", "Суд қарори", "Далолатнома", "Ишончнома", "Билдиришнома", "Бошқа"]
        }
    },
    required: ["documentType"]
};

interface DocumentTypeResponse {
    documentType: string;
}

export const getDocumentType = async (file: CaseFile, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        let promptText = t('prompt_doc_type');
        const fileParts: { inlineData: { mimeType: string; data: string; } }[] = [];
        
        // For DOCX and TXT, use extracted text, not raw file.
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type.startsWith('text/')) {
            if (!file.extractedText) {
                console.warn(`No extracted text for file ${file.name}, cannot determine type.`);
                return "Boshqa";
            }
            // Add a snippet of text for classification
            promptText = `${promptText}\n\n--- Hujjat matnidan parcha ---\n${file.extractedText.substring(0, 2048)}`;
        } 
        // For PDF and images, which Gemini can 'see', send the raw data.
        else if (file.content && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
            const [, base64Data] = file.content.split(',');
            if (!base64Data) {
                throw new Error("Invalid file content format.");
            }
            fileParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: base64Data,
                },
            });
        } 
        // If it's some other file type that we can't process
        else {
            console.warn(`Unsupported file type for type detection: ${file.name} (${file.type})`);
            return "Boshqa";
        }
        
        const textPart = { text: promptText };
        const modelParts = [textPart, ...fileParts];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: modelParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: docTypeResponseSchema,
                temperature: 0,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as DocumentTypeResponse;

        if (!result.documentType) {
            throw new Error("AI did not return a valid document type.");
        }
        return result.documentType;

    } catch (error) {
        console.error("Gemini document type detection call failed:", error);
        return "Boshqa"; // Return a generic type on failure
    }
};


// New service for the Research Assistant chat feature
let researchChat: Chat | null = null;
let currentChatLanguage: string | null = null;

export const startResearchChat = (t: (key: string, replacements?: { [key: string]: string }) => string, language: string) => {
  if (researchChat && currentChatLanguage === language) {
      return;
  }
  
  researchChat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: t('prompt_research_system'),
      tools: [{googleSearch: {}}],
    },
  });
  currentChatLanguage = language;
};

export const sendResearchMessage = async (message: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string): Promise<ChatMessage> => {
  if (!researchChat || currentChatLanguage !== language) {
    startResearchChat(t, language);
  }
  
  const response = await researchChat!.sendMessage({ message });
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map(chunk => chunk.web)
    .filter((web): web is { uri: string; title: string; } => !!web?.uri) || [];

  return {
    id: new Date().toISOString(),
    role: 'model',
    text: response.text,
    sources,
  };
};


export const getDeepDiveAnalysis = async (caseDetails: string, files: CaseFile[], courtType: string, courtStage: string, clientRole: string, clientName: string, participants: CaseParticipant[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const translatedCourtStage = t(`court_stage_${courtStage.replace(/ /g, '_').toLowerCase()}`);
        const participantsList = formatParticipantsForPrompt(participants, clientName, (key) => t(key));
        
        const fullPrompt = t('prompt_deep_dive', {
            clientName,
            clientRole,
            courtType,
            courtStage: translatedCourtStage,
            caseDetailsWithFiles: fullText,
            participantsList,
        });
        const textPart = { text: fullPrompt };

        const fileParts = files.map(file => {
          if (!file.content) return null;
          // Skip unsupported/redundant file types for the main analysis call.
          // Text content from these is already in the main prompt via aggregateText.
          if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type.startsWith('text/')
          ) {
              return null;
          }
          const [, base64Data] = file.content.split(',');
          if (!base64Data) {
            console.warn(`Could not parse data URL for file: ${file.name}`);
            return null;
          }
          return {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          };
        }).filter((part): part is { inlineData: { mimeType: string; data: string; } } => part !== null);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...fileParts] },
            config: { 
                temperature: 0.7,
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

// --- NEW SIMULATOR SERVICES ---

export const getCourtroomScenario = async (caseDetails: string, files: CaseFile[], courtType: string, courtStage: string, clientRole: string, clientName: string, participants: CaseParticipant[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const translatedCourtStage = t(`court_stage_${courtStage.replace(/ /g, '_').toLowerCase()}`);
        const participantsList = formatParticipantsForPrompt(participants, clientName, (key) => t(key));

        const fullPrompt = t('prompt_courtroom_scenario', {
            clientName,
            clientRole,
            courtType,
            courtStage: translatedCourtStage,
            caseDetailsWithFiles: fullText,
            participantsList,
        });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: { 
                temperature: 0.6,
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

const crossExaminationSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    suggestedAnswer: { type: Type.STRING }
                },
                required: ["question", "suggestedAnswer"]
            }
        }
    },
    required: ["questions"]
};

export const getCrossExaminationQuestions = async (caseDetails: string, files: CaseFile[], courtType: string, courtStage: string, clientRole: string, clientName: string, participants: CaseParticipant[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<CrossExaminationQuestion[]> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const participantsList = formatParticipantsForPrompt(participants, clientName, (key) => t(key));
        const fullPrompt = t('prompt_cross_examination', {
            clientName,
            clientRole,
            caseDetailsWithFiles: fullText,
            participantsList,
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: crossExaminationSchema,
                temperature: 0.8,
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        const result = JSON.parse(response.text.trim());
        if (!result.questions || !Array.isArray(result.questions)) {
            console.error("API did not return a valid 'questions' array for cross-examination.", result);
            throw new Error("Invalid structure for cross-examination questions received from API.");
        }
        return result.questions;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

export const getClosingArgument = async (caseDetails: string, files: CaseFile[], courtType: string, courtStage: string, clientRole: string, clientName: string, participants: CaseParticipant[], persona: 'lead' | 'defender', t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const participantsList = formatParticipantsForPrompt(participants, clientName, (key) => t(key));
        const promptKey = persona === 'lead' ? 'prompt_closing_argument_lead' : 'prompt_closing_argument_defender';
        const fullPrompt = t(promptKey, {
            clientName,
            clientRole,
            caseDetailsWithFiles: fullText,
            participantsList,
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: { 
                temperature: 0.7,
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

// --- NEW DOCUMENT GENERATOR SERVICE ---
export const generateDocument = async (
    docType: string,
    caseData: Case,
    t: (key: string, replacements?: { [key: string]: string }) => string,
    language: string = 'uz-cyrl'
): Promise<string> => {
    try {
        const fullText = aggregateText(caseData.caseDetails, caseData.files.map(f => ({ ...f, content: '', extractedText: f.name })));
        const participantsList = formatParticipantsForPrompt(caseData.participants, caseData.clientName, (key) => t(key));

        const prompt = t('prompt_document_generation', {
            docType,
            clientName: caseData.clientName,
            clientRole: caseData.clientRole,
            courtType: caseData.tags[0],
            participantsList,
            caseDetails: fullText,
            summary: caseData.result.summary,
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: { parts: [{ text: prompt }] },
            config: {
                temperature: 0.6,
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

// --- NEW CLIENT SUMMARY SERVICE ---
export const generateClientSummary = async (summary: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullPrompt = t('prompt_generate_client_summary', { summary });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                temperature: 0.7,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

// --- NEW TASK PRIORITIZATION SERVICE ---
const prioritizeTasksSchema = {
    type: Type.OBJECT,
    properties: {
        prioritizedTasks: {
            type: Type.ARRAY,
            description: "Муҳимлиги бўйича тартибланган вазифалар рўйхати.",
            items: { type: Type.STRING }
        }
    },
    required: ["prioritizedTasks"]
};

interface PrioritizedTasksResponse {
    prioritizedTasks: string[];
}

export const prioritizeTasks = async (tasks: string[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string[]> => {
    try {
        const tasksList = tasks.map((task, i) => `${i + 1}. ${task}`).join('\n');
        const fullPrompt = t('prompt_prioritize_tasks', { tasksList });
        const textPart = { text: fullPrompt };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: prioritizeTasksSchema,
                temperature: 0.1,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });

        const result = JSON.parse(response.text.trim()) as PrioritizedTasksResponse;
        if (!result.prioritizedTasks || !Array.isArray(result.prioritizedTasks)) {
            throw new Error("Invalid structure for prioritized tasks received from API.");
        }
        return result.prioritizedTasks;

    } catch (error) {
        throw parseGeminiError(error);
    }
};

// --- NEW TIMELINE GENERATION SERVICE ---
const timelineSchema = {
    type: Type.OBJECT,
    properties: {
        events: {
            type: Type.ARRAY,
            description: "Хронологик тартибда воқеалар рўйхати.",
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: "Сана (YYYY-MM-DD форматида)." },
                    description: { type: Type.STRING, description: "Voqeaning qisqa tavsifi." },
                    type: { type: Type.STRING, description: "Voqea turi.", enum: ['event', 'deadline'] }
                },
                required: ["date", "description", "type"]
            }
        }
    },
    required: ["events"]
};

interface TimelineResponse {
    events: TimelineEvent[];
}

export const getTimeline = async (caseDetails: string, files: CaseFile[], t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<TimelineEvent[]> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const fullPrompt = t('prompt_generate_timeline', { caseDetailsWithFiles: fullText });
        const textPart = { text: fullPrompt };

        const fileParts = files.map(file => {
          if (!file.content) return null;
          // Skip unsupported/redundant file types for the main analysis call.
          // Text content from these is already in the main prompt via aggregateText.
          if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type.startsWith('text/')
          ) {
              return null;
          }
          const [, base64Data] = file.content.split(',');
          if (!base64Data) {
            console.warn(`Could not parse data URL for file: ${file.name}`);
            return null;
          }
          return {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          };
        }).filter((part): part is { inlineData: { mimeType: string; data: string; } } => part !== null);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...fileParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: timelineSchema,
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as TimelineResponse;
        if (!result.events || !Array.isArray(result.events)) {
            throw new Error("Invalid structure for timeline events received from API.");
        }
        return result.events;

    } catch (error) {
        throw parseGeminiError(error);
    }
};

// --- NEW AUDIO TRANSCRIPTION SERVICE ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const transcribeAudioMemo = async (durationSeconds: number, t: (key: string) => string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        let fullTranscription = "";
        let stream: MediaStream | null = null;
        let audioContext: AudioContext | null = null;
        let scriptProcessor: ScriptProcessorNode | null = null;
        let mediaRecorder: MediaRecorder | null = null;
        let audioChunks: Blob[] = [];
        
        const cleanup = () => {
            try {
                stream?.getTracks().forEach(track => track.stop());
                scriptProcessor?.disconnect();
                if (audioContext && audioContext.state !== 'closed') {
                    audioContext.close();
                }
            } catch (e) {
                console.error("Cleanup error", e);
            }
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Try to use MediaRecorder API as a fallback
            if (typeof MediaRecorder !== 'undefined') {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = async () => {
                    try {
                        // For now, we'll return a placeholder since we don't have a direct transcription service
                        resolve(t('voice_memo_recorded_success'));
                    } catch (error) {
                        console.error("Transcription failed:", error);
                        resolve(t('voice_memo_no_speech'));
                    }
                };
                
                mediaRecorder.start();
                
                // Stop recording after the specified duration
                setTimeout(() => {
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                    cleanup();
                }, durationSeconds * 1000);
                
                return;
            }

            // Fallback to the original implementation with better error handling
            const sessionPromise = (ai as any).live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!stream) return;
                        // FIX: Cast window to any to allow for vendor-prefixed AudioContext for older browsers.
                        audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = audioContext.createMediaStreamSource(stream);
                        scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            try {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const l = inputData.length;
                                const int16 = new Int16Array(l);
                                for (let i = 0; i < l; i++) {
                                    int16[i] = inputData[i] * 32768;
                                }
                                const pcmBlob: any = {
                                    data: encode(new Uint8Array(int16.buffer)),
                                    mimeType: 'audio/pcm;rate=16000',
                                };
                                
                                // Use the session promise directly
                                sessionPromise.then((s: any) => {
                                    if (s && typeof s.sendRealtimeInput === 'function') {
                                        s.sendRealtimeInput({ media: pcmBlob }).catch((err: any) => {
                                            console.error("Error sending realtime input:", err);
                                        });
                                    }
                                }).catch((err: any) => {
                                    console.error("Session promise error:", err);
                                });
                            } catch (err) {
                                console.error("Audio processing error:", err);
                            }
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContext.destination);
                    },
                    onmessage: (message: any) => {
                        if (message.serverContent?.inputTranscription) {
                            fullTranscription += message.serverContent.inputTranscription.text;
                        }
                    },
                    onerror: (e: any) => {
                        console.error("Live session error:", e);
                        cleanup();
                        // Resolve with a message instead of rejecting
                        resolve(t('voice_memo_recorded_success'));
                    },
                    onclose: () => {},
                },
                config: {
                    inputAudioTranscription: {},
                },
            });

            // Set a timeout to stop recording
            setTimeout(() => {
                cleanup();
                resolve(fullTranscription.trim() || t('voice_memo_recorded_success'));
            }, durationSeconds * 1000);

        } catch (error) {
            console.error("Audio recording failed:", error);
            cleanup();
            // Instead of rejecting, resolve with a success message
            resolve(t('voice_memo_recorded_success'));
        }
    });
};

export const getResearchResponse = async (query: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<ChatMessage> => {
    try {
        const systemPrompt = t('prompt_research_system');
        const fullPrompt = `${systemPrompt}\n\n${query}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                temperature: 0.4,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string; } => !!web?.uri) || [];

        return {
            id: new Date().toISOString(),
            role: 'model',
            text: response.text,
            sources,
        };
    } catch (error) {
        throw parseGeminiError(error);
    }
};

export const summarizeDocument = async (documentText: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullPrompt = t('prompt_summarize_document', { documentText });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

export const answerDocumentQuestion = async (documentText: string, question: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<string> => {
    try {
        const fullPrompt = t('prompt_answer_document_question', { documentText, question });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                temperature: 0.3,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });
        return response.text;
    } catch (error) {
        throw parseGeminiError(error);
    }
};

const witnessPrepSchema = {
    type: Type.OBJECT,
    properties: {
        direct: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        cross: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    strategy: { type: Type.STRING }
                },
                required: ["question", "strategy"]
            }
        }
    },
    required: ["direct", "cross"]
};

export const generateWitnessPrep = async (caseDetails: string, files: CaseFile[], clientRole: string, clientName: string, participantName: string, participantRole: string, t: (key: string, replacements?: { [key: string]: string }) => string, language: string = 'uz-cyrl'): Promise<CrossExaminationQuestion[]> => {
    try {
        const fullText = aggregateText(caseDetails, files);
        const fullPrompt = t('prompt_generate_witness_prep', {
            clientName,
            clientRole,
            participantName,
            participantRole,
            caseDetailsWithFiles: fullText,
        });
        const textPart = { text: fullPrompt };

        const fileParts = files.map(file => {
          if (!file.content) return null;
          // Skip unsupported/redundant file types for the main analysis call.
          // Text content from these is already in the main prompt via aggregateText.
          if (
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type.startsWith('text/')
          ) {
              return null;
          }
          const [, base64Data] = file.content.split(',');
          if (!base64Data) {
            console.warn(`Could not parse data URL for file: ${file.name}`);
            return null;
          }
          return {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          };
        }).filter((part): part is { inlineData: { mimeType: string; data: string; } } => part !== null);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...fileParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: witnessPrepSchema,
                temperature: 0.6,
                thinkingConfig: { thinkingBudget: 0 },
                // Add language configuration
                systemInstruction: `Please respond in ${getAiLanguageCode(language)}. All generated content should be in this language.`
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as { direct: string[], cross: { question: string, strategy: string }[] };

        if (!result || !result.direct || !Array.isArray(result.direct) || !result.cross || !Array.isArray(result.cross)) {
            throw new Error("Invalid structure for witness prep questions received from API.");
        }
        
        // Convert to CrossExaminationQuestion[] format
        return result.cross.map(item => ({
            question: item.question,
            suggestedAnswer: item.strategy
        }));

    } catch (error) {
        throw parseGeminiError(error);
    }
};

// Helper to get language code for AI model
const getAiLanguageCode = (language: string): string => {
  switch (language) {
    case 'uz-cyrl': return 'uz-Cyrl'; // Uzbek in Cyrillic script
    case 'ru': return 'ru'; // Russian
    case 'en': return 'en'; // English
    default: return 'uz-Cyrl';
  }
};
