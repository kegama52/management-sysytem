import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const VoiceContext = createContext(null);

/**
 * VoiceContext
 * Manages speech recognition & synthesis globally
 * Persists preferences to localStorage
 */
export function VoiceProvider({ children }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [language, setLanguage] = useState('en');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState(null);

  // Refs to maintain stable instances
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize speech synthesis voices
  useEffect(() => {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Load saved preference or default to English
      const savedVoice = localStorage.getItem('preferredVoice');
      const savedLang = localStorage.getItem('voiceLanguage') || 'en';

      setLanguage(savedLang);

      if (savedVoice && availableVoices.find(v => v.name === savedVoice)) {
        setSelectedVoice(availableVoices.find(v => v.name === savedVoice));
      } else {
        // Prefer Kenyan/South African English, then British, then any English
        const preferred = availableVoices.find(v =>
          v.lang.includes('en-KE') ||
          v.lang.includes('en-ZA') ||
          v.lang.includes('en-GB') ||
          v.lang.startsWith('en')
        );
        setSelectedVoice(preferred || availableVoices[0]);
      }
    };

    // Voices load asynchronously in some browsers
    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Load saved preferences
    const savedEnabled = localStorage.getItem('voiceEnabled');
    if (savedEnabled !== null) {
      setVoiceEnabled(savedEnabled === 'true');
    }
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return null;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Language mapping
    const langMap = {
      'en': 'en-US', // Fallback to US English (closest neutral)
      'sw': 'sw-KE', // Swahili (Kenya)
      'en-KE': 'en-GB' // Prefer British English for Kenyan context
    };

    recognition.lang = langMap[language] || 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(prev => prev + finalTranscript);
      // For interim results, could send to parent via callback
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let msg = 'Voice recognition error';
      switch (event.error) {
        case 'no-speech':
          msg = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          msg = 'No microphone found. Please connect a microphone.';
          break;
        case 'not-allowed':
          msg = 'Microphone permission denied. Please allow access in browser settings.';
          break;
        case 'network':
          msg = 'Network error. Check your internet connection.';
          break;
        default:
          msg = `Error: ${event.error}`;
      }
      setError(msg);
      stopListening();
    };

    recognition.onend = () => {
      // Only set listening false if we didn't intentionally stop
      if (isListening && recognitionRef.current === recognition) {
        setIsListening(false);
      }
    };

    return recognition;
  }, [language]);

  // Start listening with microphone capture
  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

      // Initialize audio analyser for waveform
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Initialize and start recognition
      const recognition = initRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setTranscript(''); // Clear previous transcript

    } catch (err) {
      console.error('Microphone access error:', err);
      let msg = 'Failed to access microphone';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone detected. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Microphone is already in use by another application.';
      }
      setError(msg);
    }
  }, [initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
  }, []);

  // Text-to-speech
  const speakText = useCallback((text, onEnd) => {
    if (!window.speechSynthesis || !voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'sw' ? 'sw-KE' : 'en-GB';
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, language, voiceEnabled]);

  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Wake word detection (simple keyword matching)
  const detectWakeWord = useCallback((text) => {
    const wakeWords = ['hey tiisgs', 'hello tiisgs', 'tiisgs', 'hey tigs', 'tigs'];
    return wakeWords.some(word => text.toLowerCase().includes(word));
  }, []);

  // Toggle voice enabled state
  const toggleVoiceEnabled = useCallback(() => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    localStorage.setItem('voiceEnabled', newState.toString());
    if (!newState) {
      cancelSpeech();
      stopListening();
    }
  }, [voiceEnabled, cancelSpeech, stopListening]);

  // Switch language
  const setLanguagePreference = useCallback((lang) => {
    setLanguage(lang);
    localStorage.setItem('voiceLanguage', lang);
    // Restart recognition if currently listening
    if (isListening) {
      stopListening();
      setTimeout(startListening, 100);
    }
  }, [isListening, startListening, stopListening]);

  // Save voice preference
  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem('preferredVoice', selectedVoice.name);
    }
  }, [selectedVoice]);

  const value = {
    isListening,
    isSpeaking,
    transcript,
    voices,
    selectedVoice,
    setSelectedVoice,
    language,
    setLanguage: setLanguagePreference,
    voiceEnabled,
    toggleVoiceEnabled,
    error,
    setError,
    startListening,
    stopListening,
    speakText,
    cancelSpeech,
    detectWakeWord,
    analyser: analyserRef.current,
    audioStream: streamRef.current
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
