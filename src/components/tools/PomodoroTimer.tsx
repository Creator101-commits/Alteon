import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import { PomodoroSession, InsertPomodoroSession } from "@shared/schema";
import ElasticSlider from "@/components/ui/ElasticSlider";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  Clock,
  Coffee,
  Volume2,
  VolumeX,
  Music,
  Maximize,
  Minimize,
} from "lucide-react";

type TimerMode = "work" | "shortBreak" | "longBreak";

interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
}

type FocusSound = {
  id: string;
  name: string;
  url: string;
  description: string;
};

const focusSounds: FocusSound[] = [
  {
    id: "rain",
    name: "Rain",
    url: "/sounds/rain.mp3",
    description: "Gentle rain sounds"
  },
  {
    id: "forest",
    name: "Forest",
    url: "/sounds/forest.mp3", 
    description: "Forest ambience"
  },
  {
    id: "whitenoise",
    name: "White Noise",
    url: "/sounds/whitenoise.mp3",
    description: "Pure white noise"
  }
];

export const PomodoroTimer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>("work");
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string>("rain");
  const [volume, setVolume] = useState(0.3);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const settings: TimerSettings = {
    workDuration: 25 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    longBreakInterval: 4,
  };

  const getCurrentDuration = useCallback(() => {
    switch (mode) {
      case "work":
        return settings.workDuration;
      case "shortBreak":
        return settings.shortBreakDuration;
      case "longBreak":
        return settings.longBreakDuration;
    }
  }, [mode, settings]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getProgress = () => {
    const totalDuration = getCurrentDuration();
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  // Save pomodoro session to database
  const savePomodoroSession = async (sessionType: string, duration: number, completed: boolean) => {
    if (!user?.uid) return;

    try {
      const sessionData = {
        type: sessionType,
        duration,
      };

      const response = await apiPost(`/api/users/${user.uid}/pomodoro-sessions`, sessionData);
      
      if (response.ok) {
        console.log('Pomodoro session saved to database');
      } else {
        console.error('Failed to save pomodoro session:', response.status);
      }
    } catch (error) {
      console.error('Error saving pomodoro session:', error);
    }
  };

  const playNotificationSound = () => {
    // In a real app, you would play an actual sound file
    console.log("Timer notification");
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      stopMusic();
    } else {
      playMusic();
    }
  };

  const playMusic = () => {
    const sound = focusSounds.find(s => s.id === selectedSound);
    if (sound) {
      try {
        // Try to use real audio files first
        const audio = new Audio(sound.url);
        audio.loop = true;
        audio.volume = volume;
        audio.play().then(() => {
          setAudioRef(audio);
          setIsMusicPlaying(true);
        }).catch(() => {
          // Fallback to synthetic sounds if audio file fails
          playFallbackSound();
        });
      } catch (error) {
        // Fallback to synthetic sounds
        playFallbackSound();
      }
    }
  };

  const playFallbackSound = () => {
    // Create a simple oscillator for demo purposes when audio files are not available
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Create different tones based on selected sound
    switch (selectedSound) {
      case "rain":
        // White noise simulation for rain
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        break;
      case "forest":
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        break;
      case "white-noise":
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        break;
    }
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(volume * 0.1, audioContext.currentTime); // Very low volume
    
    oscillator.start();
    
    // Store reference for stopping
    (window as any).currentOscillator = oscillator;
    (window as any).currentAudioContext = audioContext;
    
    setIsMusicPlaying(true);
  };

  const stopMusic = () => {
    // Stop real audio if playing
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setAudioRef(null);
    }
    
    // Stop synthetic audio if playing
    if ((window as any).currentOscillator) {
      (window as any).currentOscillator.stop();
      (window as any).currentAudioContext.close();
      (window as any).currentOscillator = null;
      (window as any).currentAudioContext = null;
    }
    
    setIsMusicPlaying(false);
  };

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    
    // Update real audio volume if playing
    if (audioRef) {
      audioRef.volume = newVolume;
    }
    
    // Update synthetic audio volume if playing
    if (isMusicPlaying && (window as any).currentAudioContext) {
      const gainNode = (window as any).currentAudioContext.createGain();
      gainNode.gain.setValueAtTime(newVolume * 0.1, (window as any).currentAudioContext.currentTime);
    }
  };

  const handleTimerComplete = useCallback(async () => {
    playNotificationSound();
    
    // Save the completed session to database
    const duration = getCurrentDuration();
    await savePomodoroSession(mode, duration, true);
    
    if (mode === "work") {
      const newCompletedPomodoros = completedPomodoros + 1;
      setCompletedPomodoros(newCompletedPomodoros);
      setTotalSessions(prev => prev + 1);
      
      // Determine next break type
      const shouldTakeLongBreak = newCompletedPomodoros % settings.longBreakInterval === 0;
      const nextMode = shouldTakeLongBreak ? "longBreak" : "shortBreak";
      
      setMode(nextMode);
      setTimeLeft(nextMode === "longBreak" ? settings.longBreakDuration : settings.shortBreakDuration);
      
      toast({
        title: "Work session complete!",
        description: `Time for a ${shouldTakeLongBreak ? "long" : "short"} break`,
      });
    } else {
      setMode("work");
      setTimeLeft(settings.workDuration);
      setTotalSessions(prev => prev + 1);
      
      toast({
        title: "Break time over!",
        description: "Ready for another work session?",
      });
    }
    
    setIsRunning(false);
  }, [mode, completedPomodoros, settings, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleTimerComplete]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      // Clean up real audio
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      
      // Clean up synthetic audio
      if ((window as any).currentOscillator) {
        (window as any).currentOscillator.stop();
        (window as any).currentAudioContext?.close();
      }
    };
  }, [audioRef]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(getCurrentDuration());
  };

  const handleReset = () => {
    setIsRunning(false);
    setMode("work");
    setTimeLeft(settings.workDuration);
    setCompletedPomodoros(0);
    setTotalSessions(0);
  };

  const getModeColor = () => {
    switch (mode) {
      case "work":
        return "text-green-500";
      case "shortBreak":
        return "text-blue-500";
      case "longBreak":
        return "text-purple-500";
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case "work":
        return <Clock className="h-5 w-5" />;
      case "shortBreak":
      case "longBreak":
        return <Coffee className="h-5 w-5" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case "work":
        return "Work Session";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isFullScreen) {
      setIsFullScreen(false);
    }
    if (event.key === ' ') {
      event.preventDefault();
      if (isRunning) {
        handlePause();
      } else {
        handleStart();
      }
    }
  }, [isFullScreen, isRunning]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Full Screen Component
  const FullScreenTimer = () => (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="text-center space-y-8 p-8 max-w-2xl mx-auto">
        {/* Close Button */}
        <div className="absolute top-4 right-4">
          <Button 
            onClick={toggleFullScreen} 
            variant="outline" 
            size="sm"
            className="rounded-full"
          >
            <Minimize className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode Badge */}
        <div className="flex items-center justify-center space-x-3">
          <div className={getModeColor()}>
            {getModeIcon()}
          </div>
          <Badge variant="outline" className={`${getModeColor()} text-lg px-4 py-2`}>
            {getModeLabel()}
          </Badge>
        </div>
        
        {/* Large Timer Display */}
        <div className="text-8xl md:text-9xl font-mono font-bold text-foreground">
          {formatTime(timeLeft)}
        </div>
        
        {/* Progress Bar */}
        <Progress value={getProgress()} className="w-full h-4 max-w-md mx-auto" />

        {/* Large Controls */}
        <div className="flex justify-center items-center space-x-6">
          {!isRunning ? (
            <Button onClick={handleStart} size="lg" className="gradient-bg text-lg px-8 py-4">
              <Play className="h-6 w-6 mr-3" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" size="lg" className="text-lg px-8 py-4">
              <Pause className="h-6 w-6 mr-3" />
              Pause
            </Button>
          )}
          
          <Button onClick={handleStop} variant="outline" size="lg" className="text-lg px-8 py-4">
            <Square className="h-6 w-6 mr-3" />
            Stop
          </Button>

          {/* Music Control */}
          <Button 
            onClick={toggleMusic} 
            variant="outline" 
            size="lg" 
            className={`text-lg px-8 py-4 ${isMusicPlaying ? "bg-green-500/10 border-green-500" : ""}`}
          >
            {isMusicPlaying ? (
              <>
                <VolumeX className="h-6 w-6 mr-3" />
                Stop Music
              </>
            ) : (
              <>
                <Volume2 className="h-6 w-6 mr-3" />
                Play Music
              </>
            )}
          </Button>
        </div>

        {/* Session Progress */}
        <div className="flex justify-center space-x-2">
          {Array.from({ length: settings.longBreakInterval }).map((_, index) => (
            <div
              key={index}
              className={`w-6 h-6 rounded-full border-2 ${
                index < completedPomodoros % settings.longBreakInterval
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground"
              }`}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-8 pt-4 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-500">{completedPomodoros}</div>
            <div className="text-lg text-muted-foreground">Pomodoros</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-500">{totalSessions}</div>
            <div className="text-lg text-muted-foreground">Sessions</div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="text-sm text-muted-foreground mt-8">
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd> to start/pause • 
          Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd> to exit fullscreen
        </div>
      </div>
    </div>
  );

  // Return fullscreen component if active
  if (isFullScreen) {
    return <FullScreenTimer />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-foreground" />
            Pomodoro Timer
          </div>
          <Button 
            onClick={toggleFullScreen} 
            variant="outline" 
            size="sm"
            className="ml-auto"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className={getModeColor()}>
              {getModeIcon()}
            </div>
            <Badge variant="outline" className={getModeColor()}>
              {getModeLabel()}
            </Badge>
          </div>
          
          <div className="text-6xl font-mono font-bold text-foreground">
            {formatTime(timeLeft)}
          </div>
          
          <Progress value={getProgress()} className="w-full h-2" />
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="gradient-bg">
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          
          <Button onClick={handleStop} variant="outline">
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
          
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Focus Music Controls */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4 text-foreground" />
              <span className="text-sm font-medium">Focus Music</span>
            </div>
            <Button 
              onClick={toggleMusic} 
              variant="outline" 
              size="sm"
              className={isMusicPlaying ? "bg-green-500/10 border-green-500" : ""}
            >
              {isMusicPlaying ? (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>

          {/* Sound Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Sound Type</label>
            <div className="grid grid-cols-2 gap-2">
              {focusSounds.map((sound) => (
                <Button
                  key={sound.id}
                  variant={selectedSound === sound.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isMusicPlaying) {
                      stopMusic();
                    }
                    setSelectedSound(sound.id);
                  }}
                  className={`text-xs ${sound.id === "whitenoise" ? "col-span-2" : ""}`}
                >
                  {sound.name}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {focusSounds.find(s => s.id === selectedSound)?.description}
            </p>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Volume</label>
            <ElasticSlider
              defaultValue={volume * 100}
              startingValue={0}
              maxValue={100}
              leftIcon={<VolumeX className="h-3 w-3 text-muted-foreground" />}
              rightIcon={<Volume2 className="h-3 w-3 text-muted-foreground" />}
              onChange={(value) => changeVolume(value / 100)}
              className="w-full"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{completedPomodoros}</div>
            <div className="text-sm text-muted-foreground">Completed Pomodoros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{totalSessions}</div>
            <div className="text-sm text-muted-foreground">Total Sessions</div>
          </div>
        </div>

        {/* Session Pattern */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Session Pattern</div>
          <div className="flex space-x-1">
            {Array.from({ length: settings.longBreakInterval }).map((_, index) => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 ${
                  index < completedPomodoros % settings.longBreakInterval
                    ? "bg-green-500 border-green-500"
                    : "border-muted-foreground"
                }`}
              />
            ))}
            <div className="text-xs text-muted-foreground ml-2">
              {settings.longBreakInterval - (completedPomodoros % settings.longBreakInterval)} until long break
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Pomodoro Tips:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Focus completely on one task during work sessions</li>
            <li>• Take short breaks to rest your mind</li>
            <li>• Use long breaks for deeper rest and reflection</li>
            <li>• Track your progress to build momentum</li>
            <li>• Use focus music to enhance concentration</li>
            <li>• Choose ambient sounds that don't distract you</li>
            <li>• Use fullscreen mode for distraction-free focus</li>
            <li>• Keyboard shortcuts: Space (start/pause), Esc (exit fullscreen)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
