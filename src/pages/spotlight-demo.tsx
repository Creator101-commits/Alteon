import React from "react";
import { Spotlight } from "@/components/ui/spotlight";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function SpotlightDemo() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      {/* Main Spotlight Demo */}
      <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />
        <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
          <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
            Study Smarter <br /> with Alteon.
          </h1>
          <p className="mt-4 font-normal text-base text-neutral-300 max-w-lg text-center mx-auto">
            Spotlight effect draws attention to your content with beautiful animations. 
            Perfect for highlighting key features and creating engaging user experiences.
          </p>
          <div className="flex justify-center mt-8">
            <Button 
              onClick={() => setLocation("/auth")}
              className="bg-white text-black hover:bg-white/90"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Additional Demo Variations */}
      <div className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Spotlight Component Features</h2>
          
          {/* Demo 1: Different positioning */}
          <div className="mb-16 relative h-[30rem] bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg overflow-hidden">
            <Spotlight
              className="-top-20 -right-20"
              fill="purple"
            />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold mb-4">Top Right Position</h3>
                <p className="text-purple-200">Spotlight can be positioned anywhere</p>
              </div>
            </div>
          </div>

          {/* Demo 2: Different colors */}
          <div className="mb-16 relative h-[30rem] bg-gradient-to-br from-green-900 to-teal-900 rounded-lg overflow-hidden">
            <Spotlight
              className="-bottom-20 -left-20"
              fill="green"
            />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold mb-4">Custom Colors</h3>
                <p className="text-green-200">Use any color with the fill prop</p>
              </div>
            </div>
          </div>

          {/* Demo 3: Multiple spotlights */}
          <div className="relative h-[30rem] bg-gradient-to-br from-orange-900 to-red-900 rounded-lg overflow-hidden">
            <Spotlight
              className="-top-10 left-1/4"
              fill="orange"
            />
            <Spotlight
              className="-bottom-10 right-1/4"
              fill="red"
            />
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold mb-4">Multiple Spotlights</h3>
                <p className="text-orange-200">Combine multiple spotlights for complex effects</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="py-12 px-6 text-center">
        <Button 
          onClick={() => setLocation("/")}
          variant="outline"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
