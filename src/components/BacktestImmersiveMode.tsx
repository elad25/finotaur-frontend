import { useState, useEffect, useCallback, useRef } from "react";
import { X, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Zap, Volume2, VolumeX } from "lucide-react";
import { ReplayChart, ReplayChartRef } from "@/components/ReplayChart";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useBacktestSounds } from "@/hooks/useBacktestSounds";
import { 
  TradeExecutionNotification, 
  useTradeNotifications 
} from "@/components/TradeExecutionNotification";

interface BacktestImmersiveModeProps {
  onExit?: () => void;
}

export function BacktestImmersiveMode({ onExit }: BacktestImmersiveModeProps) {
  const navigate = useNavigate();
  const chartRef = useRef<ReplayChartRef>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [progress, setProgress] = useState([0]);
  const [showControls, setShowControls] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSelectingStart, setIsSelectingStart] = useState(false);
  const [hasReplayPoint, setHasReplayPoint] = useState(false);
  
  const sounds = useBacktestSounds({ enabled: soundEnabled, volume: 0.3 });
  const {
    notification,
    showBuyNotification,
    showSellNotification,
    clearNotification,
  } = useTradeNotifications();

  const handleExit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      if (onExit) {
        onExit();
      } else {
        navigate("/app/journal/backtest/overview");
      }
    }, 300);
  }, [navigate, onExit]);

  // Auto-hide controls after 5 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        if (!isPlaying) {
          setShowControls(false);
        }
      }, 5000);
    };

    const handleMouseLeave = () => {
      clearTimeout(timeout);
      if (!isPlaying) {
        timeout = setTimeout(() => {
          setShowControls(false);
        }, 2000);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // When playing, keep controls visible
  useEffect(() => {
    if (isPlaying) {
      setShowControls(true);
    }
  }, [isPlaying]);

  // ESC key to exit or cancel selection
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isSelectingStart) {
          setIsSelectingStart(false);
        } else {
          handleExit();
        }
      }
    };
    
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleExit, isSelectingStart]);

  // Playback controls
  const handlePlay = () => {
    if (chartRef.current) {
      chartRef.current.play();
      setIsPlaying(true);
      sounds.playCandleTick?.();
    }
  };

  const handlePause = () => {
    if (chartRef.current) {
      chartRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStepBackward = () => {
    if (chartRef.current) {
      chartRef.current.stepBackward();
      sounds.playCandleTick?.();
    }
  };

  const handleStepForward = () => {
    if (chartRef.current) {
      chartRef.current.stepForward();
      sounds.playCandleTick?.();
    }
  };

  const handleSpeedChange = (value: string) => {
    setPlaybackSpeed(value);
    if (chartRef.current) {
      chartRef.current.setSpeed(parseFloat(value));
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const handleSetStartPoint = () => {
    setIsSelectingStart(!isSelectingStart);
    if (!isSelectingStart) {
      sounds.playCandleTick?.();
    }
  };

  const handleChartClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSelectingStart && chartRef.current) {
      const chartContainer = e.currentTarget;
      const rect = chartContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      
      chartRef.current.setReplayPoint(percentage);
      setProgress([percentage]);
      setHasReplayPoint(true);
      setIsSelectingStart(false);
      sounds.playTPSound?.();
    }
  };

  const handleResetReplay = () => {
    if (chartRef.current) {
      chartRef.current.reset();
      setProgress([100]);
      setHasReplayPoint(false);
      setIsPlaying(false);
      sounds.playSLSound?.();
    }
  };

  const handleReplayEnd = () => {
    setIsPlaying(false);
    sounds.playTPSound?.();
  };

  // Buy/Sell handlers (for demo)
  const handleBuy = () => {
    showBuyNotification({
      price: 95000,
      quantity: 0.5,
      symbol: "BTC/USD",
    });
    sounds.playBuySound?.();
  };

  const handleSell = () => {
    showSellNotification({
      price: 95000,
      quantity: 0.5,
      symbol: "BTC/USD",
    });
    sounds.playSellSound?.();
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-300 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Exit Button - Top Right */}
      <Button
        onClick={handleExit}
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 z-[10000] h-12 w-12 rounded-xl bg-black/60 backdrop-blur-sm border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500 transition-all duration-200"
      >
        <X className="h-5 w-5 text-rose-400" />
      </Button>

      {/* Sound Toggle - Top Right (next to exit) */}
      <Button
        onClick={toggleSound}
        size="icon"
        variant="ghost"
        className="absolute top-4 right-20 z-[10000] h-12 w-12 rounded-xl bg-black/60 backdrop-blur-sm border border-[#C9A646]/30 hover:bg-[#C9A646]/20 hover:border-[#C9A646] transition-all duration-200"
      >
        {soundEnabled ? (
          <Volume2 className="h-5 w-5 text-[#C9A646]" />
        ) : (
          <VolumeX className="h-5 w-5 text-[#C9A646]/50" />
        )}
      </Button>

      {/* Exit Immersive text - Top Right */}
      <div className="absolute top-4 right-36 z-[10000] text-[#C9A646] text-sm font-medium flex items-center gap-2">
        <span>Exit Immersive</span>
      </div>

      {/* Main Chart Container */}
      <div className="relative h-full w-full flex flex-col">
        {/* Replay Chart - Full Screen */}
        <div 
          className="flex-1 relative"
          onClick={handleChartClick}
          style={{ cursor: isSelectingStart ? 'crosshair' : 'default' }}
        >
          <ReplayChart 
            ref={chartRef}
            onReplayEnd={handleReplayEnd}
          />
          
          {/* Selection Mode Overlay */}
          {isSelectingStart && (
            <div className="absolute inset-0 bg-[#C9A646]/5 pointer-events-none flex items-center justify-center z-50">
              <div className="bg-black/80 backdrop-blur-xl border-2 border-[#C9A646] rounded-2xl px-8 py-6 animate-pulse">
                <p className="text-2xl text-[#C9A646] font-bold">Click on chart to set start point</p>
                <p className="text-sm text-[#C9A646]/60 text-center mt-2">The chart will be cut at this point</p>
                <p className="text-xs text-[#C9A646]/40 text-center mt-1">ESC to cancel</p>
              </div>
            </div>
          )}
        </div>

        {/* Hint Indicator - Shows when controls are hidden */}
        {!showControls && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[9998] animate-pulse">
            <div className="bg-black/60 backdrop-blur-sm border border-[#C9A646]/30 rounded-full px-4 py-2 text-xs text-[#C9A646]/80 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#C9A646] animate-pulse"></div>
              Move mouse to show controls
            </div>
          </div>
        )}

        {/* Trade Execution Notification */}
        <TradeExecutionNotification 
          notification={notification}
          onComplete={clearNotification}
        />

        {/* Floating Control Panel - Bottom Center */}
        <div 
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-300 z-[9999] ${
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <div className="bg-black/80 backdrop-blur-xl border border-[#C9A646]/30 rounded-3xl p-6 shadow-2xl shadow-black/50 min-w-[600px]">
            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button
                onClick={handleSetStartPoint}
                size="icon"
                variant="ghost"
                className={`h-10 w-10 rounded-xl transition-all duration-200 ${
                  isSelectingStart 
                    ? 'bg-[#C9A646] text-black border-2 border-[#C9A646]' 
                    : 'bg-white/5 hover:bg-[#C9A646]/20 border border-[#C9A646]/20'
                }`}
                title="Set Start Point"
              >
                <span className={`text-lg ${isSelectingStart ? 'animate-pulse' : ''}`}>📍</span>
              </Button>

              {hasReplayPoint && (
                <Button
                  onClick={handleResetReplay}
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-rose-500/30 transition-all duration-200"
                  title="Reset Replay"
                >
                  <span className="text-lg">🔄</span>
                </Button>
              )}

              <Button
                onClick={handleStepBackward}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-[#C9A646]/20 border border-[#C9A646]/20 transition-all duration-200"
              >
                <SkipBack className="h-4 w-4 text-[#C9A646]" />
              </Button>

              <Button
                onClick={handleStepBackward}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-[#C9A646]/20 border border-[#C9A646]/20 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4 text-[#C9A646]" />
              </Button>

              <Button
                onClick={isPlaying ? handlePause : handlePlay}
                size="icon"
                className="h-14 w-14 rounded-full bg-gradient-to-br from-[#C9A646] to-[#A68B3A] hover:from-[#D4B55E] hover:to-[#C9A646] text-black shadow-lg shadow-[#C9A646]/50 transition-all duration-200 hover:scale-110"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 fill-current" />
                ) : (
                  <Play className="h-6 w-6 fill-current ml-1" />
                )}
              </Button>

              <Button
                onClick={handleStepForward}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-[#C9A646]/20 border border-[#C9A646]/20 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4 text-[#C9A646]" />
              </Button>

              <Button
                onClick={handleStepForward}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-[#C9A646]/20 border border-[#C9A646]/20 transition-all duration-200"
              >
                <SkipForward className="h-4 w-4 text-[#C9A646]" />
              </Button>
            </div>

            {/* Progress Slider */}
            <div className="mb-4 px-2">
              <div className="flex items-center gap-4 text-xs text-[#C9A646]/60 mb-2">
                <span>Start</span>
                <div className="flex-1 text-center text-[#C9A646] font-medium">
                  {Math.round(progress[0])}%
                </div>
                <span>End</span>
              </div>
              <Slider
                value={progress}
                onValueChange={setProgress}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>

            {/* Speed Control & Stats */}
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#C9A646]" />
                <span className="text-xs text-[#C9A646]/60">Speed:</span>
                <Select value={playbackSpeed} onValueChange={handleSpeedChange}>
                  <SelectTrigger className="w-[140px] h-9 bg-white/5 border-[#C9A646]/20 text-[#C9A646]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-[#C9A646]/30">
                    <SelectItem value="0.25">0.25x (Slow)</SelectItem>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="1">1x (Normal)</SelectItem>
                    <SelectItem value="2">2x (Fast)</SelectItem>
                    <SelectItem value="5">5x</SelectItem>
                    <SelectItem value="10">10x (Ultra)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-xs">
                <div className="text-center">
                  <div className="text-[#C9A646]/60">Candles</div>
                  <div className="text-[#C9A646] font-bold">1,247</div>
                </div>
                <div className="text-center">
                  <div className="text-[#C9A646]/60">Trades</div>
                  <div className="text-[#C9A646] font-bold">23</div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400/60">Win Rate</div>
                  <div className="text-emerald-400 font-bold">67%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}