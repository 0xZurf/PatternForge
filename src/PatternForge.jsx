import { useState, useRef, useEffect, useCallback } from "react";

// ── CONSTANTS ──
const POINT_RADIUS = 5;
const HANDLE_RADIUS = 4;
const SNAP_DIST = 8;
const PX_PER_INCH = 96;
const CM_PER_INCH = 2.54;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const GRID_COLOR = "rgba(255,255,255,0.04)";
const GRID_COLOR_MAJOR = "rgba(255,255,255,0.08)";

const uid = () => Math.random().toString(36).slice(2, 10);

const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const roundU = (v, decimals = 3) => Math.round(v * 10 ** decimals) / 10 ** decimals;

const inToCm = (v) => v * CM_PER_INCH;
const cmToIn = (v) => v / CM_PER_INCH;

const snapToGrid = (val, gridSize) => Math.round(val / gridSize) * gridSize;

// Bezier evaluation
const bezierPoint = (t, p0, p1, p2, p3) => {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};

// ── ICONS (inline SVG) ──
const icons = {
  select: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 2L3 14L7 10L11 16L13 15L9 9L14 9L3 2Z" fill="currentColor" />
    </svg>
  ),
  point: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3" fill="currentColor" />
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  ),
  line: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="3" y1="15" x2="15" y2="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3" cy="15" r="2" fill="currentColor" />
      <circle cx="15" cy="3" r="2" fill="currentColor" />
    </svg>
  ),
  curve: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 15 C3 6, 15 12, 15 3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="3" cy="15" r="2" fill="currentColor" />
      <circle cx="15" cy="3" r="2" fill="currentColor" />
    </svg>
  ),
  measure: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <line x1="2" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="2" y1="11" x2="2" y2="17" stroke="currentColor" strokeWidth="1.2" />
      <line x1="16" y1="11" x2="16" y2="17" stroke="currentColor" strokeWidth="1.2" />
      <text x="9" y="11" textAnchor="middle" fill="currentColor" fontSize="7" fontFamily="monospace">3.5"</text>
    </svg>
  ),
  delete: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  undo: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5 7L2 4L5 1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M2 4H10C12.2 4 14 5.8 14 8C14 10.2 12.2 12 10 12H6" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  ),
  redo: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 7L14 4L11 1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M14 4H6C3.8 4 2 5.8 2 8C2 10.2 3.8 12 6 12H10" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="0.7" />
      <line x1="10.5" y1="1" x2="10.5" y2="15" stroke="currentColor" strokeWidth="0.7" />
      <line x1="1" y1="5.5" x2="15" y2="5.5" stroke="currentColor" strokeWidth="0.7" />
      <line x1="1" y1="10.5" x2="15" y2="10.5" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  ),
  zoomIn: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1" />
      <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
  zoomOut: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

// ── STYLES ──
const S = {
  app: {
    width: "100%", height: "100vh", display: "flex", flexDirection: "column",
    background: "#111114", color: "#e0ddd8", fontFamily: "'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace",
    fontSize: 12, userSelect: "none", overflow: "hidden",
  },
  topBar: {
    height: 40, display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 12px", background: "#1a1a1e", borderBottom: "1px solid #2a2a2e",
    flexShrink: 0, gap: 8,
  },
  topGroup: { display: "flex", alignItems: "center", gap: 6 },
  brand: { fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "#f0ece6", marginRight: 16 },
  brandAccent: { color: "#e8a045" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  toolbar: {
    width: 44, background: "#1a1a1e", borderRight: "1px solid #2a2a2e",
    display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", gap: 2,
    flexShrink: 0,
  },
  toolBtn: (active) => ({
    width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 6, border: "none", cursor: "pointer",
    background: active ? "#e8a04520" : "transparent",
    color: active ? "#e8a045" : "#888",
    transition: "all 0.15s",
  }),
  divider: { width: 24, height: 1, background: "#2a2a2e", margin: "6px 0" },
  canvasWrap: { flex: 1, position: "relative", overflow: "hidden", cursor: "crosshair" },
  rightPanel: {
    width: 240, background: "#1a1a1e", borderLeft: "1px solid #2a2a2e",
    flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column",
  },
  panelSection: { padding: "12px 14px", borderBottom: "1px solid #222226" },
  panelTitle: { fontSize: 9, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#666", marginBottom: 8 },
  row: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  label: { width: 18, fontSize: 10, color: "#666", flexShrink: 0 },
  input: {
    flex: 1, height: 26, background: "#111114", border: "1px solid #2a2a2e", borderRadius: 4,
    color: "#e0ddd8", padding: "0 6px", fontSize: 11, fontFamily: "inherit", outline: "none",
  },
  statusBar: {
    height: 24, display: "flex", alignItems: "center", padding: "0 12px", gap: 16,
    background: "#151518", borderTop: "1px solid #2a2a2e", fontSize: 10, color: "#555",
    flexShrink: 0,
  },
  chip: (active) => ({
    padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
    background: active ? "#e8a04520" : "#222226", color: active ? "#e8a045" : "#888",
    border: active ? "1px solid #e8a04540" : "1px solid #2a2a2e",
  }),
  iconBtn: {
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "none", color: "#777", cursor: "pointer", borderRadius: 4,
  },
  modalOverlay: {
    position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#1e1e22", border: "1px solid #333", borderRadius: 8, padding: 20,
    minWidth: 280, display: "flex", flexDirection: "column", gap: 12,
  },
  modalTitle: { fontSize: 13, fontWeight: 600, color: "#e0ddd8" },
  btn: (primary) => ({
    height: 30, padding: "0 14px", borderRadius: 5, border: "none", cursor: "pointer",
    fontSize: 11, fontWeight: 600, fontFamily: "inherit",
    background: primary ? "#e8a045" : "#2a2a2e",
    color: primary ? "#111" : "#aaa",
  }),
  pointList: {
    maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2,
  },
  pointItem: (selected) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "4px 6px", borderRadius: 4, fontSize: 10, cursor: "pointer",
    background: selected ? "#e8a04512" : "transparent",
    color: selected ? "#e8a045" : "#999",
  }),
};

// ── MAIN COMPONENT ──
export default function PatternForge() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  // State
  const [points, setPoints] = useState({});
  const [paths, setPaths] = useState([]);
  const [tool, setTool] = useState("select");
  const [unit, setUnit] = useState("in");
  const [gridSnap, setGridSnap] = useState(false);
  const [gridSize, setGridSize] = useState(1); // 1 inch or 1 cm
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPathIdx, setSelectedPathIdx] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [lineStart, setLineStart] = useState(null);
  const [curvePoints, setCurvePoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [mouseWorld, setMouseWorld] = useState({ x: 0, y: 0 });
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [measureFrom, setMeasureFrom] = useState(null);
  const [measureDist, setMeasureDist] = useState("");
  const [measureAngle, setMeasureAngle] = useState("");
  const [dragHandle, setDragHandle] = useState(null); // {pathIdx, handleIdx}
  const [labelCounter, setLabelCounter] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  const pxPerUnit = unit === "in" ? PX_PER_INCH : PX_PER_INCH / CM_PER_INCH;

  const toScreen = useCallback((wx, wy) => ({
    x: (wx * pxPerUnit + pan.x) * zoom + canvasSize.w / 2,
    y: (-wy * pxPerUnit + pan.y) * zoom + canvasSize.h / 2,
  }), [pan, zoom, pxPerUnit, canvasSize]);

  const toWorld = useCallback((sx, sy) => ({
    x: ((sx - canvasSize.w / 2) / zoom - pan.x) / pxPerUnit,
    y: -(((sy - canvasSize.h / 2) / zoom - pan.y) / pxPerUnit),
  }), [pan, zoom, pxPerUnit, canvasSize]);

  const displayVal = useCallback((inchVal) => {
    if (unit === "cm") return roundU(inToCm(inchVal), 2);
    return roundU(inchVal, 3);
  }, [unit]);

  const parseInput = useCallback((val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return null;
    return unit === "cm" ? cmToIn(n) : n;
  }, [unit]);

  // Save state for undo
  const saveHistory = useCallback(() => {
    const snap = { points: { ...points }, paths: paths.map(p => ({ ...p, cp1: p.cp1 ? { ...p.cp1 } : undefined, cp2: p.cp2 ? { ...p.cp2 } : undefined })) };
    setHistory(h => {
      const newH = h.slice(0, historyIdx + 1);
      newH.push(snap);
      return newH.slice(-50);
    });
    setHistoryIdx(i => Math.min(i + 1, 49));
  }, [points, paths, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const snap = history[historyIdx - 1];
    setPoints(snap.points);
    setPaths(snap.paths);
    setHistoryIdx(i => i - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const snap = history[historyIdx + 1];
    setPoints(snap.points);
    setPaths(snap.paths);
    setHistoryIdx(i => i + 1);
  }, [history, historyIdx]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        setCanvasSize({ w: r.width, h: r.height });
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Key handlers
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        saveHistory();
        setPoints(p => {
          const np = { ...p };
          delete np[selectedId];
          return np;
        });
        setPaths(pp => pp.filter(p => p.a !== selectedId && p.b !== selectedId));
        setSelectedId(null);
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key === "y" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); redo(); }
      if (e.key === "v" || e.key === "V") setTool("select");
      if (e.key === "p" || e.key === "P") setTool("point");
      if (e.key === "l" || e.key === "L") setTool("line");
      if (e.key === "c" || e.key === "C") setTool("curve");
      if (e.key === "m" || e.key === "M") setTool("measure");
      if (e.key === "g" || e.key === "G") setGridSnap(g => !g);
      if (e.key === "Escape") { setLineStart(null); setCurvePoints([]); setSelectedId(null); setSelectedPathIdx(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, saveHistory, undo, redo]);

  // Find nearest point to screen coords
  const findNearestPoint = useCallback((sx, sy) => {
    let nearest = null;
    let minD = SNAP_DIST * 2;
    Object.entries(points).forEach(([id, pt]) => {
      const sp = toScreen(pt.x, pt.y);
      const d = dist(sp, { x: sx, y: sy });
      if (d < minD) { minD = d; nearest = id; }
    });
    return nearest;
  }, [points, toScreen]);

  // Find nearest curve handle
  const findNearestHandle = useCallback((sx, sy) => {
    let nearest = null;
    let minD = SNAP_DIST * 2;
    paths.forEach((p, idx) => {
      if (p.type !== "curve") return;
      if (p.cp1) {
        const sp = toScreen(p.cp1.x, p.cp1.y);
        const d = dist(sp, { x: sx, y: sy });
        if (d < minD) { minD = d; nearest = { pathIdx: idx, handleIdx: 1 }; }
      }
      if (p.cp2) {
        const sp = toScreen(p.cp2.x, p.cp2.y);
        const d = dist(sp, { x: sx, y: sy });
        if (d < minD) { minD = d; nearest = { pathIdx: idx, handleIdx: 2 }; }
      }
    });
    return nearest;
  }, [paths, toScreen]);

  // Canvas mouse handlers
  const onMouseDown = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = toWorld(sx, sy);

    // Middle click or space+click = pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      return;
    }

    if (tool === "select") {
      // Check handles first
      const handle = findNearestHandle(sx, sy);
      if (handle) {
        setDragHandle(handle);
        setSelectedPathIdx(handle.pathIdx);
        setIsDragging(true);
        saveHistory();
        return;
      }
      const nearest = findNearestPoint(sx, sy);
      if (nearest) {
        setSelectedId(nearest);
        setSelectedPathIdx(null);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        saveHistory();
      } else {
        setSelectedId(null);
        setSelectedPathIdx(null);
      }
    } else if (tool === "point") {
      saveHistory();
      let wx = world.x, wy = world.y;
      if (gridSnap) { wx = snapToGrid(wx, gridSize / (unit === "cm" ? CM_PER_INCH : 1)); wy = snapToGrid(wy, gridSize / (unit === "cm" ? CM_PER_INCH : 1)); }
      const id = uid();
      const label = "P" + labelCounter;
      setLabelCounter(c => c + 1);
      setPoints(p => ({ ...p, [id]: { x: wx, y: wy, label } }));
      setSelectedId(id);
    } else if (tool === "line") {
      const nearest = findNearestPoint(sx, sy);
      if (nearest) {
        if (lineStart && lineStart !== nearest) {
          saveHistory();
          setPaths(pp => [...pp, { type: "line", a: lineStart, b: nearest }]);
          setLineStart(nearest);
        } else {
          setLineStart(nearest);
        }
      } else {
        // Place new point and start/continue line
        saveHistory();
        let wx = world.x, wy = world.y;
        if (gridSnap) { wx = snapToGrid(wx, gridSize / (unit === "cm" ? CM_PER_INCH : 1)); wy = snapToGrid(wy, gridSize / (unit === "cm" ? CM_PER_INCH : 1)); }
        const id = uid();
        const label = "P" + labelCounter;
        setLabelCounter(c => c + 1);
        setPoints(p => ({ ...p, [id]: { x: wx, y: wy, label } }));
        if (lineStart) {
          setPaths(pp => [...pp, { type: "line", a: lineStart, b: id }]);
        }
        setLineStart(id);
      }
    } else if (tool === "curve") {
      const nearest = findNearestPoint(sx, sy);
      const clickedId = nearest;
      if (!clickedId) {
        // Place new point
        saveHistory();
        let wx = world.x, wy = world.y;
        if (gridSnap) { wx = snapToGrid(wx, gridSize / (unit === "cm" ? CM_PER_INCH : 1)); wy = snapToGrid(wy, gridSize / (unit === "cm" ? CM_PER_INCH : 1)); }
        const id = uid();
        const label = "P" + labelCounter;
        setLabelCounter(c => c + 1);
        setPoints(p => ({ ...p, [id]: { x: wx, y: wy, label } }));
        setCurvePoints(cp => {
          const ncp = [...cp, id];
          if (ncp.length === 2) {
            const ptA = points[ncp[0]] || { x: wx, y: wy };
            const ptB = { x: wx, y: wy };
            const dx = ptB.x - ptA.x, dy = ptB.y - ptA.y;
            setPaths(pp => [...pp, {
              type: "curve", a: ncp[0], b: ncp[1],
              cp1: { x: ptA.x + dx * 0.33, y: ptA.y + dy * 0.33 },
              cp2: { x: ptA.x + dx * 0.66, y: ptA.y + dy * 0.66 },
            }]);
            return [];
          }
          return ncp;
        });
      } else {
        setCurvePoints(cp => {
          const ncp = [...cp, clickedId];
          if (ncp.length === 2 && ncp[0] !== ncp[1]) {
            const ptA = points[ncp[0]];
            const ptB = points[ncp[1]];
            if (ptA && ptB) {
              const dx = ptB.x - ptA.x, dy = ptB.y - ptA.y;
              saveHistory();
              setPaths(pp => [...pp, {
                type: "curve", a: ncp[0], b: ncp[1],
                cp1: { x: ptA.x + dx * 0.33, y: ptA.y + dy * 0.33 },
                cp2: { x: ptA.x + dx * 0.66, y: ptA.y + dy * 0.66 },
              }]);
            }
            return [];
          }
          return ncp;
        });
      }
    } else if (tool === "measure") {
      const nearest = findNearestPoint(sx, sy);
      if (nearest) {
        setMeasureFrom(nearest);
        setShowMeasureModal(true);
        setMeasureDist("");
        setMeasureAngle("0");
      }
    }
  }, [tool, toWorld, findNearestPoint, findNearestHandle, points, lineStart, curvePoints, gridSnap, gridSize, unit, pan, saveHistory, labelCounter]);

  const onMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setMouseWorld(toWorld(sx, sy));

    if (isPanning && dragStart) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      setPan({ x: dragStart.panX + dx, y: dragStart.panY + dy });
      return;
    }

    if (isDragging && dragHandle) {
      const world = toWorld(sx, sy);
      setPaths(pp => pp.map((p, i) => {
        if (i !== dragHandle.pathIdx) return p;
        if (dragHandle.handleIdx === 1) return { ...p, cp1: { x: world.x, y: world.y } };
        return { ...p, cp2: { x: world.x, y: world.y } };
      }));
      return;
    }

    if (isDragging && selectedId) {
      const world = toWorld(sx, sy);
      let wx = world.x, wy = world.y;
      if (gridSnap) {
        const gs = gridSize / (unit === "cm" ? CM_PER_INCH : 1);
        wx = snapToGrid(wx, gs);
        wy = snapToGrid(wy, gs);
      }
      setPoints(p => ({ ...p, [selectedId]: { ...p[selectedId], x: wx, y: wy } }));
      return;
    }

    if (tool === "select") {
      setHoveredId(findNearestPoint(sx, sy));
    }
  }, [tool, isDragging, isPanning, selectedId, dragHandle, dragStart, zoom, toWorld, findNearestPoint, gridSnap, gridSize, unit]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setDragStart(null);
    setDragHandle(null);
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * delta)));
  }, []);

  // Measure modal submit
  const submitMeasure = useCallback(() => {
    const d = parseInput(measureDist);
    const angle = parseFloat(measureAngle) || 0;
    if (d === null || !measureFrom || !points[measureFrom]) return;
    saveHistory();
    const from = points[measureFrom];
    const rad = (angle * Math.PI) / 180;
    const nx = from.x + d * Math.cos(rad);
    const ny = from.y + d * Math.sin(rad);
    const id = uid();
    const label = "P" + labelCounter;
    setLabelCounter(c => c + 1);
    setPoints(p => ({ ...p, [id]: { x: nx, y: ny, label } }));
    setPaths(pp => [...pp, { type: "line", a: measureFrom, b: id }]);
    setSelectedId(id);
    setShowMeasureModal(false);
  }, [measureFrom, measureDist, measureAngle, parseInput, points, saveHistory, labelCounter]);

  // ── RENDER CANVAS ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#111114";
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    // Grid
    const gridUnitPx = pxPerUnit * zoom;
    const gs = gridSnap ? gridSize : 1;
    const gridPx = gs * pxPerUnit * zoom;

    if (gridPx > 8) {
      const ox = (pan.x * zoom + canvasSize.w / 2) % gridPx;
      const oy = (pan.y * zoom + canvasSize.h / 2) % gridPx;

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      for (let x = ox; x < canvasSize.w; x += gridPx) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasSize.h); ctx.stroke();
      }
      for (let y = oy; y < canvasSize.h; y += gridPx) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasSize.w, y); ctx.stroke();
      }

      // Major grid lines
      const majorPx = gridPx * (unit === "in" ? (gs >= 1 ? 1 : Math.ceil(1 / gs)) : (gs >= 1 ? 5 : Math.ceil(5 / gs)));
      if (majorPx > gridPx) {
        const mox = (pan.x * zoom + canvasSize.w / 2) % majorPx;
        const moy = (pan.y * zoom + canvasSize.h / 2) % majorPx;
        ctx.strokeStyle = GRID_COLOR_MAJOR;
        ctx.lineWidth = 0.8;
        for (let x = mox; x < canvasSize.w; x += majorPx) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasSize.h); ctx.stroke();
        }
        for (let y = moy; y < canvasSize.h; y += majorPx) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasSize.w, y); ctx.stroke();
        }
      }
    }

    // Origin crosshair
    const origin = toScreen(0, 0);
    ctx.strokeStyle = "rgba(232,160,69,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, canvasSize.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(canvasSize.w, origin.y); ctx.stroke();

    // Paths
    paths.forEach((path, idx) => {
      const ptA = points[path.a];
      const ptB = points[path.b];
      if (!ptA || !ptB) return;
      const sa = toScreen(ptA.x, ptA.y);
      const sb = toScreen(ptB.x, ptB.y);

      const isSelected = idx === selectedPathIdx;
      ctx.strokeStyle = isSelected ? "#e8a045" : "#667";
      ctx.lineWidth = isSelected ? 2 : 1.5;

      if (path.type === "line") {
        ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
        // Length label
        const d = dist(ptA, ptB);
        const mx = (sa.x + sb.x) / 2;
        const my = (sa.y + sb.y) / 2;
        ctx.fillStyle = "#555";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(displayVal(d) + (unit === "in" ? '"' : "cm"), mx, my - 6);
      } else if (path.type === "curve" && path.cp1 && path.cp2) {
        const sc1 = toScreen(path.cp1.x, path.cp1.y);
        const sc2 = toScreen(path.cp2.x, path.cp2.y);
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.bezierCurveTo(sc1.x, sc1.y, sc2.x, sc2.y, sb.x, sb.y);
        ctx.stroke();

        // Control handle lines
        if (isSelected || tool === "select") {
          ctx.strokeStyle = "rgba(232,160,69,0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sc1.x, sc1.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sb.x, sb.y); ctx.lineTo(sc2.x, sc2.y); ctx.stroke();
          ctx.setLineDash([]);

          // Handle dots
          ctx.fillStyle = "#e8a045";
          ctx.beginPath(); ctx.arc(sc1.x, sc1.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(sc2.x, sc2.y, HANDLE_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
      }
    });

    // Preview line (line tool)
    if (tool === "line" && lineStart && points[lineStart]) {
      const sp = toScreen(points[lineStart].x, points[lineStart].y);
      const sm = toScreen(mouseWorld.x, mouseWorld.y);
      ctx.strokeStyle = "rgba(232,160,69,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sm.x, sm.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Preview curve start
    if (tool === "curve" && curvePoints.length === 1 && points[curvePoints[0]]) {
      const sp = toScreen(points[curvePoints[0]].x, points[curvePoints[0]].y);
      const sm = toScreen(mouseWorld.x, mouseWorld.y);
      ctx.strokeStyle = "rgba(232,160,69,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sm.x, sm.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Points
    Object.entries(points).forEach(([id, pt]) => {
      const sp = toScreen(pt.x, pt.y);
      const isSelected = id === selectedId;
      const isHovered = id === hoveredId;
      const r = isSelected ? POINT_RADIUS + 2 : isHovered ? POINT_RADIUS + 1 : POINT_RADIUS;

      // Outer ring
      if (isSelected) {
        ctx.strokeStyle = "#e8a045";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, r + 3, 0, Math.PI * 2); ctx.stroke();
      }

      // Point fill
      ctx.fillStyle = isSelected ? "#e8a045" : isHovered ? "#aaa" : "#ddd";
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.fill();

      // Label
      ctx.fillStyle = isSelected ? "#e8a045" : "#666";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(pt.label, sp.x + r + 4, sp.y - 4);
    });

  }, [points, paths, pan, zoom, pxPerUnit, canvasSize, toScreen, selectedId, selectedPathIdx, hoveredId, tool, lineStart, curvePoints, mouseWorld, gridSnap, gridSize, unit, displayVal]);

  // Delete selected point
  const deleteSelected = () => {
    if (!selectedId) return;
    saveHistory();
    setPoints(p => { const np = { ...p }; delete np[selectedId]; return np; });
    setPaths(pp => pp.filter(p => p.a !== selectedId && p.b !== selectedId));
    setSelectedId(null);
  };

  // Update point coordinates from input
  const updatePointCoord = (axis, val) => {
    if (!selectedId || !points[selectedId]) return;
    const n = parseInput(val);
    if (n === null) return;
    saveHistory();
    setPoints(p => ({ ...p, [selectedId]: { ...p[selectedId], [axis]: n } }));
  };

  const selectedPoint = selectedId ? points[selectedId] : null;

  const toolDefs = [
    { id: "select", icon: icons.select, label: "Select (V)", key: "V" },
    { id: "point", icon: icons.point, label: "Point (P)", key: "P" },
    { id: "line", icon: icons.line, label: "Line (L)", key: "L" },
    { id: "curve", icon: icons.curve, label: "Curve (C)", key: "C" },
    { id: "measure", icon: icons.measure, label: "Measure (M)", key: "M" },
  ];

  return (
    <div style={S.app}>
      {/* TOP BAR */}
      <div style={S.topBar}>
        <div style={S.topGroup}>
          <span style={S.brand}>PATTERN<span style={S.brandAccent}>FORGE</span></span>
          <button style={S.iconBtn} onClick={undo} title="Undo (Ctrl+Z)">{icons.undo}</button>
          <button style={S.iconBtn} onClick={redo} title="Redo (Ctrl+Shift+Z)">{icons.redo}</button>
        </div>
        <div style={S.topGroup}>
          <span style={S.chip(unit === "in")} onClick={() => setUnit("in")}>IN</span>
          <span style={S.chip(unit === "cm")} onClick={() => setUnit("cm")}>CM</span>
          <div style={{ width: 1, height: 18, background: "#2a2a2e", margin: "0 4px" }} />
          <span style={S.chip(gridSnap)} onClick={() => setGridSnap(g => !g)}>{icons.grid} <span style={{ marginLeft: 4 }}>SNAP</span></span>
          <div style={{ width: 1, height: 18, background: "#2a2a2e", margin: "0 4px" }} />
          <button style={S.iconBtn} onClick={() => setZoom(z => Math.min(MAX_ZOOM, z * 1.2))}>{icons.zoomIn}</button>
          <span style={{ fontSize: 10, color: "#666", width: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button style={S.iconBtn} onClick={() => setZoom(z => Math.max(MIN_ZOOM, z * 0.8))}>{icons.zoomOut}</button>
          <button style={S.iconBtn} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="7" r="1.5" fill="currentColor" /></svg>
          </button>
        </div>
      </div>

      <div style={S.body}>
        {/* LEFT TOOLBAR */}
        <div style={S.toolbar}>
          {toolDefs.map(t => (
            <button key={t.id} style={S.toolBtn(tool === t.id)} onClick={() => { setTool(t.id); setLineStart(null); setCurvePoints([]); }} title={t.label}>
              {t.icon}
            </button>
          ))}
          <div style={S.divider} />
          <button style={S.toolBtn(false)} onClick={deleteSelected} title="Delete selected">
            {icons.delete}
          </button>
        </div>

        {/* CANVAS */}
        <div ref={wrapRef} style={S.canvasWrap}>
          <canvas
            ref={canvasRef}
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ width: canvasSize.w, height: canvasSize.h, display: "block" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            onContextMenu={e => e.preventDefault()}
          />
          {/* Measure Modal */}
          {showMeasureModal && (
            <div style={S.modalOverlay} onClick={() => setShowMeasureModal(false)}>
              <div style={S.modal} onClick={e => e.stopPropagation()}>
                <div style={S.modalTitle}>Place Point by Measurement</div>
                <div style={{ fontSize: 10, color: "#888" }}>From: {points[measureFrom]?.label}</div>
                <div style={S.row}>
                  <span style={S.label}>D</span>
                  <input
                    style={S.input}
                    placeholder={`Distance (${unit})`}
                    value={measureDist}
                    onChange={e => setMeasureDist(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && submitMeasure()}
                  />
                </div>
                <div style={S.row}>
                  <span style={S.label}>A</span>
                  <input
                    style={S.input}
                    placeholder="Angle (degrees)"
                    value={measureAngle}
                    onChange={e => setMeasureAngle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitMeasure()}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button style={S.btn(false)} onClick={() => setShowMeasureModal(false)}>Cancel</button>
                  <button style={S.btn(true)} onClick={submitMeasure}>Place</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={S.rightPanel}>
          {/* Properties */}
          <div style={S.panelSection}>
            <div style={S.panelTitle}>Properties</div>
            {selectedPoint ? (
              <>
                <div style={S.row}>
                  <span style={{ ...S.label, fontWeight: 600, color: "#e8a045" }}>{selectedPoint.label}</span>
                </div>
                <div style={S.row}>
                  <span style={S.label}>X</span>
                  <input
                    style={S.input}
                    value={displayVal(selectedPoint.x)}
                    onChange={e => updatePointCoord("x", e.target.value)}
                  />
                </div>
                <div style={S.row}>
                  <span style={S.label}>Y</span>
                  <input
                    style={S.input}
                    value={displayVal(selectedPoint.y)}
                    onChange={e => updatePointCoord("y", e.target.value)}
                  />
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
                  {unit === "in" ? "inches" : "centimeters"}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 10, color: "#444" }}>Select a point to see its properties</div>
            )}
          </div>

          {/* Points List */}
          <div style={S.panelSection}>
            <div style={S.panelTitle}>Points ({Object.keys(points).length})</div>
            <div style={S.pointList}>
              {Object.entries(points).map(([id, pt]) => (
                <div
                  key={id}
                  style={S.pointItem(id === selectedId)}
                  onClick={() => setSelectedId(id)}
                >
                  <span>{pt.label}</span>
                  <span style={{ fontSize: 9, opacity: 0.6 }}>
                    {displayVal(pt.x)}, {displayVal(pt.y)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Paths List */}
          <div style={S.panelSection}>
            <div style={S.panelTitle}>Paths ({paths.length})</div>
            <div style={S.pointList}>
              {paths.map((p, idx) => {
                const ptA = points[p.a];
                const ptB = points[p.b];
                if (!ptA || !ptB) return null;
                return (
                  <div
                    key={idx}
                    style={S.pointItem(idx === selectedPathIdx)}
                    onClick={() => setSelectedPathIdx(idx)}
                  >
                    <span>{p.type === "curve" ? "~" : "—"} {ptA.label} → {ptB.label}</span>
                    {p.type === "line" && (
                      <span style={{ fontSize: 9, opacity: 0.6 }}>
                        {displayVal(dist(ptA, ptB))}{unit === "in" ? '"' : "cm"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Help */}
          <div style={{ ...S.panelSection, borderBottom: "none" }}>
            <div style={S.panelTitle}>Shortcuts</div>
            <div style={{ fontSize: 9, color: "#444", lineHeight: 1.8 }}>
              V — Select &amp; move<br />
              P — Place point<br />
              L — Draw line<br />
              C — Draw curve<br />
              M — Measure place<br />
              G — Toggle grid snap<br />
              Del — Delete selected<br />
              Alt+Drag — Pan canvas<br />
              Scroll — Zoom<br />
              Esc — Cancel / deselect<br />
              Ctrl+Z / Ctrl+Shift+Z — Undo / Redo
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={S.statusBar}>
        <span>Tool: {tool.toUpperCase()}</span>
        <span>
          Cursor: {displayVal(mouseWorld.x)}, {displayVal(mouseWorld.y)} {unit}
        </span>
        <span>Points: {Object.keys(points).length}</span>
        <span>Paths: {paths.length}</span>
        {gridSnap && <span>Grid: {gridSize}{unit}</span>}
        <span style={{ marginLeft: "auto" }}>JohnnyLeeXYZ</span>
      </div>
    </div>
  );
}
