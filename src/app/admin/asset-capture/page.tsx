"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Camera, QrCode, Barcode, FileText, Plus, Search, Trash2, Edit2, 
  RefreshCw, ArrowLeft, CheckCircle, AlertTriangle, Loader2, Check, 
  X, ChevronLeft, ChevronRight, Download, LogOut, Sun, Moon, Eye, 
  Settings, Layers, Building, EyeOff, Save, FileSpreadsheet, Printer
} from "lucide-react";
import { 
  getLaboratories, 
  getSettings, 
  getITAssetCaptures, 
  saveITAssetCapture, 
  deleteITAssetCapture 
} from "../../actions";
import { exportToExcel } from "../../../utils/exportHelper";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Tesseract from "tesseract.js";

interface Lab {
  id: string;
  name: string;
  code: string;
}

interface CapturedAsset {
  id: string;
  scanType: string;
  scannedValue: string | null;
  ocrText: string | null;
  imagePath: string | null;
  createdDate: string;
  createdBy: string;
  location: string;
  remarks: string | null;
  status: string;
  cpuSerialNumber: string | null;
  monitorSerialNumber: string | null;
  barcodeSerialNumber: string | null;
}

const EMPTY_FORM = {
  scanType: "QR Code",
  scannedValue: "",
  ocrText: "",
  imagePath: "",
  location: "",
  remarks: "",
  status: "Captured",
  cpuSerialNumber: "",
  monitorSerialNumber: "",
  barcodeSerialNumber: "",
};

// Web Audio API success beep sound synthesizer
const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz beep
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.12);
  } catch (e) {
    console.warn("Beep audio play failure:", e);
  }
};

// Regex label extraction helper
const parseOCRText = (text: string) => {
  let value = "";
  let monitorSerial = "";
  let cpuSerial = "";
  let barcodeSerial = "";
  
  // Dell Service Tag (7 characters alnum, e.g. ABC12D3)
  const dellMatch = text.match(/(?:service\s*tag|tag|svctag|svc\s*tag)[:\s\n]+([A-Z0-9]{7})\b/i);
  if (dellMatch) {
    monitorSerial = dellMatch[1].toUpperCase();
    value = monitorSerial;
  }
  
  // Serial number general pattern (e.g. S/N: 1234567890)
  const snMatch = text.match(/(?:serial|s\/n|sn|serial\s*number)[:\s\n]+([A-Z0-9\-]{6,15})\b/i);
  if (snMatch) {
    const sn = snMatch[1].toUpperCase();
    if (!value) value = sn;
    cpuSerial = sn;
    barcodeSerial = sn;
  }
  
  // If nothing matched, look for alnum tokens of size 6-15
  if (!value) {
    const tokens = text.split(/[\s\n]+/);
    for (const token of tokens) {
      const cleanToken = token.replace(/[^A-Z0-9\-]/ig, "").toUpperCase();
      if (cleanToken.length >= 6 && cleanToken.length <= 15) {
        value = cleanToken;
        break;
      }
    }
  }
  
  return {
    isValid: !!value,
    value: value,
    monitorSerial,
    cpuSerial,
    barcodeSerial
  };
};

function AssetCaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // OpenCV.js load state
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const cvRef = useRef<any>(null);
  
  // Core states
  const [captures, setCaptures] = useState<CapturedAsset[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activeAdmin, setActiveAdmin] = useState<any>(null);
  
  // Camera & Scanning States
  const [activeMode, setActiveMode] = useState<"QR Code" | "Barcode" | "OCR" | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [successDetected, setSuccessDetected] = useState(false);
  const [scanTimeoutMsg, setScanTimeoutMsg] = useState<string | null>(null);
  const [ocrTip, setOcrTip] = useState<string | null>(null);
  
  // Zoom
  const [cameraCapabilities, setCameraCapabilities] = useState<any>(null);
  const [zoomVal, setZoomVal] = useState<number>(1);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  
  // OCR processing states
  const [processingOCR, setProcessingOCR] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Review & Form States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Search & History Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterScanType, setFilterScanType] = useState("All");
  const [filterLab, setFilterLab] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  
  // Dialog / Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CapturedAsset | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const tesseractWorkerRef = useRef<any>(null);
  const activeModeRef = useRef<"QR Code" | "Barcode" | "OCR" | null>(null);
  const processingRef = useRef(false);
  
  const scanIntervalRef = useRef<any>(null);
  const scanTimerRef = useRef<any>(null);
  const lastScanRef = useRef({ value: "", time: 0 });
  const touchStartDistRef = useRef<number>(0);
  const touchStartZoomRef = useRef<number>(1);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch all initial page data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Check authorization
      const isAuth = localStorage.getItem("admin_auth") === "true";
      if (!isAuth) {
        router.replace("/admin/login");
        return;
      }
      setAuthorized(true);
      
      const adminName = localStorage.getItem("admin_name") || "Administrator";
      setActiveAdmin({
        name: adminName,
        role: localStorage.getItem("admin_role") || "IT Person",
      });

      // 2. Load configurations & check locks
      const settingsRes = await getSettings();
      if (settingsRes.success && settingsRes.settings) {
        const key = "module_asset_capture";
        const lockSetting = settingsRes.settings[key];
        // Checked if active module configuration is disabled
        if (lockSetting === "false") {
          setIsEnabled(false);
          setLoading(false);
          return;
        }
      }

      // 3. Load dynamic references
      const labsRes = await getLaboratories();
      if (labsRes.success) {
        setLabs((labsRes.data || labsRes.labs || []) as Lab[]);
      }

      const capturesRes = await getITAssetCaptures();
      if (capturesRes.success) {
        setCaptures((capturesRes.data || []) as CapturedAsset[]);
      }
    } catch (e) {
      console.error(e);
      showToast("Database loading failure.", "error");
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  // Load dynamic script & libraries
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load OpenCV.js locally from public folder to prevent Webpack compile-time hangs
    if (!(window as any).cv) {
      const opencvScript = document.createElement("script");
      opencvScript.src = "/opencv.js";
      opencvScript.async = true;
      opencvScript.onload = () => {
        cvRef.current = (window as any).cv;
        setOpencvLoaded(true);
      };
      opencvScript.onerror = () => {
        console.warn("Failed to load opencv.js from local public path.");
      };
      document.body.appendChild(opencvScript);
    } else {
      cvRef.current = (window as any).cv;
      setOpencvLoaded(true);
    }

    fetchData();

    // Check query params for quick pre-selected Lab scan trigger
    const queryLab = searchParams.get("lab");
    if (queryLab) {
      setForm((prev: any) => ({ ...prev, location: decodeURIComponent(queryLab) }));
    }

    // Set Theme
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate();
      }
    };
  }, [fetchData, searchParams]);

  // Query camera devices
  const initCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === "videoinput");
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0) {
        const rearCamera = videoDevices.find(
          d => d.label.toLowerCase().includes("back") || 
               d.label.toLowerCase().includes("rear") || 
               d.label.toLowerCase().includes("environment")
        );
        const defaultDevice = rearCamera || videoDevices[0];
        setSelectedDeviceId(defaultDevice.deviceId);
        return defaultDevice.deviceId;
      }
    } catch (e) {
      console.error("Enumerate devices failed:", e);
    }
    return "";
  };

  // Start Camera Stream & Decoders
  const startCamera = async (mode: "QR Code" | "Barcode" | "OCR", targetDeviceId?: string) => {
    setCameraError(null);
    setScanTimeoutMsg(null);
    setOcrTip(null);
    setSuccessDetected(false);
    setScanning(true);
    setActiveMode(mode);
    activeModeRef.current = mode;

    try {
      let deviceId = targetDeviceId || selectedDeviceId;
      if (!deviceId) {
        deviceId = await initCameraDevices();
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: facingMode }
      };

      // Request 1080p 16:9 aspect ratio
      const videoConstraints = constraints.video as MediaTrackConstraints;
      videoConstraints.width = { ideal: 1920, max: 1920 };
      videoConstraints.height = { ideal: 1080, max: 1080 };
      videoConstraints.aspectRatio = { ideal: 1.7777777778 };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const cap = track.getCapabilities() as any;
        setCameraCapabilities(cap);
        setTorchSupported(!!cap.torch);

        const settings = track.getSettings() as any;
        if (settings.zoom) {
          setZoomVal(settings.zoom);
        }

        // Apply continuous focus, auto exposure & image stabilization
        const advanced: any = {};
        if (cap.focusMode && cap.focusMode.includes("continuous")) {
          advanced.focusMode = "continuous";
        }
        if (cap.exposureMode && cap.exposureMode.includes("continuous")) {
          advanced.exposureMode = "continuous";
        }
        if (cap.whiteBalanceMode && cap.whiteBalanceMode.includes("continuous")) {
          advanced.whiteBalanceMode = "continuous";
        }
        if (cap.imageStabilization) {
          advanced.imageStabilization = true;
        }
        if (Object.keys(advanced).length > 0) {
          await track.applyConstraints({ advanced: [advanced] } as any).catch(err => console.warn(err));
        }
      }

      // Warm up Multi-format Readers & Tesseract persistent worker
      if (!zxingReaderRef.current) {
        zxingReaderRef.current = new BrowserMultiFormatReader();
      }

      if (mode === "OCR" && !tesseractWorkerRef.current) {
        setOcrTip("Warming up OCR engine...");
        const worker = await Tesseract.createWorker("eng");
        tesseractWorkerRef.current = worker;
        setOcrTip("OCR engine ready");
      }

      // Run scanning frame capture loop every 200ms
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(() => {
        runDetectionLoop();
      }, 200);

      // Trigger timeout alert after 7 seconds if nothing is captured
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => {
        setScanTimeoutMsg("No QR Code, Barcode, or Text detected. Please move closer or improve lighting.");
      }, 7000);

    } catch (err: any) {
      console.error(err);
      setCameraError(err?.message || "Failed to access camera device. Check permissions.");
      setScanning(false);
    }
  };

  // Close camera streaming tracks
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setScanning(false);
    setTorchOn(false);
  }, []);

  // Flash / Torch toggle
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    if (track && torchSupported) {
      try {
        const nextTorch = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] } as any);
        setTorchOn(nextTorch);
      } catch (err) {
        console.error("Flash toggle error:", err);
      }
    }
  };

  // Switch camera devices
  const handleSwitchCamera = async () => {
    if (cameraDevices.length <= 1) return;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    const currentIndex = cameraDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % cameraDevices.length;
    const nextDevice = cameraDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);

    if (scanning && activeMode) {
      await startCamera(activeMode, nextDevice.deviceId);
    }
  };

  // Pinch / Slider Zoom control
  const handleZoomChange = async (val: number) => {
    const track = mediaStreamRef.current?.getVideoTracks()[0];
    if (track && cameraCapabilities?.zoom) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: val }] } as any);
        setZoomVal(val);
      } catch (err) {
        console.warn("Failed to apply zoom constraints:", err);
      }
    }
  };

  // Touch screen zoom gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = distance;
      
      const track = mediaStreamRef.current?.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings() as any;
        touchStartZoomRef.current = settings.zoom || 1;
      }
    }
  };

  const handleTouchMove = async (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current > 0) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / touchStartDistRef.current;
      const track = mediaStreamRef.current?.getVideoTracks()[0];
      if (track && cameraCapabilities?.zoom) {
        const min = cameraCapabilities.zoom.min || 1;
        const max = cameraCapabilities.zoom.max || 4;
        const targetZoom = Math.max(min, Math.min(max, touchStartZoomRef.current * scale));
        try {
          await track.applyConstraints({ advanced: [{ zoom: targetZoom }] } as any);
          setZoomVal(targetZoom);
        } catch (err) {
          console.warn("Failed to apply touch zoom constraints:", err);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = 0;
  };

  // Optimized pipeline frame parser
  const runDetectionLoop = async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        processingRef.current = false;
        return;
      }

      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }

      let cropCanvas = cropCanvasRef.current;
      if (!cropCanvas) {
        cropCanvas = document.createElement("canvas");
        cropCanvasRef.current = cropCanvas;
      }

      const ctx = canvas.getContext("2d");
      const cropCtx = cropCanvas.getContext("2d");
      if (!ctx || !cropCtx) {
        processingRef.current = false;
        return;
      }

      const videoW = video.videoWidth || 640;
      const videoH = video.videoHeight || 480;
      canvas.width = videoW;
      canvas.height = videoH;
      ctx.drawImage(video, 0, 0, videoW, videoH);

      // Crop guideline scanner frame bounds (centered 80% screen width target area)
      const cropW = Math.round(videoW * 0.8);
      const cropH = activeModeRef.current === "Barcode" ? Math.round(cropW * 0.35) : Math.round(cropW * 0.8);
      const cropX = Math.round((videoW - cropW) / 2);
      const cropY = Math.round((videoH - cropH) / 2);

      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      let detectedResult: any = null;
      const currentMode = activeModeRef.current;

      // Pipeline evaluation:
      if (currentMode === "QR Code") {
        detectedResult = await detectQRAndBarcode(cropCanvas, true);
      } else if (currentMode === "Barcode") {
        detectedResult = await detectQRAndBarcode(cropCanvas, false);
      } else if (currentMode === "OCR") {
        detectedResult = await runOCRDetection(cropCanvas);
      }

      if (detectedResult) {
        // Suppress duplicate reads within 5 seconds
        const now = Date.now();
        if (lastScanRef.current.value === detectedResult.value && now - lastScanRef.current.time < 5000) {
          processingRef.current = false;
          return;
        }

        lastScanRef.current = { value: detectedResult.value, time: now };

        // Feedback sound and haptics
        playBeep();
        if (navigator.vibrate) {
          navigator.vibrate(80);
        }

        setSuccessDetected(true);
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

        stopCamera();

        const prefill = {
          ...EMPTY_FORM,
          scanType: detectedResult.type,
          scannedValue: detectedResult.value,
          ocrText: detectedResult.ocrText || "",
          remarks: detectedResult.confidence ? `OCR Confidence: ${detectedResult.confidence}%` : ""
        };

        if (detectedResult.type === "Barcode") {
          prefill.barcodeSerialNumber = detectedResult.value;
          prefill.cpuSerialNumber = detectedResult.value;
        } else if (detectedResult.type === "QR Code") {
          prefill.monitorSerialNumber = detectedResult.value;
        } else if (detectedResult.type === "OCR") {
          prefill.monitorSerialNumber = detectedResult.parsedFields.monitorSerial || "";
          prefill.cpuSerialNumber = detectedResult.parsedFields.cpuSerial || "";
          prefill.barcodeSerialNumber = detectedResult.parsedFields.barcodeSerial || "";
          prefill.scannedValue = detectedResult.parsedFields.value || detectedResult.value;
        }

        const queryLab = searchParams.get("lab");
        if (queryLab) prefill.location = decodeURIComponent(queryLab);

        setTimeout(() => {
          setForm(prefill);
          setEditingId(null);
          setCapturedImage(detectedResult.image || null);
          setShowReviewModal(true);
          setSuccessDetected(false);
        }, 800);
      }

    } catch (e) {
      console.error("Frame loop detection error:", e);
    } finally {
      processingRef.current = false;
    }
  };

  // ZXing & Native scanner
  const detectQRAndBarcode = async (canvas: HTMLCanvasElement, qrOnly: boolean): Promise<any> => {
    // 1. Native BarcodeDetector API Check
    if (typeof window !== "undefined" && (window as any).BarcodeDetector) {
      try {
        const formats = qrOnly 
          ? ["qr_code"] 
          : ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "pdf417", "data_matrix"];
        const detector = new (window as any).BarcodeDetector({ formats });
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const b = barcodes[0];
          return {
            type: b.format === "qr_code" ? "QR Code" : "Barcode",
            value: b.rawValue,
            image: canvas.toDataURL("image/jpeg")
          };
        }
      } catch (err) {
        console.warn("Native BarcodeDetector error:", err);
      }
    }

    // 2. ZXing Fallback Reader Check
    try {
      const zxing = zxingReaderRef.current;
      if (zxing) {
        const decodeResult = await zxing.decodeFromCanvas(canvas);
        if (decodeResult) {
          const text = decodeResult.getText();
          const format = decodeResult.getBarcodeFormat();
          const isQr = format === 11 || String(format).includes("QR");

          if (qrOnly && !isQr) return null;
          if (!qrOnly && isQr) return null;

          return {
            type: isQr ? "QR Code" : "Barcode",
            value: text,
            image: canvas.toDataURL("image/jpeg")
          };
        }
      }
    } catch (e) {
      // ignore decoders failures
    }

    return null;
  };

  // OpenCV + Tesseract OCR
  const runOCRDetection = async (canvas: HTMLCanvasElement): Promise<any> => {
    if (cvRef.current) {
      try {
        const cv = cvRef.current;
        let src = cv.imread(canvas);
        let dst = new cv.Mat();

        // 1. Convert to grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

        // 2. Boost Contrast (alpha: 1.6, beta: 10)
        dst.convertTo(dst, -1, 1.6, 10);

        // 3. Edge Sharpening Kernel
        let kernel = cv.matFromArray(3, 3, cv.CV_32F, [
           0, -1,  0,
          -1,  5, -1,
           0, -1,  0
        ]);
        cv.filter2D(dst, dst, -1, kernel);

        // 4. Adaptive Thresholding
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        // Visual write back to canvas
        cv.imshow(canvas, dst);

        // Cleanup
        src.delete();
        dst.delete();
        kernel.delete();
      } catch (err) {
        console.warn("OpenCV matrix processing failed:", err);
      }
    }

    const worker = tesseractWorkerRef.current;
    if (!worker) return null;

    try {
      setOcrTip("Processing OCR...");
      const ocrRes = await worker.recognize(canvas);
      const text = ocrRes?.data?.text || "";
      const confidence = ocrRes?.data?.confidence || 0;

      if (text.trim()) {
        if (confidence >= 70) {
          const parsed = parseOCRText(text);
          if (parsed.isValid) {
            setOcrTip(null);
            return {
              type: "OCR",
              value: parsed.value,
              ocrText: text,
              confidence: confidence,
              parsedFields: parsed,
              image: canvas.toDataURL("image/jpeg")
            };
          }
        } else {
          setOcrTip("Text is unclear. Hold the camera steady or move closer.");
        }
      }
    } catch (e) {
      console.warn("Tesseract OCR exception:", e);
    }

    return null;
  };

  const launchCamera = (mode: "QR Code" | "Barcode" | "OCR") => {
    startCamera(mode);
  };

  const cancelScanning = () => {
    stopCamera();
    setActiveMode(null);
    setCameraError(null);
    setScanTimeoutMsg(null);
    setOcrTip(null);
  };

  // Save reviewed capture data to Postgres
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location) {
      showToast("Please select a target Laboratory.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await saveITAssetCapture({
        ...form,
        id: editingId || undefined,
        createdBy: activeAdmin?.name || "Administrator",
      });

      if (res.success) {
        showToast(editingId ? "Asset capture updated." : "Asset capture recorded in rows.");
        setShowReviewModal(false);
        setForm(EMPTY_FORM);
        setEditingId(null);
        setSelectedAsset(null);
        fetchData();
      } else {
        showToast(res.error || "Save record failed.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to save capture record.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Capture record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this IT asset capture record?")) return;
    try {
      const res = await deleteITAssetCapture(id, activeAdmin?.name);
      if (res.success) {
        showToast("IT asset capture record deleted.");
        fetchData();
      } else {
        showToast(res.error || "Failed to delete record.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Delete operation failed.", "error");
    }
  };

  // Export records to CSV / Excel sheet
  const exportExcelSheet = () => {
    const headers = [
      "Record ID", "Scan Type", "Scanned Value", "CPU Serial Number", 
      "Monitor Serial Number", "Barcode Serial Number", "Lab Name / Location", 
      "Created By", "Date & Time", "Remarks", "Status", "OCR Recognized Text"
    ];
    const rows = filteredCaptures.map(rec => [
      rec.id, rec.scanType, rec.scannedValue || "", rec.cpuSerialNumber || "",
      rec.monitorSerialNumber || "", rec.barcodeSerialNumber || "", rec.location,
      rec.createdBy, new Date(rec.createdDate).toLocaleString("en-IN"),
      rec.remarks || "", rec.status, rec.ocrText || ""
    ]);

    exportToExcel(rows, headers, "IT Asset Captures Register", "SCSIT_IT_Asset_Captures_Register");
    showToast("Excel spreadsheet downloaded successfully.");
  };

  const exportCSVFile = () => {
    const headers = [
      "Record ID", "Scan Type", "Scanned Value", "CPU Serial", 
      "Monitor Serial", "Barcode Serial", "Location", 
      "Created By", "Timestamp", "Remarks", "Status"
    ];
    const data = filteredCaptures.map(rec => [
      rec.id, rec.scanType, rec.scannedValue || "", rec.cpuSerialNumber || "",
      rec.monitorSerialNumber || "", rec.barcodeSerialNumber || "", rec.location,
      rec.createdBy, new Date(rec.createdDate).toISOString(),
      rec.remarks || "", rec.status
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));

    const csv = [headers.join(","), ...data.map(r => r.join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `SCSIT_IT_Asset_Captures_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV report downloaded successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  // Advanced Search filters logic
  const filteredCaptures = useMemo(() => {
    let list = [...captures];
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      list = list.filter(item => 
        item.scannedValue?.toLowerCase().includes(q) ||
        item.cpuSerialNumber?.toLowerCase().includes(q) ||
        item.monitorSerialNumber?.toLowerCase().includes(q) ||
        item.barcodeSerialNumber?.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.ocrText?.toLowerCase().includes(q) ||
        item.remarks?.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }

    if (filterScanType !== "All") {
      list = list.filter(item => item.scanType === filterScanType);
    }

    if (filterLab !== "All") {
      list = list.filter(item => item.location === filterLab);
    }

    if (filterDate) {
      list = list.filter(item => item.createdDate.slice(0, 10) === filterDate);
    }

    return list;
  }, [captures, searchQuery, filterScanType, filterLab, filterDate]);

  // Paginated assets list
  const paginatedCaptures = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCaptures.slice(start, start + PAGE_SIZE);
  }, [filteredCaptures, page]);

  const totalPages = Math.max(1, Math.ceil(filteredCaptures.length / PAGE_SIZE));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 size={32} className="animate-spin text-rose-500 mb-4" />
        <p className="text-sm font-semibold text-zinc-500">Loading IT Asset Capture Workspace...</p>
      </div>
    );
  }

  // Feature block override checks
  if (!isEnabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 px-6 text-center">
        <div className="p-8 max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-black uppercase tracking-wider">Module Locked</h2>
          <p className="text-xs text-zinc-400 leading-normal">
            The **IT Asset Capture Scanner** module has been locked/disabled by the Director Administrator. 
            Please request access in **Module Settings** to activate.
          </p>
          <button 
            onClick={() => router.push("/admin")} 
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Go to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-12">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold shadow-2xl transition duration-300 ${
          toast.type === "success" ? "bg-emerald-950 border-emerald-800 text-emerald-300 animate-fade-in" : "bg-red-950 border-red-800 text-red-300 animate-pulse"
        }`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/admin")} 
              className="p-1.5 rounded-lg hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Camera size={16} className="text-rose-500 animate-pulse" />
                IT Asset Capture Scanner
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">SCSIT LabOS · Scanner Utility Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchData} 
              className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 transition" 
              title="Synchronize Database"
            >
              <RefreshCw size={15} />
            </button>
            <button 
              onClick={() => {
                setForm(EMPTY_FORM);
                setEditingId(null);
                setCapturedImage(null);
                setShowReviewModal(true);
              }} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition"
            >
              <Plus size={13} />
              Manual Log
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 space-y-8">
        
        {/* 2. Step 1: Scan Choices cards (Only show when not actively scanning) */}
        {!scanning && !processingOCR && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
            {[
              {
                mode: "QR Code",
                title: "Scan QR Code",
                desc: "Quick capture monitor QR codes. Pre-fills monitor serial fields.",
                icon: <QrCode size={36} className="text-cyan-400" />,
                style: "hover:border-cyan-500/40"
              },
              {
                mode: "Barcode",
                title: "Scan Barcode",
                desc: "Scan CPU barcodes (Code 128, EAN, Code 39 etc.) to capture system identifiers.",
                icon: <Barcode size={36} className="text-[#C1121F]" />,
                style: "hover:border-rose-500/40"
              },
              {
                mode: "OCR",
                title: "OCR Scanner",
                desc: "Perform optical recognition on label blocks. Extract text for monitors & peripherals.",
                icon: <FileText size={36} className="text-amber-400" />,
                style: "hover:border-amber-500/40"
              }
            ].map(card => (
              <div 
                key={card.mode}
                onClick={() => launchCamera(card.mode as any)}
                className={`bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-md ${card.style}`}
              >
                <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-850 flex items-center justify-center mb-4">
                  {card.icon}
                </div>
                <h3 className="font-extrabold text-sm text-zinc-100 mb-2 uppercase tracking-wide">{card.title}</h3>
                <p className="text-xs text-zinc-500 leading-normal max-w-xs">{card.desc}</p>
                <button className="mt-4 px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-xs font-bold rounded-lg border border-zinc-800 text-zinc-400">
                  Activate Camera
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. Actively processing OCR loading spinner */}
        {processingOCR && (
          <div className="p-16 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl">
            <Loader2 size={36} className="animate-spin text-amber-500 mb-4" />
            <h4 className="font-bold text-sm text-zinc-200">Processing OCR Image Capture...</h4>
            <p className="text-xs text-zinc-500 mt-1">Extracting text labels using local neural engine. Wait a few seconds.</p>
          </div>
        )}

        {/* 4. Active Camera scanning screen overlay */}
        {scanning && (
          <div 
            className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between overflow-hidden text-white select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Embedded styles for laser line and box-shadow backdrop */}
            <style>{`
              @keyframes scan-laser {
                0% { top: 4%; }
                50% { top: 96%; }
                100% { top: 4%; }
              }
              .animate-scan-laser {
                position: absolute;
                animation: scan-laser 2.5s infinite linear;
              }
              .scanner-shading {
                box-shadow: 0 0 0 9999px rgba(9, 9, 11, 0.7);
              }
            `}</style>

            {/* Error / Error state block */}
            {cameraError && (
              <div className="absolute top-20 left-4 right-4 z-50 p-4 bg-red-950/80 border border-red-800 rounded-2xl flex items-start gap-2.5 text-xs text-red-300 shadow-2xl">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Camera Initialization Failure</p>
                  <p className="mt-0.5">{cameraError}</p>
                </div>
              </div>
            )}

            {/* Top Control strip */}
            <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
              <div>
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Scanning...
                </span>
                <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wide">{activeMode} Scan</h3>
              </div>
              <button 
                onClick={cancelScanning} 
                className="p-2.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Full-Screen video preview */}
            <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : "scale-x-[1]"}`}
              />
              
              {/* Overlay guidelines box centered */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                
                {/* Scanner Instructions */}
                <div className="text-center px-4 mb-4 z-10">
                  <p className="text-xs text-zinc-200 font-semibold bg-black/60 px-3.5 py-2 rounded-full backdrop-blur-xs max-w-sm">
                    Align the QR Code, Barcode, or Asset Label inside the frame.
                  </p>
                </div>

                {/* Target Frame Area */}
                <div 
                  id="ocr-scan-guide"
                  className={`relative rounded-2xl border-2 transition-all duration-300 scanner-shading ${
                    successDetected ? "border-emerald-500 scale-105" : "border-zinc-400/80"
                  } ${
                    activeMode === "Barcode" ? "w-[85vw] h-[30vh] max-w-[500px]" : "w-[80vw] h-[80vw] max-w-[340px] max-h-[340px]"
                  }`}
                >
                  {/* Outer Corner Guide brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg -mt-1 -ml-1" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg -mt-1 -mr-1" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg -mt-1 -ml-1" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg -mt-1 -mr-1" />

                  {/* Animated laser line */}
                  {!successDetected && (
                    <div className="absolute left-1.5 right-1.5 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.85)] animate-scan-laser" />
                  )}

                  {/* Success animations overlay */}
                  {successDetected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-xs rounded-2xl animate-scale-in">
                      <CheckCircle className="text-emerald-400 animate-bounce mb-2" size={54} />
                      <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                        {activeMode === "QR Code" ? "QR Code Detected" : activeMode === "Barcode" ? "Barcode Detected" : "Text Detected"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Toast / Help Tip overlay messages */}
                {(ocrTip || scanTimeoutMsg) && (
                  <div className="text-center px-6 mt-6 z-10 max-w-sm">
                    <p className="text-xs bg-rose-950/80 border border-rose-800 text-rose-300 py-2 px-4 rounded-xl shadow-lg font-medium animate-pulse">
                      {ocrTip || scanTimeoutMsg}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions strip */}
            <div className="w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 z-10 flex flex-col gap-4">
              {/* Zoom control slider if zoom is active */}
              {cameraCapabilities?.zoom && (
                <div className="w-full flex items-center justify-center gap-3 px-4 bg-black/40 py-1.5 rounded-full max-w-md mx-auto">
                  <span className="text-[10px] text-zinc-400 font-bold">1x</span>
                  <input 
                    type="range"
                    min={cameraCapabilities.zoom.min || 1}
                    max={cameraCapabilities.zoom.max || 4}
                    step="0.1"
                    value={zoomVal}
                    onChange={e => handleZoomChange(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-400 h-1 rounded-lg bg-zinc-800 outline-none cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-400 font-bold">{zoomVal.toFixed(1)}x</span>
                </div>
              )}

              {/* Camera configuration button controls */}
              <div className="flex items-center justify-center gap-6">
                {/* Flash/Torch Switcher */}
                {torchSupported && (
                  <button 
                    onClick={toggleTorch} 
                    className={`p-3.5 rounded-full transition ${
                      torchOn ? "bg-amber-500 text-zinc-950" : "bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300"
                    } border border-zinc-800`}
                    title="Toggle Flash"
                  >
                    <Sun size={20} />
                  </button>
                )}
                
                {/* Manual capture trigger for OCR */}
                {activeMode === "OCR" && (
                  <button 
                    onClick={() => {
                      runDetectionLoop();
                    }} 
                    className="p-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg transform active:scale-95 transition"
                    title="Capture OCR Frame"
                  >
                    <Camera size={26} />
                  </button>
                )}

                {/* Switch Camera Button */}
                {cameraDevices.length > 1 && (
                  <button 
                    onClick={handleSwitchCamera} 
                    className="p-3.5 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition"
                    title="Switch Camera"
                  >
                    <RefreshCw size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Captured items database list & Search timeline (Search Screen) */}
        {!scanning && !processingOCR && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2 no-print">
              <div>
                <h3 className="font-extrabold text-sm uppercase text-zinc-200 tracking-wider">IT Asset Captures Database</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Scanned records rows registry log list</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={exportExcelSheet} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition hover:cursor-pointer"
                >
                  <FileSpreadsheet size={13} />
                  Excel
                </button>
                <button 
                  onClick={exportCSVFile} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition hover:cursor-pointer"
                >
                  <Download size={13} />
                  CSV
                </button>
                <button 
                  onClick={handlePrint} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition hover:cursor-pointer"
                >
                  <Printer size={13} />
                  Print
                </button>
              </div>
            </div>

            {/* Filters panel */}
            <div className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-wrap items-center gap-3 no-print">
              {/* Search text */}
              <div className="relative flex-1 min-w-[240px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search by QR/Barcode, Serial Numbers, Labs, OCR Text, Remarks..."
                  className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-rose-500 outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-200 transition font-medium"
                />
              </div>

              {/* Scan Type Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase font-black">Scan:</span>
                <select 
                  value={filterScanType}
                  onChange={e => { setFilterScanType(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs text-zinc-300 border-none outline-none focus:ring-0 p-0 pr-6"
                >
                  <option value="All">All Types</option>
                  <option value="QR Code">QR Code</option>
                  <option value="Barcode">Barcode</option>
                  <option value="OCR">OCR</option>
                </select>
              </div>

              {/* Lab Filter */}
              <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase font-black">Lab:</span>
                <select 
                  value={filterLab}
                  onChange={e => { setFilterLab(e.target.value); setPage(1); }}
                  className="bg-transparent text-xs text-zinc-300 border-none outline-none focus:ring-0 p-0 pr-6 max-w-[150px]"
                >
                  <option value="All">All Labs</option>
                  {labs.map(l => (
                    <option key={l.id} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <input 
                type="date" 
                value={filterDate}
                onChange={e => { setFilterDate(e.target.value); setPage(1); }}
                className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-xs text-zinc-400 focus:border-rose-500 outline-none"
              />

              {/* Clear button */}
              {(searchQuery || filterScanType !== "All" || filterLab !== "All" || filterDate) && (
                <button 
                  onClick={() => {
                    setSearchQuery("");
                    setFilterScanType("All");
                    setFilterLab("All");
                    setFilterDate("");
                  }} 
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:cursor-pointer"
                >
                  <X size={12} />
                  Clear
                </button>
              )}
            </div>

            {/* List Table container */}
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow">
              {filteredCaptures.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <Camera size={36} className="text-zinc-700 mb-3" />
                  <p className="text-zinc-400 font-bold text-sm">No QR Code, Barcode, or Text found</p>
                  <p className="text-xs text-zinc-650 mt-1 max-w-xs">Change your filters or scan an item to populate data rows.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-850 text-zinc-500 font-black uppercase text-[10px]">
                        <th className="py-3 px-4">Date &amp; Time</th>
                        <th className="py-3 px-4">Location (Lab)</th>
                        <th className="py-3 px-4">Scan Type</th>
                        <th className="py-3 px-4">Captured Value</th>
                        <th className="py-3 px-4">CPU Serial</th>
                        <th className="py-3 px-4">Monitor Serial</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-855 text-zinc-350">
                      {paginatedCaptures.map(asset => {
                        const dateStr = new Date(asset.createdDate).toLocaleString("en-IN");
                        return (
                          <tr key={asset.id} className="hover:bg-zinc-950/40 transition">
                            <td className="py-3 px-4 font-mono text-zinc-500">{dateStr}</td>
                            <td className="py-3 px-4 font-bold text-zinc-200">{asset.location}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${
                                asset.scanType === "QR Code" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" :
                                asset.scanType === "Barcode" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                                "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              }`}>
                                {asset.scanType}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-zinc-300 max-w-[150px] truncate" title={asset.scannedValue || ""}>
                              {asset.scannedValue || "—"}
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400">{asset.cpuSerialNumber || "—"}</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">{asset.monitorSerialNumber || "—"}</td>
                            <td className="py-3 px-4 font-semibold text-zinc-400">🧑‍💻 {asset.createdBy}</td>
                            <td className="py-3 px-4 no-print">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                  }} 
                                  className="p-1.5 hover:bg-zinc-800 text-zinc-450 hover:text-zinc-200 rounded-lg transition hover:cursor-pointer"
                                  title="View Details"
                                >
                                  <Eye size={13} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setForm({
                                      scanType: asset.scanType,
                                      scannedValue: asset.scannedValue || "",
                                      ocrText: asset.ocrText || "",
                                      imagePath: asset.imagePath || "",
                                      location: asset.location,
                                      remarks: asset.remarks || "",
                                      status: asset.status,
                                      cpuSerialNumber: asset.cpuSerialNumber || "",
                                      monitorSerialNumber: asset.monitorSerialNumber || "",
                                      barcodeSerialNumber: asset.barcodeSerialNumber || "",
                                    });
                                    setEditingId(asset.id);
                                    setCapturedImage(asset.imagePath);
                                    setShowReviewModal(true);
                                  }} 
                                  className="p-1.5 hover:bg-zinc-800 text-zinc-450 hover:text-blue-300 rounded-lg transition hover:cursor-pointer"
                                  title="Edit Record"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRecord(asset.id)} 
                                  className="p-1.5 hover:bg-zinc-850 text-zinc-500 hover:text-rose-500 rounded-lg transition hover:cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 no-print">
                <p className="text-xs text-zinc-500 font-semibold">Page {page} of {totalPages} · {filteredCaptures.length} captures log rows</p>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1} 
                    className="p-2 rounded-lg hover:bg-zinc-900 border border-zinc-800 disabled:opacity-30 text-zinc-400 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => {
                    const pg = i + 1;
                    return (
                      <button 
                        key={pg} 
                        onClick={() => setPage(pg)} 
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition hover:cursor-pointer ${
                          pg === page ? "bg-rose-600 text-white" : "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages} 
                    className="p-2 rounded-lg hover:bg-zinc-900 border border-zinc-800 disabled:opacity-30 text-zinc-400 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. REVIEW MODAL DIALOG */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
          <div className="bg-zinc-950 border border-zinc-800 max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden animate-float-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
              <div>
                <span className="text-[10px] text-zinc-550 font-extrabold uppercase tracking-widest">IT Asset Review Registry</span>
                <h2 className="text-base font-bold text-zinc-200">
                  {editingId ? "Modify Asset Record" : "Review Captured Asset Details"}
                </h2>
              </div>
              <button 
                onClick={() => setShowReviewModal(false)} 
                className="text-zinc-400 hover:text-zinc-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 space-y-4 text-left">
              
              {/* Snapshot image path overview (from OCR snapshot) */}
              {capturedImage && (
                <div className="border border-zinc-850 rounded-xl overflow-hidden bg-black flex justify-center max-h-40 relative group">
                  <img src={capturedImage} alt="Snapshot Preview" className="max-h-40 object-contain w-full" />
                  <span className="absolute bottom-2 right-2 text-[8px] bg-black/60 px-1.5 py-0.5 rounded text-zinc-400 uppercase font-black select-none">Snapshot Preview</span>
                </div>
              )}

              {/* Grid Form Details */}
              <div className="grid grid-cols-2 gap-3.5 text-xs">
                
                {/* Laboratory Dropdown selector */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Target Laboratory *</label>
                  <div className="relative">
                    <select 
                      value={form.location}
                      onChange={e => setForm((p: any) => ({ ...p, location: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-750 hover:border-zinc-700 outline-none rounded-xl px-3 py-2.5 text-zinc-200 focus:border-rose-500 transition appearance-none cursor-pointer pr-10 font-medium"
                      required
                    >
                      <option value="">-- Choose Laboratory Dropdown --</option>
                      {labs.map(l => (
                        <option key={l.id} value={l.name}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                    <Building size={14} className="absolute right-3.5 top-3.5 text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                {/* Scan type and Scanned value */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Scan Type</label>
                  <input 
                    type="text" 
                    value={form.scanType}
                    disabled
                    className="w-full bg-zinc-900 border border-zinc-850 outline-none rounded-xl px-3 py-2 text-zinc-500 font-extrabold uppercase cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Scanned Value</label>
                  <input 
                    type="text" 
                    value={form.scannedValue}
                    onChange={e => setForm((p: any) => ({ ...p, scannedValue: e.target.value }))}
                    className="w-full bg-zinc-905 border border-zinc-755 outline-none rounded-xl px-3 py-2 text-zinc-200 focus:border-rose-500 transition font-mono font-bold"
                  />
                </div>

                {/* Row inputs: CPU, Monitor, Barcode Serial */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">CPU Serial Number</label>
                  <input 
                    type="text" 
                    value={form.cpuSerialNumber}
                    onChange={e => setForm((p: any) => ({ ...p, cpuSerialNumber: e.target.value.toUpperCase() }))}
                    placeholder="E.g. CPU-987654"
                    className="w-full bg-zinc-905 border border-zinc-755 outline-none rounded-xl px-3 py-2 text-zinc-200 focus:border-rose-500 transition font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Monitor Serial / QR</label>
                  <input 
                    type="text" 
                    value={form.monitorSerialNumber}
                    onChange={e => setForm((p: any) => ({ ...p, monitorSerialNumber: e.target.value.toUpperCase() }))}
                    placeholder="E.g. MON-321456"
                    className="w-full bg-zinc-905 border border-zinc-755 outline-none rounded-xl px-3 py-2 text-zinc-200 focus:border-rose-500 transition font-mono"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Barcode Serial Number</label>
                  <input 
                    type="text" 
                    value={form.barcodeSerialNumber}
                    onChange={e => setForm((p: any) => ({ ...p, barcodeSerialNumber: e.target.value }))}
                    placeholder="E.g. 8901234567890"
                    className="w-full bg-zinc-905 border border-zinc-755 outline-none rounded-xl px-3 py-2 text-zinc-200 focus:border-rose-500 transition font-mono"
                  />
                </div>

                {/* Remarks */}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Remarks / Notes</label>
                  <textarea 
                    value={form.remarks}
                    onChange={e => setForm((p: any) => ({ ...p, remarks: e.target.value }))}
                    placeholder="Enter any damage issues, service tags description..."
                    rows={2}
                    className="w-full bg-zinc-905 border border-zinc-755 outline-none rounded-xl px-3 py-2 text-zinc-200 focus:border-rose-500 transition"
                  />
                </div>

                {/* OCR Recognized Raw logs (For debug/review) */}
                {form.ocrText && (
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Recognized OCR Text (Raw Log)</label>
                    <div className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-850 font-mono text-[9px] text-zinc-500 overflow-y-auto max-h-24 whitespace-pre-wrap select-text leading-normal">
                      {form.ocrText}
                    </div>
                  </div>
                )}

              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850 mt-4">
                <button 
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl transition text-xs font-bold hover:cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl transition text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-900/10 cursor-pointer"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DETAIL VIEW DIALOG */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto no-print">
          <div className="bg-zinc-950 border border-zinc-805 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden animate-float-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
              <div>
                <span className="text-[9px] text-zinc-550 font-extrabold uppercase tracking-widest">IT Asset Capture Details</span>
                <h3 className="font-bold text-zinc-200">{selectedAsset.scanType} · Detail Sheet</h3>
              </div>
              <button 
                onClick={() => setSelectedAsset(null)} 
                className="text-zinc-400 hover:text-zinc-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left text-xs">
              {/* Image Preview */}
              {selectedAsset.imagePath && (
                <div className="border border-zinc-850 rounded-xl overflow-hidden bg-black flex justify-center max-h-48 relative group">
                  <img src={selectedAsset.imagePath} alt="Snapshot Preview" className="max-h-48 object-contain w-full" />
                </div>
              )}

              {/* Core Parameters */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Record UUID</span>
                  <span className="font-mono text-zinc-300 font-bold block truncate" title={selectedAsset.id}>{selectedAsset.id}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Capture Timestamp</span>
                  <span className="text-zinc-300 font-bold block">{new Date(selectedAsset.createdDate).toLocaleString("en-IN")}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl col-span-2">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Lab Name / Location</span>
                  <span className="text-zinc-200 font-bold text-sm block">🏫 {selectedAsset.location}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Operator (Created By)</span>
                  <span className="text-zinc-300 font-bold block">🧑‍💻 {selectedAsset.createdBy}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Capture Status</span>
                  <span className="text-emerald-400 font-bold block">🟢 {selectedAsset.status}</span>
                </div>

                {/* Serial keys */}
                <div className="bg-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">CPU Serial Number</span>
                  <span className="font-mono text-zinc-300 font-bold block">{selectedAsset.cpuSerialNumber || "—"}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Monitor Serial Number</span>
                  <span className="font-mono text-zinc-300 font-bold block">{selectedAsset.monitorSerialNumber || "—"}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl col-span-2">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Barcode Serial Number</span>
                  <span className="font-mono text-zinc-300 font-bold block">{selectedAsset.barcodeSerialNumber || "—"}</span>
                </div>

                {/* Scanned string */}
                <div className="bg-zinc-900 p-3 rounded-xl col-span-2">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Raw Decoded String</span>
                  <span className="font-mono text-zinc-200 font-bold block select-all break-all">{selectedAsset.scannedValue || "—"}</span>
                </div>

                {/* Remarks */}
                <div className="bg-zinc-900 p-3 rounded-xl col-span-2">
                  <span className="text-[9px] text-zinc-500 uppercase font-black block">Remarks / Notes</span>
                  <span className="text-zinc-300 font-semibold block leading-relaxed">{selectedAsset.remarks || "No remarks noted."}</span>
                </div>

                {/* OCR text */}
                {selectedAsset.ocrText && (
                  <div className="bg-zinc-900 p-3 rounded-xl col-span-2">
                    <span className="text-[9px] text-zinc-500 uppercase font-black block">Recognized OCR Text (Raw)</span>
                    <div className="bg-zinc-950 p-2 border border-zinc-850 rounded font-mono text-[9px] text-zinc-400 mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap select-text leading-normal">
                      {selectedAsset.ocrText}
                    </div>
                  </div>
                )}
              </div>

              {/* Details Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850 mt-4">
                <button 
                  onClick={() => setSelectedAsset(null)} 
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-xl text-xs hover:cursor-pointer"
                >
                  Close Drawer
                </button>
                <button 
                  onClick={() => {
                    setForm({
                      scanType: selectedAsset.scanType,
                      scannedValue: selectedAsset.scannedValue || "",
                      ocrText: selectedAsset.ocrText || "",
                      imagePath: selectedAsset.imagePath || "",
                      location: selectedAsset.location,
                      remarks: selectedAsset.remarks || "",
                      status: selectedAsset.status,
                      cpuSerialNumber: selectedAsset.cpuSerialNumber || "",
                      monitorSerialNumber: selectedAsset.monitorSerialNumber || "",
                      barcodeSerialNumber: selectedAsset.barcodeSerialNumber || "",
                    });
                    setEditingId(selectedAsset.id);
                    setCapturedImage(selectedAsset.imagePath);
                    setShowReviewModal(true);
                    setSelectedAsset(null);
                  }}
                  className="px-4 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-blue-400 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-zinc-800 hover:cursor-pointer"
                >
                  <Edit2 size={12} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. PRINT PREVIEW PAGE (Only visible on browser printing) */}
      <div className="hidden print:block text-left text-black bg-white p-8 text-xs font-sans leading-normal">
        <div className="border-b border-black pb-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">SYMBIOSIS UNIVERSITY OF APPLIED SCIENCES</h1>
            <p className="text-[10px] uppercase font-bold tracking-wider text-rose-700">School of Computer Science &amp; IT (SCSIT)</p>
            <p className="text-[9px] text-gray-500 font-bold mt-1 uppercase">IT Asset Scanner Capture Log report</p>
          </div>
          <span className="text-[9px] text-gray-500">Date: {new Date().toLocaleString("en-IN")}</span>
        </div>

        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b border-black text-left font-bold uppercase text-[9px]">
              <th className="py-2">Timestamp</th>
              <th className="py-2">Location</th>
              <th className="py-2">Scan Mode</th>
              <th className="py-2">Captured Value</th>
              <th className="py-2">CPU Serial</th>
              <th className="py-2">Monitor Serial</th>
              <th className="py-2">Operator</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-250">
            {filteredCaptures.map(asset => (
              <tr key={asset.id} className="py-2">
                <td className="py-2 font-mono text-[9px]">{new Date(asset.createdDate).toLocaleString("en-IN")}</td>
                <td className="py-2 font-bold">{asset.location}</td>
                <td className="py-2">{asset.scanType}</td>
                <td className="py-2 font-mono">{asset.scannedValue || "—"}</td>
                <td className="py-2 font-mono">{asset.cpuSerialNumber || "—"}</td>
                <td className="py-2 font-mono">{asset.monitorSerialNumber || "—"}</td>
                <td className="py-2">{asset.createdBy}</td>
                <td className="py-2">{asset.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="border-t border-black pt-4 mt-8 flex justify-between text-[9px] text-gray-500">
          <p>Generated by SCSIT LabOS IT Team</p>
          <p>Page 1 of 1</p>
        </div>
      </div>

    </div>
  );
}

export default function AssetCaptureRegister() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 size={32} className="animate-spin text-rose-500 mb-4" />
        <p className="text-sm font-semibold text-zinc-500">Loading IT Asset Capture Workspace...</p>
      </div>
    }>
      <AssetCaptureContent />
    </Suspense>
  );
}
