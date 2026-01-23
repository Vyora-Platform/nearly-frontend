import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shuffle, Play, Square, Send, SkipForward,
  Shield, AlertTriangle, MessageCircle, Users,
  EyeOff, Flag, X, Video, VideoOff, Mic, MicOff,
  Phone, PhoneOff, Camera, Monitor, Volume2, VolumeX,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { randomChatApi, videoChatApi, reportApi, authApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";

type ChatMode = "text" | "video";
type ChatState = "idle" | "searching" | "connected" | "disconnected";

interface Message {
  id: string;
  content: string;
  isMe: boolean;
  timestamp: Date;
}

interface ReportReason {
  id: string;
  label: string;
  description: string;
}

// WebRTC ICE servers for peer-to-peer connection
let ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

const fetchTurnCredentials = async () => {
  try {
    const response = await fetch('https://api.nearlyapp.in/api/video-chat/ice-servers');
    if (response.ok) {
      const data = await response.json();
      if (data.username && data.credential && data.urls) {
        console.log("Acquired TURN credentials");
        ICE_SERVERS = [
          // ...ICE_SERVERS, // Keep STUN servers
          {
            urls: data.urls,
            username: data.username,
            credential: data.credential
          }
        ];
        console.log("Updated ICE servers:", ICE_SERVERS);
      }
    }
  } catch (e) {
    console.error("Failed to fetch TURN credentials", e);
  }
};

const REPORT_REASONS: ReportReason[] = [
  { id: "inappropriate", label: "Inappropriate Content", description: "Sexual content, nudity, or explicit material" },
  { id: "harassment", label: "Harassment or Bullying", description: "Threats, hate speech, or targeted harassment" },
  { id: "spam", label: "Spam or Scam", description: "Advertising, phishing, or malicious links" },
  { id: "underage", label: "Underage User", description: "User appears to be under 18" },
  { id: "violence", label: "Violence or Self-harm", description: "Threats of violence or self-harm content" },
  { id: "impersonation", label: "Impersonation", description: "Pretending to be someone else" },
  { id: "other", label: "Other", description: "Other violations not listed above" },
];

export default function RandomChat() {
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [searchDots, setSearchDots] = useState("");
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [lookingCount, setLookingCount] = useState(0);

  // Video chat state
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isStrangerMuted, setIsStrangerMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");
  const [partnerUsername, setPartnerUsername] = useState<string>("Stranger");

  // Report dialog state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string>("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [streamReady, setStreamReady] = useState(false); // Force re-render when stream is ready
  const isConnectingRef = useRef<boolean>(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Animate searching dots
  useEffect(() => {
    if (chatState === "searching") {
      const interval = setInterval(() => {
        setSearchDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [chatState]);

  // Connect to Java Microservice via WebSocket (Single service handles both Video/Text)
  // Backend decides the chat mode based on matching logic
  const connectToVideoService = useCallback(() => {
    if (!sessionId || isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    fetchTurnCredentials(); // Ensure we have latest TURN creds before starting
    isConnectingRef.current = true;

    // Build WebSocket URL - connect to video-chat-service which handles both video and text
    // Backend decides the actual chat mode based on matching availability
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const port = "9016"; // video-chat-service handles both modes
    const wsPath = "/ws/video";
    const wsUrl = `wss://api.nearlyapp.in/ws/video`;

    console.log(`🔌 WebSocket Connecting: ${wsUrl}`, {
      url: wsUrl,
      protocol,
      hostname: window.location.hostname,
      port,
      timestamp: new Date().toISOString()
    });

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket Connected: ${wsUrl}`, {
          readyState: ws.readyState,
          protocol: ws.protocol,
          extensions: ws.extensions,
          timestamp: new Date().toISOString()
        });
        isConnectingRef.current = false;

        // Send JOIN request - backend will decide the chat mode
        // Backend handles matching logic and returns the assigned mode
        const joinMessage = {
          type: "JOIN",
          sessionId,
          // Don't send chatMode - let backend decide
        };

        ws.send(JSON.stringify(joinMessage));
        console.log("📤 WebSocket Sent:", {
          type: 'JOIN',
          message: joinMessage,
          timestamp: new Date().toISOString()
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📥 WebSocket Received:", {
            type: data.type,
            message: data,
            rawData: event.data,
            timestamp: new Date().toISOString()
          });
          console.log("Received message:", data.type, data);

          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("🔌 WebSocket Disconnected:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        });
        isConnectingRef.current = false;
        wsRef.current = null;

        // If we were connected and suddenly disconnected, update state
        if (chatState === "connected") {
          setChatState("disconnected");
          addSystemMessage("Connection lost. Please try again.");
        }
      };

      ws.onerror = (error) => {
        console.error("🔌 WebSocket Error:", {
          error,
          readyState: ws.readyState,
          url: ws.url,
          timestamp: new Date().toISOString()
        });
        isConnectingRef.current = false;

        // Show error - no fake matching, wait for real backend
        handleConnectionError();
      };

    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      isConnectingRef.current = false;
      handleConnectionError();
    }
  }, [sessionId, chatState]);

  // Handle incoming WebSocket messages from Java service
  // Backend decides the chat mode and returns it in the response
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case "SYSTEM":
        // System messages (connection status, ICE servers, etc.)
        if (data.payload) {
          try {
            const config = JSON.parse(data.payload);
            if (config.iceServers) {
              console.log("Received ICE servers config");
            }
          } catch {
            // Not JSON, just a system message
          }
        }
        break;

      case "QUEUE_STATUS":
        // Queue status update - still looking for match
        if (data.onlineCount) setOnlineUsers(data.onlineCount);
        if (data.lookingCount) setLookingCount(data.lookingCount);
        break;

      case "MATCHED":
      case "ROOM_CREATED":
        // Matched with a stranger! Backend decides the chat mode
        console.log("Matched! Room:", data.roomId, "Initiator:", data.isInitiator || data.payload === "initiator", "Mode:", data.chatMode);
        setRoomId(data.roomId);
        setIsInitiator(data.isInitiator || data.payload === "initiator");
        setPartnerUsername(data.partnerUsername || "Stranger");
        setChatState("connected");
        setChatCount((prev) => prev + 1);
        setMessages([]);

        // Backend decides the chat mode - update client state accordingly
        const backendChatMode = data.chatMode?.toLowerCase() || "text";
        setChatMode(backendChatMode as ChatMode);

        // If video mode (decided by backend) and we're the initiator, create WebRTC offer
        if (backendChatMode === "video" && (data.isInitiator || data.payload === "initiator")) {
          // Initialize video stream if not already done
          if (!localStreamRef.current) {
            initializeLocalStream().then(() => {
              setTimeout(() => createWebRTCOffer(), 500);
            });
          } else {
            setTimeout(() => createWebRTCOffer(), 500);
          }
        }
        break;

      case "OFFER":
        // Received WebRTC offer from partner
        handleWebRTCOffer(data);
        break;

      case "ANSWER":
        // Received WebRTC answer from partner
        handleWebRTCAnswer(data);
        break;

      case "ICE_CANDIDATE":
        // Received ICE candidate from partner
        handleIceCandidate(data);
        break;

      case "CHAT_MESSAGE":
        // Received chat message from partner
        setMessages((prev) => [
          ...prev,
          {
            id: `stranger-${Date.now()}`,
            content: data.content,
            isMe: false,
            timestamp: new Date(),
          },
        ]);
        break;

      case "DISCONNECTED":
        // Partner disconnected
        setChatState("disconnected");
        setRoomId(null);
        cleanupWebRTC();
        addSystemMessage("Stranger has disconnected.");
        break;

      case "ERROR":
        console.error("Server error:", data.content);
        addSystemMessage(data.content || "An error occurred.");
        break;

      case "ONLINE_COUNT":
        if (data.onlineCount) setOnlineUsers(data.onlineCount);
        if (data.lookingCount) setLookingCount(data.lookingCount);
        break;

      case "MUTE_VIDEO":
      case "UNMUTE_VIDEO":
      case "MUTE_AUDIO":
      case "UNMUTE_AUDIO":
        // Partner media state change - could show indicator
        break;
    }
  }, []);

  // Create WebRTC offer (initiator side)
  const createWebRTCOffer = useCallback(async () => {
    if (!localStreamRef.current) return;

    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Handle incoming tracks (remote video)
      pc.ontrack = (event) => {
        console.log("Received remote track");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "ICE_CANDIDATE",
            sessionId,
            payload: JSON.stringify(event.candidate),
          }));
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("WebRTC connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          setConnectionQuality("good");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnectionQuality("poor");
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "OFFER",
          sessionId,
          payload: JSON.stringify(offer),
        }));
        console.log("Sent WebRTC offer");
      }

    } catch (error) {
      console.error("Failed to create WebRTC offer:", error);
    }
  }, [sessionId]);

  // Handle incoming WebRTC offer (receiver side)
  const handleWebRTCOffer = useCallback(async (data: any) => {
    if (!localStreamRef.current) return;

    try {
      const offer = JSON.parse(data.payload);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      // Add local tracks
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log("Received remote track");
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "ICE_CANDIDATE",
            sessionId,
            payload: JSON.stringify(event.candidate),
          }));
        }
      };

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ANSWER",
          sessionId,
          payload: JSON.stringify(answer),
        }));
        console.log("Sent WebRTC answer");
      }

    } catch (error) {
      console.error("Failed to handle WebRTC offer:", error);
    }
  }, [sessionId]);

  // Handle incoming WebRTC answer
  const handleWebRTCAnswer = useCallback(async (data: any) => {
    try {
      const answer = JSON.parse(data.payload);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Set remote description from answer");
      }
    } catch (error) {
      console.error("Failed to handle WebRTC answer:", error);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (data: any) => {
    try {
      const candidate = JSON.parse(data.payload);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Failed to add ICE candidate:", error);
    }
  }, []);

  // Cleanup WebRTC connection
  const cleanupWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // Add system message to chat
  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        content,
        isMe: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Handle connection error - just show error, no fake matching
  const handleConnectionError = useCallback(() => {
    console.log("Connection failed - waiting for backend service");
    addSystemMessage("Unable to connect. Please try again.");
    setChatState("idle");
  }, [addSystemMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ensure local video stream is attached to video element when it mounts or stream changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef.current, chatState]); // Re-run when chatState changes (re-mounting video element)

  // Focus input when connected (Video or Text)
  useEffect(() => {
    if (chatState === "connected") {
      inputRef.current?.focus();
    }
  }, [chatState]);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const response = await authApi.createAnonymousSession();
        if (mounted) {
          setSessionId(response.sessionId);

          // Register as online user with both services
          const registerPromises = [
            videoChatApi.registerOnline({ sessionId: response.sessionId }).catch(() =>
              authFetch('/api/video-chat/online', {
                method: 'POST',
                body: JSON.stringify({ sessionId: response.sessionId }),
              })
            ),
            randomChatApi.registerOnline({ sessionId: response.sessionId }).catch(() =>
              authFetch('/api/random-chat/online', {
                method: 'POST',
                body: JSON.stringify({ sessionId: response.sessionId }),
              })
            )
          ];

          await Promise.allSettled(registerPromises);
        }
      } catch (error) {
        if (mounted) {
          const localSessionId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setSessionId(localSessionId);

          // Register with both services
          Promise.allSettled([
            authFetch('/api/video-chat/online', {
              method: 'POST',
              body: JSON.stringify({ sessionId: localSessionId }),
            }),
            authFetch('/api/random-chat/online', {
              method: 'POST',
              body: JSON.stringify({ sessionId: localSessionId }),
            })
          ]).catch(() => { });
        }
      }
    };

    initSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch online users count from both services
  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        // Try to get stats from both services
        const [videoStats, chatStats] = await Promise.allSettled([
          videoChatApi.getStats(),
          randomChatApi.getStats()
        ]);

        let totalOnline = 0;
        let totalLooking = 0;

        if (videoStats.status === "fulfilled") {
          totalOnline += videoStats.value.onlineUsers || 0;
          totalLooking += (videoStats.value.lookingForVideo || 0) + (videoStats.value.lookingForText || 0);
        }

        if (chatStats.status === "fulfilled") {
          totalOnline += chatStats.value.onlineUsers || 0;
          totalLooking += chatStats.value.lookingForMatch || 0;
        }

        if (totalOnline > 0) {
          setOnlineUsers(totalOnline);
          setLookingCount(totalLooking);
        } else {
          // Fallback to local endpoints
          const [videoRes, chatRes] = await Promise.allSettled([
            authFetch('/api/video-chat/stats'),
            authFetch('/api/random-chat/stats')
          ]);

          let localOnline = 0;
          let localLooking = 0;

          if (videoRes.status === "fulfilled" && videoRes.value.ok) {
            const videoData = await videoRes.value.json();
            localOnline += videoData.onlineUsers || 0;
            localLooking += videoData.lookingForVideo || 0;
          }

          if (chatRes.status === "fulfilled" && chatRes.value.ok) {
            const chatData = await chatRes.value.json();
            localOnline += chatData.onlineUsers || 0;
            localLooking += chatData.lookingForMatch || 0;
          }

          setOnlineUsers(localOnline > 0 ? localOnline : Math.max(50, onlineUsers));
          setLookingCount(localLooking);
        }
      } catch {
        setOnlineUsers(Math.max(50, onlineUsers));
      }
    };

    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 30000);

    return () => clearInterval(interval);
  }, []);

  // Heartbeat to keep session alive - always use video-chat service since backend handles both
  useEffect(() => {
    if (!sessionId) return;

    const heartbeatInterval = setInterval(async () => {
      // Send heartbeat to video-chat service (which handles both video and text)
      try {
        await videoChatApi.heartbeat(sessionId);
      } catch {
        authFetch('/api/video-chat/heartbeat', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        }).catch(() => { });
      }
    }, 60000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [sessionId]);

  // Cleanup on component unmount only
  useEffect(() => {
    if (!sessionId) return;

    return () => {
      // Close WebSocket on unmount
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "disconnect", sessionId }));
        wsRef.current.close();
      }
    };
  }, [sessionId]);

  // Connect when searching starts - backend decides the chat mode
  useEffect(() => {
    if (chatState === "searching" && sessionId) {
      connectToVideoService();
    }

    return () => {
      if (chatState !== "searching" && wsRef.current) {
        // Don't close if we just got connected
      }
    };
  }, [chatState, sessionId, connectToVideoService]);

  // Initialize local video stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;

      // Attach to local video preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        // Let autoplay attribute handle it, or:
        await localVideoRef.current.play().catch(err => {
          console.warn("Autoplay blocked:", err);
        });
      }

      setStreamReady(true);
      return stream;
    } catch (error) {
      console.error("Failed to get media devices:", error);
      return null;
    }
  }, []);


  // Stop local stream
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    cleanupWebRTC();
  }, [cleanupWebRTC]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);

        // Notify partner
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: videoTrack.enabled ? "UNMUTE_VIDEO" : "MUTE_VIDEO",
            sessionId,
          }));
        }
      }
    }
  }, [sessionId]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);

        // Notify partner
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: audioTrack.enabled ? "UNMUTE_AUDIO" : "MUTE_AUDIO",
            sessionId,
          }));
        }
      }
    }
  }, [sessionId]);

  // Toggle stranger audio
  const toggleStrangerMute = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsStrangerMuted(remoteVideoRef.current.muted);
    }
  }, []);

  // Start random chat - backend decides if it's video or text based on matching
  const handleStartRandomChat = async () => {
    // Pre-initialize camera/mic so we're ready if backend assigns video mode
    const stream = await initializeLocalStream().catch(() => null);
    if (!stream) {
      console.log("Camera/Mic not available - backend may assign text-only mode");
    }
    // Don't set chatMode - backend will decide
    setChatMode(null);
    setChatState("searching");
  };

  // Legacy functions kept for backward compatibility with UI buttons
  const handleStartTextChat = async () => {
    // Don't set mode - backend decides
    setChatMode(null);
    setChatState("searching");
  };

  const handleStartVideoChat = async () => {
    // Pre-initialize camera/mic so we're ready if backend assigns video mode
    const stream = await initializeLocalStream();
    if (!stream) {
      console.log("Camera/Mic not available - backend may assign text-only mode");
    }
    // Don't set mode - backend decides
    setChatMode(null);
    setChatState("searching");
  };

  const handleStopChat = () => {
    // Send disconnect message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "disconnect", sessionId }));
      wsRef.current.close();
    }
    wsRef.current = null;
    isConnectingRef.current = false;

    setChatState("idle");
    setChatMode(null);
    setMessages([]);
    setRoomId(null);
    stopLocalStream();
  };

  const handleSkipStranger = () => {
    // Send skip message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "SKIP",
        sessionId
      }));
    }

    cleanupWebRTC();
    setChatState("disconnected");

    addSystemMessage("Chat ended. Finding a new stranger...");

    setTimeout(() => {
      setChatState("searching");
      setRoomId(null);
      setChatMode(null); // Reset mode - backend will decide again

      // Reconnect to find new match - backend decides mode
      connectToVideoService();
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || chatState !== "connected") return;

    // Only send if WebSocket is connected - no fake responses
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      addSystemMessage("Connection lost. Please reconnect.");
      return;
    }

    const newMessage: Message = {
      id: `me-${Date.now()}`,
      content: inputMessage.trim(),
      isMe: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Send via WebSocket to backend
    wsRef.current.send(JSON.stringify({
      type: "CHAT_MESSAGE",
      sessionId,
      content: inputMessage.trim(),
    }));
    setInputMessage("");
  };

  const handleNewChat = () => {
    setChatState("searching");
    cleanupWebRTC();
    setChatMode(null); // Reset mode - backend will decide again

    // Reconnect to find new match - backend decides mode
    connectToVideoService();
  };

  const handleReportSubmit = async () => {
    try {
      await reportApi.submitReport({
        reporterSessionId: sessionId || "anonymous",
        reportedSessionId: "stranger-session",
        chatType: chatMode === "video" ? "video" : "text",
        category: selectedReportReason,
        description: reportDetails || undefined,
      });

      console.log("Report submitted successfully");
    } catch (error) {
      console.error("Failed to submit report:", error);
    }

    setReportSubmitted(true);

    setTimeout(() => {
      setShowReportDialog(false);
      setReportSubmitted(false);
      setSelectedReportReason("");
      setReportDetails("");
      handleSkipStranger();
    }, 2000);
  };

  const handleOpenReport = () => {
    setShowReportDialog(true);
  };

  // Render the mode selection screen
  const renderModeSelection = () => (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-primary opacity-20 animate-ping absolute" />
        <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center relative">
          <Shuffle className="w-10 h-10 text-white" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">Random Chat</h2>
      <p className="text-muted-foreground text-center text-sm mb-6 max-w-[280px]">
        Connect with random strangers anonymously. Your identity is completely hidden!
      </p>

      {/* Privacy Features */}
      <div className="w-full max-w-[280px] space-y-2 mb-8">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <EyeOff className="w-4 h-4" />
          </div>
          <span>100% Anonymous - No profile shared</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <span>Instant skip - Move to next anytime</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Flag className="w-4 h-4" />
          </div>
          <span>Report & Block - Stay safe</span>
        </div>
      </div>

      {/* Single Random Chat Button - Backend decides video or text */}
      <div className="w-full max-w-[280px] space-y-3">
        <Button
          onClick={handleStartRandomChat}
          className="w-full bg-gradient-primary text-white py-6 text-lg font-semibold"
          data-testid="start-random-chat"
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Start Random Chat
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You'll be matched with a random stranger.<br />
          Chat mode (video or text) is decided automatically.
        </p>
      </div>

      {/* Warning */}
      <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground max-w-[280px]">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-500" />
        <span>
          Be respectful. Inappropriate behavior will result in a ban.
          You can report users at any time.
        </span>
      </div>
    </div>
  );

  // Render searching state - backend decides chat mode
  const renderSearching = () => (
    <div className="flex flex-col items-center justify-center h-full px-6">
      {/* Searching Animation */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shuffle className="w-8 h-8 text-primary" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Finding a stranger{searchDots}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-2">
        Please wait while we connect you with someone
      </p>
      <Badge variant="outline" className="mb-4">
        Auto-matching
      </Badge>

      {lookingCount > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          {lookingCount} {lookingCount === 1 ? "person" : "people"} looking for match
        </p>
      )}

      {/* Show local video preview while searching (ready for if backend assigns video mode) */}
      {localStreamRef.current && (
        <div className="relative w-40 h-32 rounded-xl overflow-hidden bg-muted mb-6">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
            You
          </div>
        </div>
      )}

      <Button
        onClick={handleStopChat}
        variant="outline"
        className="text-destructive border-destructive hover:bg-destructive/10"
        data-testid="stop-searching"
      >
        <Square className="w-4 h-4 mr-2" />
        Cancel
      </Button>
    </div>
  );

  // Render video chat connected state
  const renderVideoChat = () => (
    <div className="flex flex-col h-full">
      {/* Video Grid */}
      <div className="flex-1 relative bg-black min-h-[400px]">
        {/* Remote Video (Stranger) - Full screen */}
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={isStrangerMuted}
            className="w-full h-full object-cover"
          />
          {/* Placeholder when no remote video */}
          {!remoteVideoRef.current?.srcObject && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
              <div className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarFallback className="bg-muted-foreground/30 text-4xl">?</AvatarFallback>
                </Avatar>
                <p className="text-muted-foreground text-sm">{partnerUsername} connected</p>
                {isInitiator && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                    Establishing video connection...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Connection Quality Indicator */}
          <div className="absolute top-4 right-4">
            <Badge
              variant="secondary"
              className={`text-xs ${connectionQuality === "good"
                ? "bg-green-500/20 text-green-500"
                : connectionQuality === "fair"
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "bg-red-500/20 text-red-500"
                }`}
            >
              {connectionQuality === "good" && "●●●"}
              {connectionQuality === "fair" && "●●○"}
              {connectionQuality === "poor" && "●○○"}
            </Badge>
          </div>
        </div>

        {/* Local Video (You) - Picture in Picture */}
        <div className="absolute bottom-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-background shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${!isCameraOn ? "hidden" : ""}`}
          />
          {!isCameraOn && (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">
            You
          </div>
        </div>

        {/* Anonymous Overlay */}
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            <EyeOff className="w-3 h-3 mr-1" />
            Anonymous
          </Badge>
        </div>
      </div>

      {/* Video Controls */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center justify-center gap-3 mb-3">
          {/* Camera Toggle */}
          <Button
            onClick={toggleCamera}
            variant={isCameraOn ? "outline" : "destructive"}
            size="icon"
            className="w-12 h-12 rounded-full"
            data-testid="toggle-camera"
          >
            {isCameraOn ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Mic Toggle */}
          <Button
            onClick={toggleMic}
            variant={isMicOn ? "outline" : "destructive"}
            size="icon"
            className="w-12 h-12 rounded-full"
            data-testid="toggle-mic"
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Skip Button */}
          <Button
            onClick={handleSkipStranger}
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full"
            data-testid="skip-video"
          >
            <SkipForward className="w-5 h-5" />
          </Button>

          {/* End Call */}
          <Button
            onClick={handleStopChat}
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full"
            data-testid="end-video-call"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>

          {/* Mute Stranger */}
          <Button
            onClick={toggleStrangerMute}
            variant={isStrangerMuted ? "destructive" : "outline"}
            size="icon"
            className="w-12 h-12 rounded-full"
            data-testid="mute-stranger"
          >
            {isStrangerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          {/* Report Button */}
          <Button
            onClick={handleOpenReport}
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full text-muted-foreground hover:text-destructive"
            data-testid="report-video-user"
          >
            <Flag className="w-5 h-5" />
          </Button>
        </div>

        {/* Text input for video chat */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="video-input-message"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="w-10 h-10 rounded-full bg-gradient-primary text-white p-0 disabled:opacity-50"
            data-testid="video-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Render text chat connected state
  const renderTextChat = () => (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Connection Message */}
        <div className="flex justify-center">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            You are now chatting with {partnerUsername}
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
          >
            {!msg.isMe && !msg.id.startsWith("system") && (
              <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                  ?
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.id.startsWith("system")
                ? "bg-muted/50 text-muted-foreground text-center text-xs italic mx-auto"
                : msg.isMe
                  ? "bg-gradient-primary text-white"
                  : "bg-muted text-foreground"
                }`}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {strangerTyping && (
          <div className="flex justify-start">
            <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                ?
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Controls */}
      {chatState === "connected" && (
        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-center gap-2 mb-3">
            <Button
              onClick={handleSkipStranger}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
              data-testid="skip-stranger"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>
            <Button
              onClick={handleStopChat}
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              data-testid="end-chat"
            >
              <X className="w-4 h-4 mr-1" />
              End
            </Button>
            <div className="flex-1" />
            <Button
              onClick={handleOpenReport}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              data-testid="report-user"
            >
              <Flag className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="input-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="w-10 h-10 rounded-full bg-gradient-primary text-white p-0 disabled:opacity-50"
              data-testid="send-message"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {chatState === "disconnected" && (
        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <Button
              onClick={handleNewChat}
              className="flex-1 bg-gradient-primary text-white"
              data-testid="new-chat"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Find New Stranger
            </Button>
            <Button
              onClick={handleStopChat}
              variant="outline"
              data-testid="go-back"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      {/* Status Bar */}
      <div className="px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${chatState === "connected"
                ? "bg-green-500"
                : chatState === "searching"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-muted-foreground"
                }`}
            />
            <span className="text-sm text-muted-foreground">
              {chatState === "idle" && "Ready to chat"}
              {chatState === "searching" && `Finding someone${searchDots}`}
              {chatState === "connected" && (
                <span className="flex items-center gap-1">
                  Connected to {partnerUsername}
                  {chatMode === "video" && <Video className="w-3 h-3" />}
                  {chatMode === "text" && <MessageCircle className="w-3 h-3" />}
                  {!chatMode && <Shuffle className="w-3 h-3" />}
                </span>
              )}
              {chatState === "disconnected" && "Disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {chatCount} chats today
            </Badge>
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              {onlineUsers > 0 ? onlineUsers.toLocaleString() : "..."} online
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {chatState === "idle" && renderModeSelection()}
        {chatState === "searching" && renderSearching()}
        {(chatState === "connected" || chatState === "disconnected") && chatMode === "video" && renderVideoChat()}
        {(chatState === "connected" || chatState === "disconnected") && (chatMode === "text" || !chatMode) && renderTextChat()}
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-destructive" />
              Report User
            </DialogTitle>
            <DialogDescription>
              Report inappropriate behavior. Your report is anonymous and no chat data is stored.
            </DialogDescription>
          </DialogHeader>

          {reportSubmitted ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Report Submitted</h3>
              <p className="text-sm text-muted-foreground">
                Thank you for helping keep our community safe.
              </p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <Label className="text-sm font-medium mb-3 block">
                  Why are you reporting this user?
                </Label>
                <RadioGroup
                  value={selectedReportReason}
                  onValueChange={setSelectedReportReason}
                  className="space-y-2"
                >
                  {REPORT_REASONS.map((reason) => (
                    <div
                      key={reason.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedReportReason === reason.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                        }`}
                      onClick={() => setSelectedReportReason(reason.id)}
                    >
                      <RadioGroupItem value={reason.id} id={reason.id} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={reason.id} className="font-medium cursor-pointer">
                          {reason.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>

                {selectedReportReason && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block">
                      Additional details (optional)
                    </Label>
                    <Textarea
                      placeholder="Describe what happened..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReportDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReportSubmit}
                  disabled={!selectedReportReason}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Submit Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
