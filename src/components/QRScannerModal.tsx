import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Camera, Upload, CheckCircle2, AlertCircle, Sparkles, 
  RefreshCw, Scan, Maximize, Landmark, Building, HelpCircle 
} from 'lucide-react';
import jsQR from 'jsqr';
import { Room } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onCheckInSuccess: (room: Room) => void;
}

export default function QRScannerModal({ isOpen, onClose, rooms, onCheckInSuccess }: QRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'simulate'>('camera');
  
  // Camera scanning states
  const [cameraState, setCameraState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string>('');
  const [scannedRoom, setScannedRoom] = useState<Room | null>(null);
  
  // Image Upload states
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string>('');
  
  // Simulation states
  const [selectedSimRoomId, setSelectedSimRoomId] = useState<string>('');
  const [simState, setSimState] = useState<'idle' | 'scanning' | 'success'>('idle');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up streams and animations
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Tab changes or closing modal
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
      if (cameraState === 'scanning') {
        setCameraState('idle');
      }
    } else if (isOpen && activeTab === 'camera') {
      startCamera();
    }
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    stopCamera();
    setCameraState('scanning');
    setCameraErrorMsg('');
    setScannedRoom(null);

    try {
      const constraints = {
        video: { facingMode: 'environment' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        videoRef.current.play();
        
        // Start decoding loop
        animationFrameIdRef.current = requestAnimationFrame(tickCamera);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraState('error');
      setCameraErrorMsg(
        err.message?.includes('Permission') || err.name === 'NotAllowedError'
          ? 'Camera access denied. Please grant camera permission in your browser.'
          : 'Unable to access camera. Your device may not have a camera or it is in use by another app.'
      );
    }
  };

  const tickCamera = () => {
    if (!videoRef.current || !canvasRef.current) {
      animationFrameIdRef.current = requestAnimationFrame(tickCamera);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 300;
        canvas.height = 300;
        
        // Draw centered and cropped square video frame on canvas
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const sx = (video.videoWidth - minDim) / 2;
        const sy = (video.videoHeight - minDim) / 2;
        
        ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          console.log('🎯 Found QR Code in camera stream:', code.data);
          handleScannedData(code.data, 'camera');
          return; // Stop the loop on successful detection
        }
      }
    }
    
    animationFrameIdRef.current = requestAnimationFrame(tickCamera);
  };

  const handleScannedData = (data: string, source: 'camera' | 'upload' | 'simulate') => {
    // Expected formats: 
    // - https://room-booking.iitbhu.ac.in/check-in/room-X
    // - room-X
    let roomId = '';
    
    if (data.includes('check-in/')) {
      const parts = data.split('check-in/');
      roomId = parts[parts.length - 1];
    } else {
      roomId = data.trim();
    }

    const matchedRoom = rooms.find(r => r.id === roomId || r.id === `room-${roomId}`);
    
    if (matchedRoom) {
      setScannedRoom(matchedRoom);
      stopCamera();
      
      if (source === 'camera') {
        setCameraState('success');
      } else if (source === 'upload') {
        setUploadState('success');
      }

      // Automatically trigger actual check-in after a slight visual buffer
      setTimeout(() => {
        onCheckInSuccess(matchedRoom);
        onClose();
        // Reset states
        resetAllStates();
      }, 2000);
    } else {
      const errMsg = `QR Code detected but payload "${data}" does not match any room in our database.`;
      if (source === 'camera') {
        // Continue camera loop after brief delay
        setCameraState('error');
        setCameraErrorMsg(errMsg);
        setTimeout(() => {
          if (isOpen && activeTab === 'camera') {
            startCamera();
          }
        }, 3000);
      } else {
        setUploadState('error');
        setUploadErrorMsg(errMsg);
      }
    }
  };

  const resetAllStates = () => {
    setCameraState('idle');
    setCameraErrorMsg('');
    setScannedRoom(null);
    setUploadState('idle');
    setUploadErrorMsg('');
    setSelectedSimRoomId('');
    setSimState('idle');
  };

  // Image Upload handler
  const handleImageUpload = (file: File) => {
    setUploadState('processing');
    setUploadErrorMsg('');
    setScannedRoom(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code) {
              handleScannedData(code.data, 'upload');
            } else {
              setUploadState('error');
              setUploadErrorMsg(
                'No QR Code detected in this image. Please ensure the QR Code is clearly visible, well-lit, and centered.'
              );
            }
          } catch (err) {
            console.error(err);
            setUploadState('error');
            setUploadErrorMsg('Failed to process image data. Is the image corrupted?');
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Simulation handler
  const handleSimulateScan = () => {
    if (!selectedSimRoomId) return;
    const room = rooms.find(r => r.id === selectedSimRoomId);
    if (!room) return;

    setSimState('scanning');
    
    // Simulate scan laser sweep
    setTimeout(() => {
      setSimState('success');
      setScannedRoom(room);
      
      setTimeout(() => {
        onCheckInSuccess(room);
        onClose();
        resetAllStates();
      }, 2000);
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
              <Scan className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">IIT BHU door check-in scan</h3>
              <p className="text-slate-400 text-[10.5px] font-mono uppercase tracking-wider">QR Mobile Plaque Reader</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetAllStates();
            }}
            className="w-8 h-8 rounded-full border border-slate-800 hover:border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-3 border-b border-slate-800 p-1 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-3 px-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'camera' 
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload' 
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <button
            onClick={() => setActiveTab('simulate')}
            className={`py-3 px-1 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'simulate' 
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-950/20' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan Simulator</span>
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center justify-center space-y-6">
              
              {/* Camera view box */}
              <div className="relative w-[280px] h-[280px] rounded-3xl overflow-hidden border border-slate-800 shadow-inner bg-black flex items-center justify-center">
                
                {cameraState === 'scanning' && (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Corner Reticles */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-md" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-md" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-md" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-md" />
                    
                    {/* Laser Sweeper */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_10px_#6366f1] animate-[sweep_2s_infinite_ease-in-out]" />
                  </>
                )}

                {/* Hidden canvas used to process frame */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Success Screen overlay */}
                {cameraState === 'success' && scannedRoom && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-4 text-center z-10"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-pulse" />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">CODE DECODED</span>
                    <h4 className="text-white text-base font-black mt-1">{scannedRoom.name}</h4>
                    <p className="text-emerald-300 text-xs mt-2 font-semibold">Checking in your credentials...</p>
                  </motion.div>
                )}

                {/* Error Screen overlay */}
                {cameraState === 'error' && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6 text-rose-400" />
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{cameraErrorMsg}</p>
                    <button
                      onClick={startCamera}
                      className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Connection</span>
                    </button>
                  </div>
                )}

                {/* Idle screen */}
                {cameraState === 'idle' && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
                    <button
                      onClick={startCamera}
                      className="p-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer transition-all hover:scale-105"
                    >
                      <Camera className="w-8 h-8" />
                    </button>
                    <span className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-wider font-mono">Initialize Video</span>
                  </div>
                )}

              </div>

              <div className="text-center max-w-sm">
                <p className="text-xs text-slate-400">
                  Allow browser camera access and point your device camera at the room's doorway sign QR code.
                </p>
                <div className="mt-3 flex items-center justify-center gap-1 bg-slate-950/40 py-1.5 px-3 rounded-full border border-slate-800 w-fit mx-auto">
                  <Landmark className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">TARGET URI: room-booking.iitbhu.ac.in/check-in/</span>
                </div>
              </div>

            </div>
          )}

          {/* IMAGE UPLOAD TAB */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              
              <div 
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/20 hover:bg-indigo-950/5 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  accept="image/*" 
                  className="hidden" 
                />

                {uploadState === 'idle' && (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mb-3 text-indigo-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="text-slate-200 text-sm font-bold">Drag & drop QR image</h4>
                    <p className="text-slate-500 text-xs mt-1">or click to choose file from your device</p>
                    <span className="text-[10px] text-indigo-400/80 font-mono mt-4 font-bold uppercase bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">PNG, JPG, SVG</span>
                  </>
                )}

                {uploadState === 'processing' && (
                  <div className="space-y-3 py-2">
                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-xs text-slate-400 font-mono">Running binary matrix extractor...</span>
                  </div>
                )}

                {uploadState === 'success' && scannedRoom && (
                  <div className="space-y-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                      <CheckCircle2 className="w-6 h-6 animate-bounce" />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded font-mono uppercase">DECODED SUCCESS</span>
                    <h4 className="text-white text-base font-black mt-1">{scannedRoom.name}</h4>
                    <p className="text-slate-400 text-[11px]">Check-in processed successfully. Redirecting...</p>
                  </div>
                )}

                {uploadState === 'error' && (
                  <div className="space-y-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-2 text-rose-400">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-rose-200 text-xs font-semibold px-4">{uploadErrorMsg}</p>
                    <p className="text-slate-500 text-[10px]">Click or drag a different image to try again</p>
                  </div>
                )}

              </div>

              {/* Developer Testing Help section */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-extrabold text-white">How to test image upload?</span>
                </div>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Go to any classroom card below, click <strong className="text-indigo-300">"QR Access"</strong>, right-click and save/screenshot the QR code, then drag it here! The uploader will parse the image pixels and recognize the space.
                </p>
              </div>

            </div>
          )}

          {/* SIMULATION TAB */}
          {activeTab === 'simulate' && (
            <div className="space-y-6">
              
              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Select Campus Room</label>
                  <select
                    value={selectedSimRoomId}
                    onChange={(e) => {
                      setSelectedSimRoomId(e.target.value);
                      setSimState('idle');
                    }}
                    className="mt-1.5 w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold tracking-tight focus:border-indigo-500 outline-none"
                  >
                    <option value="" disabled>-- Select space to scan --</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({room.building}) - Status: {room.status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Simulation Screen */}
                <div className="relative w-full h-[180px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                  
                  {simState === 'idle' && (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Landmark className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 text-xs max-w-xs mx-auto">
                        Choose a room from the list above and click "Simulate Physical Scanner" below.
                      </p>
                    </div>
                  )}

                  {simState === 'scanning' && (
                    <>
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/50 via-slate-950 to-slate-950" />
                      {/* Laser sweep line */}
                      <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-[sweep_1.5s_infinite_ease-in-out]" />
                      
                      <div className="relative z-10 space-y-2">
                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">CONNECTING DOOR PLACARD SENSOR</span>
                        <p className="text-xs text-slate-350">Reading optical QR signature data...</p>
                      </div>
                    </>
                  )}

                  {simState === 'success' && scannedRoom && (
                    <div className="space-y-3 z-10 animate-fade-in">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                        <CheckCircle2 className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-0.5 rounded font-mono uppercase">DECODED SUCCESS</span>
                      <h4 className="text-white text-base font-black mt-1">{scannedRoom.name}</h4>
                      <p className="text-slate-400 text-[11px]">Database flags flipped. Room marked occupied!</p>
                    </div>
                  )}

                </div>

                <button
                  type="button"
                  disabled={!selectedSimRoomId || simState === 'scanning' || simState === 'success'}
                  onClick={handleSimulateScan}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Scan className="w-4 h-4" />
                  <span>Simulate Physical Scanner</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* CSS Keyframes injected for lasers */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes sweep {
            0% { top: 0%; opacity: 0.2; }
            50% { top: 100%; opacity: 1; }
            100% { top: 0%; opacity: 0.2; }
          }
        `}} />
      </motion.div>
    </div>
  );
}
