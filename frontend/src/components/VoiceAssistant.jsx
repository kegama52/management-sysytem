import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoice } from '../context/VoiceContext';
import VoiceWaveform from './VoiceWaveform';
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

/**
 * VoiceAssistant - Complete voice control for TIISGS
 * Features:
 * - Speech-to-text for input
 * - Text-to-speech for AI responses
 * - Real-time waveform visualization
 * - Voice commands (stop, clear, open, search)
 * - Language toggle (English/Swahili)
 */
export default function VoiceAssistant({ onSendMessage, lastResponse, isProcessing }) {
  const navigate = useNavigate();
  const audioStreamRef = useRef(null);
  const pendingTranscriptRef = useRef('');

  const {
    isListening,
    isSpeaking,
    transcript,
    voices,
    selectedVoice,
    setSelectedVoice,
    language,
    setLanguage,
    voiceEnabled,
    toggleVoiceEnabled,
    error,
    setError,
    startListening,
    stopListening,
    speakText,
    cancelSpeech,
    detectWakeWord,
    analyser
  } = useVoice();

  // Send transcript as message when user stops speaking
  useEffect(() => {
    if (!isListening && transcript) {
      // Debounce: Wait a moment before sending
      const timer = setTimeout(() => {
        onSendMessage(transcript);
        pendingTranscriptRef.current = '';
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, onSendMessage]);

  // Read AI responses aloud
  useEffect(() => {
    if (lastResponse && voiceEnabled && !isProcessing) {
      // Extract clean text (remove markdown formatting for speech)
      const cleanText = lastResponse
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/`(.*?)`/g, '$1')       // Remove code
        .replace(/\n/g, '. ')             // Replace newlines with pauses
        .replace(/•/g, '. ');             // Replace bullets

      // React after a brief pause
      setTimeout(() => speakText(cleanText), 500);
    }
  }, [lastResponse, voiceEnabled, isProcessing, speakText]);

  // Voice command handling
  useEffect(() => {
    if (!transcript) return;

    const cmds = {
      'stop listening': () => stopListening(),
      'stop speaking': () => cancelSpeech(),
      'clear chat': () => {
        // This should be handled by parent - we'll just clear local
        setTranscript('');
      },
      'open ticket': () => navigate('/tickets/new'),
      'open dashboard': () => navigate('/dashboard'),
      'open knowledge base': () => navigate('/knowledge-base'),
      'switch to english': () => setLanguage('en'),
      'switch to swahili': () => setLanguage('sw')
    };

    const lowerTranscript = transcript.toLowerCase();

    // Check for wake words first
    if (detectWakeWord(lowerTranscript)) {
      // Could trigger greeting
      return;
    }

    // Check for commands
    for (const [phrase, action] of Object.entries(cmds)) {
      if (lowerTranscript.includes(phrase)) {
        action();
        setTranscript(''); // Clear command from chat
        break;
      }
    }
  }, [transcript, detectWakeWord, stopListening, cancelSpeech, navigate, setLanguage]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setError(null);
      startListening();
    }
  };

  const handleSpeakerClick = () => {
    if (isSpeaking) {
      cancelSpeech();
    } else if (lastResponse) {
      speakText(lastResponse.replace(/[#*`]/g, '').replace(/\n/g, '. '));
    }
  };

  const getMicButtonState = () => {
    if (isListening) return 'listening';
    if (error) return 'error';
    return 'idle';
  };

  const buttonState = getMicButtonState();

  return (
    <div className="voice-assistant relative">
      {/* Main Control Bar */}
      <div className="flex items-center gap-2 mb-2">
        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={isListening || isSpeaking}
          className="text-xs px-2 py-1 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="en">🇺🇸 EN</option>
          <option value="sw">🇰🇪 SW</option>
        </select>

        {/* Voice Enabled Toggle */}
        <button
          onClick={toggleVoiceEnabled}
          disabled={isListening || isSpeaking}
          className={`p-2 rounded-full transition-colors ${
            voiceEnabled
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={voiceEnabled ? 'Voice assistant on' : 'Voice assistant off'}
        >
          {voiceEnabled ? <SpeakerWaveIcon className="h-4 w-4" /> : <SpeakerXMarkIcon className="h-4 w-4" />}
        </button>

        {/* Main Microphone Button */}
        <button
          onClick={handleMicClick}
          disabled={!voiceEnabled || isSpeaking}
          className={`relative p-3 rounded-full transition-all duration-300 ${
            buttonState === 'listening'
              ? 'bg-red-500 text-white animate-pulse shadow-lg scale-110'
              : buttonState === 'error'
              ? 'bg-yellow-500 text-white hover:bg-yellow-600'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
          title={
            error
              ? `Error: ${error}`
              : isListening
              ? 'Click to stop listening'
              : 'Click to speak'
          }
        >
          <MicrophoneIcon className="h-6 w-6" />
          {isListening && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </span>
          )}
        </button>

        {/* Stop Speaking Button (when AI is reading) */}
        {isSpeaking && (
          <button
            onClick={cancelSpeech}
            className="p-2 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
            title="Stop speaking"
          >
            <StopIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Real-time Transcript */}
      {isListening && transcript && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 italic">
          "{transcript}"
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Waveform Visualization */}
      {isListening && (
        <VoiceWaveform
          isActive={isListening}
          audioStream={audioStreamRef.current || null}
        />
      )}

      {/* Status Text */}
      <p className="text-xs text-gray-500 mt-1">
        {isListening ? (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Listening... (speak your question)
          </span>
        ) : isSpeaking ? (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Speaking... (AI is responding)
          </span>
        ) : voiceEnabled ? (
          <span>Click microphone to speak</span>
        ) : (
          <span className="text-gray-400">Voice assistant disabled</span>
        )}
      </p>

      {/* Voice Commands Help */}
      <div className="mt-2 text-xs text-gray-400">
        Commands: "Stop listening" • "Stop speaking" • "Clear chat" • "Open ticket"
      </div>
    </div>
  );
}
