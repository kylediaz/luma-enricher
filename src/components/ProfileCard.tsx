'use client';

import { useState, useRef, useEffect } from 'react';
import { EnrichedGuest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Building, MapPin, Briefcase, GraduationCap, ExternalLink } from 'lucide-react';

interface ProfileCardProps {
  guest: EnrichedGuest;
  onDecision?: (decision: 'approved' | 'denied') => void;
  isReadOnly?: boolean;
}

// Helper function to ensure URLs have proper protocol
const ensureHttps = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export default function ProfileCard({ guest, onDecision, isReadOnly = false }: ProfileCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  
  const handleDecision = (decision: 'approved' | 'denied') => {
    if (isReadOnly || !onDecision) return;
    setIsAnimating(true);
    setTimeout(() => {
      onDecision(decision);
      setIsAnimating(false);
      setDragX(0);
    }, 150);
  };

  // Touch/Mouse event handlers for swipe
  const handleStart = (clientX: number) => {
    if (isReadOnly) return;
    setIsDragging(true);
    startX.current = clientX;
    currentX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    currentX.current = clientX;
    const deltaX = currentX.current - startX.current;
    setDragX(deltaX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    const deltaX = currentX.current - startX.current;
    const threshold = 100; // Minimum swipe distance
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        handleDecision('approved'); // Swipe right = approve
      } else {
        handleDecision('denied'); // Swipe left = deny
      }
    } else {
      // Snap back to center
      setDragX(0);
    }
    
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Global mouse move and up events
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  const enriched = guest.enriched;

  // Calculate visual feedback based on drag
  const getCardTransform = () => {
    if (isAnimating) return 'scale-95 opacity-50';
    if (isDragging || dragX !== 0) {
      const rotation = dragX * 0.1; // Slight rotation effect
      return `translateX(${dragX}px) rotate(${rotation}deg)`;
    }
    return '';
  };

  const getBackgroundColor = () => {
    if (dragX > 50) return 'bg-green-50'; // Approve feedback
    if (dragX < -50) return 'bg-red-50'; // Deny feedback
    return 'bg-white';
  };

  return (
    <div className="flex items-center justify-center">
      {/* iPhone-shaped container with fixed aspect ratio */}
      <div className="relative w-[375px] h-[812px] bg-black rounded-[3rem] p-2 shadow-2xl">
        {/* iPhone screen */}
        <div className={`w-full h-full rounded-[2.5rem] overflow-hidden relative transition-colors duration-200 ${getBackgroundColor()}`}>
          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-full z-10"></div>
          
          {/* Status bar */}
          <div className="flex justify-between items-center px-6 pt-4 pb-2 text-sm font-medium text-black relative z-0">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
                <div className="w-1 h-1 bg-black rounded-full"></div>
              </div>
              <svg className="w-6 h-4 ml-2" viewBox="0 0 24 16" fill="none">
                <rect x="1" y="3" width="20" height="10" rx="3" stroke="currentColor" strokeWidth="1" fill="none"/>
                <rect x="22" y="6" width="2" height="4" rx="1" fill="currentColor"/>
              </svg>
            </div>
          </div>

          {/* Swipe indicators */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-20">
            <div className={`transition-opacity duration-200 ${dragX < -50 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
          
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-20">
            <div className={`transition-opacity duration-200 ${dragX > 50 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Content area with sticky buttons */}
          <div className="h-[calc(100%-4rem)] flex flex-col">
            {/* Scrollable content */}
            <div className="flex-1 px-4 overflow-y-auto scrollbar-ios">
              <Card 
                ref={cardRef}
                className={`border-none shadow-none transition-all duration-150 ${isReadOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} ${getCardTransform()}`}
                style={{ 
                  transform: getCardTransform(),
                  userSelect: 'none'
                }}
                onMouseDown={isReadOnly ? undefined : handleMouseDown}
                onTouchStart={isReadOnly ? undefined : handleTouchStart}
                onTouchMove={isReadOnly ? undefined : handleTouchMove}
                onTouchEnd={isReadOnly ? undefined : handleTouchEnd}
              >
          <CardHeader className="pb-6 pt-8">
            <div className="text-center space-y-4">
              {/* Name with better typography */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                  {guest.name}
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  {guest.email}
                </p>
              </div>
              
              {/* Job title and company with improved styling */}
              {enriched?.job_title && enriched?.company && (
                <div className="bg-gray-50 rounded-2xl px-4 py-3 mx-2">
                  <div className="flex items-center justify-center gap-2 text-gray-800">
                    <Briefcase className="h-4 w-4 text-gray-600" />
                    <div className="text-center">
                      <p className="text-base font-semibold leading-tight">
                        {enriched.job_title}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        at {enriched.company}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Location with subtle styling */}
              {enriched?.location && (
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">{enriched.location}</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {enriched?.bio && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-1">About</h4>
                <p className="text-sm text-gray-600">{enriched.bio}</p>
              </div>
            )}

            {enriched?.company && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  Company
                </h4>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{enriched.company}</p>
                  {enriched.company_summary && (
                    <p className="text-xs text-gray-600">{enriched.company_summary}</p>
                  )}
                  {enriched.company_website && (
                    <a 
                      href={ensureHttps(enriched.company_website)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {enriched.company_website}
                    </a>
                  )}
                </div>
              </div>
            )}

            {enriched?.education && (
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </h4>
                <p className="text-sm text-gray-600">{enriched.education}</p>
              </div>
            )}

            <Separator />

            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {enriched?.linkedin_url && (
                <a 
                  href={ensureHttps(enriched.linkedin_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Badge variant="outline" className="rounded-xs hover:bg-blue-50">
                    LinkedIn
                  </Badge>
                </a>
              )}
              {enriched?.twitter_url && (
                <a 
                  href={ensureHttps(enriched.twitter_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Badge variant="outline" className="rounded-xs hover:bg-blue-50">
                    Twitter
                  </Badge>
                </a>
              )}
            </div>

            {/* Event Info */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h4 className="font-semibold text-base text-gray-900 mb-3">Event Details</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Status:</span> {guest.approval_status}</p>
                {guest.ticket_name && (
                  <p><span className="font-medium">Ticket:</span> {guest.ticket_name}</p>
                )}
                {guest.created_at && (
                  <p><span className="font-medium">Registered:</span> {new Date(guest.created_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Loading state for enrichment */}
            {!enriched && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Enriching profile...</p>
              </div>
            )}
          </CardContent>
        </Card>
            </div>

            {/* Sticky Decision Buttons - only show if not read-only */}
            {!isReadOnly && (
              <div className="px-4 py-4 bg-white border-t border-gray-100">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleDecision('denied')}
                    className="flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-12 text-base font-medium"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Deny
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleDecision('approved')}
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 h-12 text-base font-medium"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
