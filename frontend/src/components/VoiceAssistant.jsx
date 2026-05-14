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
  audioStreamRef = useRef(null);
  const pendingTranscriptRef = useRef('');
  const spokenResponseRef = useRef(''); // Track what we've already spoken to avoid repeats

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

  // Track last response to avoid duplicate TTS
  useEffect(() => {
    if (lastResponse && lastResponse !== spokenResponseRef.current) {
      spokenResponseRef.current = lastResponse;
    }
  }, [lastResponse]);

  // Send transcript as message when user stops speaking
  useEffect(() => {
    if (!isListening && transcript && transcript !== pendingTranscriptRef.current) {
      pendingTranscriptRef.current = transcript;
      // Reset spoken response tracker for new turn
      spokenResponseRef.current = '';
      const timer = setTimeout(() => {
        if (transcript.trim()) {
          onSendMessage(transcript);
          pendingTranscriptRef.current = '';
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, onSendMessage]);

  // Read AI responses aloud + prevent feedback loop
  useEffect(() => {
    if (lastResponse && voiceEnabled && !isProcessing && lastResponse !== spokenResponseRef.current) {
      // Mark as spoken to prevent duplicate TTS
      spokenResponseRef.current = lastResponse;

      // CRITICAL: Stop listening to prevent AI voice → microphone → AI responds again (infinite loop)
      if (isListening) {
        stopListening();
      }

      // Clean markdown formatting for speech
      const cleanText = lastResponse
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic
        .replace(/`(.*?)`/g, '$1')       // Remove code
        .replace(/\n/g, '. ')             // Replace newlines with pauses
        .replace(/•/g, '. ')              // Replace bullets
        .replace(/\*/g, '');              // Remove asterisks

      // Speak after a brief pause
      const timer = setTimeout(() => {
        speakText(cleanText);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [lastResponse, voiceEnabled, isProcessing, isListening, speakText, stopListening]);

  // Voice command handling
  useEffect(() => {
    if (!transcript) return;

    const cmds = {
      'stop listening': () => stopListening(),
      'stop speaking': () => cancelSpeech(),
      'clear chat': () => setTranscript(''),
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

  const requestPermission = async () => {
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        setError('⚠️ Microphone requires HTTPS or localhost.\n\nYou are currently on: ' + window.location.origin + '\n\nIn production, TIISGS must be served over HTTPS for voice features to work.');
        return;
      }

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('❌ Your browser does not support microphone access.\n\nPlease use:\n• Chrome 25+\n• Edge 79+\n• Safari 14+\n• Firefox 36+');
        return;
      }

      // Request permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      // Clean up the test stream - we'll request properly in startListening
      stream.getTracks().forEach(track => track.stop());

      // Permission granted - start listening
      startListening();
    } catch (err) {
      console.error('Microphone permission error:', err);
      let msg = '❌ Failed to access microphone.\n\n';

      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          msg += 'You blocked microphone access.\n\n📌 HOW TO FIX:\n1. Click the 🔒 (lock) icon in browser address bar\n2. Find "Microphone" permission\n3. Change from "Block" to "Allow"\n4. Refresh this page\n5. Click the microphone button again';
          break;
        case 'NotFoundError':
          msg += 'No microphone detected.\n\n✓ Check if your mic is plugged in\n✓ Check Windows/Mac sound settings\n✓ Try a different browser';
          break;
        case 'NotReadableError':
          msg += 'Microphone is already in use.\n\n✓ Close Zoom, Teams, Discord, or other apps using mic\n✓ Refresh this page and try again';
          break;
        case 'OverconstrainedError':
          msg += 'Your microphone does not meet requirements.\n\nTry:\n• Use a different microphone\n• Use headphones with built-in mic';
          break;
        case 'SecurityError':
          msg += 'Security error. Microphone access blocked.\n\n✓ Use HTTPS or localhost\n✓ Check browser security settings';
          break;
        default:
          msg += `Error: ${err.name}\n${err.message}`;
      }

      setError(msg);
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

        {/* Main Microphone Button - disabled while AI is speaking */}
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
              : isSpeaking
              ? 'AI is speaking... wait or click stop'
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
        <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div className="flex-1 whitespace-pre-line">{error}</div>
            <button
              onClick={requestPermission}
              className="ml-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex-shrink-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Microphone Blocked Help */}
      {error && (error.includes('denied') || error.includes('allow')) && (
        <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <strong>Quick fix:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Click the 🔒 (lock) icon left of the URL in your browser</li>
            <li>Find "Microphone" in the dropdown</li>
            <li>Change from "Block" to "Allow"</li>
            <li>Refresh the page and try again</li>
          </ol>
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
            Listening... (speak now)
          </span>
        ) : isSpeaking ? (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            AI is speaking... (click stop to interrupt)
          </span>
        ) : voiceEnabled && transcript ? (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Press Enter or click mic to send
          </span>
        ) : voiceEnabled ? (
          <span>Click microphone to speak</span>
        ) : (
          <span className="text-gray-400">Voice assistant disabled</span>
        )}
      </p>

      {/* Feedback prevention notice */}
      {isSpeaking && (
        <p className="text-xs text-amber-600 mt-1">
          💡 Microphone is paused while AI speaks to prevent feedback. Click mic to speak again after response.
        </p>
      )}

      {/* Voice Commands Help */}
      <div className="mt-2 text-xs text-gray-400">
        Commands: "Stop listening" • "Stop speaking" • "Clear chat" • "Open ticket"
      </div>
    </div>
  );
}
