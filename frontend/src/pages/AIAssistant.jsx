import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useVoice } from '../context/VoiceContext';
import VoiceAssistant from '../components/VoiceAssistant';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  LightBulbIcon,
  BookOpenIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline'

export default function AIAssistantPage() {
  const [query, setQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiFaqs, setAiFaqs] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const { voiceEnabled, language, isSpeaking, speakText, cancelSpeech } = useVoice();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, aiSuggestions]);

  // Auto-speak AI responses when they arrive (if voice enabled)
  useEffect(() => {
    if (aiMessage && !aiLoading && voiceEnabled && !isSpeaking) {
      // Clean markdown for speech
      const cleanText = aiMessage
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/`(.*?)`/g, '$1')       // Remove code
        .replace(/\n/g, '. ')             // Replace newlines with pauses
        .replace(/•/g, '. ')              // Replace bullets
        .replace(/\*/g, '');              // Remove remaining asterisks

      // Speak after brief pause
      const timer = setTimeout(() => {
        speakText(cleanText);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [aiMessage, aiLoading, voiceEnabled, isSpeaking, speakText]);

  // Stop speaking when new user message is sent
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    // Cancel any ongoing TTS
    cancelSpeech();

    const userQuery = text.trim();
    setAiLoading(true);
    setAiMessage('');
    setAiSuggestions([]);
    setAiFaqs([]);

    // Add user message to chat
    setChatHistory(prev => [...prev, {
      type: 'user',
      text: userQuery,
      timestamp: new Date().toISOString()
    }]);

    try {
      const response = await axios.post('/api/ai/chat', {
        query: userQuery,
        userId: 'current-user'
      });

      const data = response.data;

      setAiSuggestions(data.suggestions || []);
      setAiFaqs(data.faqs || []);
      setAiMessage(data.message || '');

      // Add AI response to chat
      setChatHistory(prev => [...prev, {
        type: 'ai',
        text: data.message,
        suggestions: data.suggestions,
        faqs: data.faqs,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('AI consultation failed:', error);
      const errorMsg = 'Sorry, I encountered an error. Please try again or create a ticket.';
      setAiMessage(errorMsg);
      setChatHistory(prev => [...prev, {
        type: 'ai',
        text: errorMsg,
        suggestions: [],
        faqs: [],
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(query);
    setQuery('');
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.title);
    handleSendMessage(suggestion.title);
  };

  const handleFaqClick = (faq) => {
    setQuery(faq.title);
    handleSendMessage(faq.title);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-600 mt-1">
            Ask me anything about ICT support, IFMIS, G-Pay, or government service standards.
            {voiceEnabled && ` Language: ${language === 'en' ? 'English' : 'Swahili'}`}
          </p>
        </div>
        <Link to="/dashboard" className="btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      {/* Voice Assistant Section */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Voice-Enabled Support</h2>
        </div>

        <VoiceAssistant
          onSendMessage={handleSendMessage}
          lastResponse={aiMessage}
          isProcessing={aiLoading}
        />
      </div>

      {/* Text Input Alternative */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Or type your question</h2>
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="E.g., How do I reset IFMIS password? Printer offline? G-Pay slow?"
            className="flex-1 form-input"
            disabled={aiLoading}
          />
          <button
            type="submit"
            disabled={aiLoading || !query.trim()}
            className="btn-primary flex items-center gap-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>

      {/* Chat History */}
      {chatHistory.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation History</h2>
          <div className="space-y-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Consulting knowledge base...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LightBulbIcon className="h-5 w-5 text-yellow-500" />
            Suggested Solutions
          </h2>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{suggestion.content.substring(0, 150)}...</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        suggestion.priorityLevel <= 2 ? 'bg-red-100 text-red-700' :
                        suggestion.priorityLevel === 3 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        Priority {suggestion.priorityLevel}
                      </span>
                      <span className="text-xs text-gray-500">{suggestion.category}</span>
                    </div>
                  </div>
                  <BookOpenIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      {aiFaqs.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Related FAQs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiFaqs.map((faq, idx) => (
              <button
                key={idx}
                onClick={() => handleFaqClick(faq)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <h4 className="font-medium text-blue-600 text-sm">{faq.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{faq.category}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Banner */}
      {!aiMessage && chatHistory.length === 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-blue-900">How to use the AI Assistant</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• Click the microphone and speak naturally ("IFMIS won't let me login")</li>
                <li>• Ask about specific issues: "printer offline", "certificate expired", "G-Pay timeout"</li>
                <li>• Use voice commands: "Stop listening", "Open ticket", "Switch to Swahili"</li>
                <li>• The AI searches the Knowledge Base and returns relevant solutions</li>
                <li>• If no solution is found, you'll be prompted to create a ticket</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
