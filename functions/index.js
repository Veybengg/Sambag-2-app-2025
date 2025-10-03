// functions/index.js
const { onCall } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

exports.chatWithGemini = onCall(async (request) => {
  try {
    // Initialize Gemini AI INSIDE the function to avoid timeout during deployment
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const { message, conversationHistory } = request.data;

    if (!message) {
      throw new Error('Message is required');
    }

    // Get barangay information from Firestore
    const barangaySnapshot = await admin.firestore()
      .collection('barangayInfo')
      .get();
    
    let barangayInfo = '';
    barangaySnapshot.forEach(doc => {
      const data = doc.data();
      barangayInfo += `\nBarangay: ${data.name || 'N/A'}
Location: ${data.location || 'N/A'}
Contact: ${data.contactNumber || 'N/A'}
Captain: ${data.captain || 'N/A'}
Emergency Hotline: ${data.emergencyHotline || 'N/A'}
Services: ${data.services?.join(', ') || 'N/A'}
---`;
    });

    // System prompt with context
    const systemPrompt = `You are an AI Emergency Assistant for a barangay emergency response app. Your role is to:

1. **Emergency Assistance**: Provide immediate, accurate guidance for emergencies (medical, fire, natural disasters, crimes, etc.). Always prioritize safety and recommend calling emergency services when necessary.

2. **App Information**: Answer questions about app features including:
   - Emergency reporting and tracking
   - Real-time incident updates
   - Barangay services directory
   - Safety tips and preparedness guides
   - Community announcements
   - Contact emergency responders

3. **Barangay Information**: Provide accurate information about the barangay using this data:
${barangayInfo}

**Guidelines:**
- Be concise, clear, and professional
- In life-threatening situations, immediately advise calling emergency services
- Provide step-by-step instructions for emergencies
- Use simple language that everyone can understand
- Be empathetic and reassuring
- If you don't know something specific about the barangay, admit it and suggest contacting barangay officials
- Never provide medical diagnoses, only first-aid guidance

**Emergency Response Priority:**
1. Assess danger level
2. Recommend immediate action (call emergency services if critical)
3. Provide first-aid or safety steps
4. Suggest using the app to report the incident

Always maintain a helpful, professional, and calm tone.`;

    // Initialize the model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    // Build conversation history for context
    const history = conversationHistory
      ?.filter(msg => msg.role === 'user' || (msg.role === 'model' && msg.parts))
      .slice(0, -1)
      .map(msg => ({
        role: msg.role,
        parts: msg.parts,
      })) || [];

    // Start chat with history
    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return {
      response: text,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

  } catch (error) {
    console.error('Error in chatWithGemini:', error);
    throw new Error('An error occurred while processing your request: ' + error.message);
  }
});