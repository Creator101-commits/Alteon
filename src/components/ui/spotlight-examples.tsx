import React from "react";
import { Spotlight } from "@/components/ui/spotlight";
import { Button } from "@/components/ui/button";

// Example 1: Basic Spotlight Usage
export function BasicSpotlightExample() {
  return (
    <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
          Basic Spotlight
        </h1>
        <p className="mt-4 font-normal text-base text-neutral-300 max-w-lg text-center mx-auto">
          This is a basic spotlight example with default positioning and white fill.
        </p>
      </div>
    </div>
  );
}

// Example 2: Custom Positioning
export function CustomPositionSpotlight() {
  return (
    <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center bg-gradient-to-br from-purple-900 to-blue-900 relative overflow-hidden">
      <Spotlight
        className="-top-20 -right-20"
        fill="purple"
      />
      <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-bold text-center text-white">
          Custom Position
        </h1>
        <p className="mt-4 font-normal text-base text-purple-200 max-w-lg text-center mx-auto">
          Spotlight positioned in the top-right corner with custom purple fill.
        </p>
      </div>
    </div>
  );
}

// Example 3: Multiple Spotlights
export function MultipleSpotlightsExample() {
  return (
    <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center bg-gradient-to-br from-orange-900 to-red-900 relative overflow-hidden">
      <Spotlight
        className="-top-10 left-1/4"
        fill="orange"
      />
      <Spotlight
        className="-bottom-10 right-1/4"
        fill="red"
      />
      <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-bold text-center text-white">
          Multiple Spotlights
        </h1>
        <p className="mt-4 font-normal text-base text-orange-200 max-w-lg text-center mx-auto">
          Two spotlights with different colors and positions for complex effects.
        </p>
      </div>
    </div>
  );
}

// Example 4: Spotlight with Interactive Elements
export function InteractiveSpotlightExample() {
  return (
    <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
          Interactive Spotlight
        </h1>
        <p className="mt-4 font-normal text-base text-neutral-300 max-w-lg text-center mx-auto">
          Spotlight with interactive buttons and elements.
        </p>
        <div className="flex justify-center mt-8 space-x-4">
          <Button className="bg-white text-black hover:bg-white/90">
            Primary Action
          </Button>
          <Button variant="outline" className="border-white text-white hover:bg-white/10">
            Secondary Action
          </Button>
        </div>
      </div>
    </div>
  );
}
