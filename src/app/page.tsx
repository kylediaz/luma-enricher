'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseCSV, getCSVColumns } from '@/lib/csv-parser';
import { EnrichedGuest, CsvConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText } from 'lucide-react';
import ProfileCard from '@/components/ProfileCard';
import GuestTable from '@/components/GuestTable';

export default function Home() {
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [guests, setGuests] = useState<EnrichedGuest[]>([]);
  const [config, setConfig] = useState<CsvConfig>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [keywordFilters, setKeywordFilters] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
        
        // Extract column names for LinkedIn column selection
        const columns = getCSVColumns(content);
        setCsvColumns(columns);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  // Helper function to map approval_status to userDecision
  const mapApprovalStatusToDecision = (approvalStatus: string): 'approved' | 'denied' | null => {
    const status = approvalStatus.toLowerCase().trim();
    switch (status) {
      case 'approved':
      case 'invited':
        return 'approved';
      case 'declined':
        return 'denied';
      case 'pending_approval':
      default:
        return null; // These need manual review
    }
  };

  // Check if guest should be auto-rejected based on keyword filters
  const shouldAutoReject = (guest: EnrichedGuest): boolean => {
    if (keywordFilters.length === 0) return false;
    
    const searchFields = [
      guest.name,
      guest.email,
      guest.enriched?.company,
      guest.enriched?.job_title,
      guest.enriched?.bio,
      guest.enriched?.location
    ].filter(Boolean).map(field => field!.toLowerCase());
    
    return keywordFilters.some(keyword => 
      searchFields.some(field => field.includes(keyword.toLowerCase().trim()))
    );
  };

  // Apply keyword filters to guests
  const applyKeywordFilters = (guestList: EnrichedGuest[]): EnrichedGuest[] => {
    return guestList.map(guest => {
      if (shouldAutoReject(guest) && guest.userDecision === null) {
        return { ...guest, userDecision: 'denied' };
      }
      return guest;
    });
  };

  // Keyword filter management
  const addKeywordFilter = () => {
    if (newKeyword.trim() && !keywordFilters.includes(newKeyword.trim())) {
      const updatedFilters = [...keywordFilters, newKeyword.trim()];
      setKeywordFilters(updatedFilters);
      setNewKeyword('');
      
      // Apply filter to existing guests
      if (guests.length > 0) {
        setGuests(prev => applyKeywordFilters(prev));
      }
    }
  };

  const removeKeywordFilter = (keyword: string) => {
    setKeywordFilters(prev => prev.filter(k => k !== keyword));
  };

  const handleProcessCSV = async () => {
    if (!csvContent) return;
    
    setIsProcessing(true);
    try {
      const parsedGuests = await parseCSV(csvContent, config);
      const guestsWithDecisions = parsedGuests.map(guest => ({
        ...guest,
        userDecision: mapApprovalStatusToDecision(guest.approval_status)
      }));
      
      // Apply keyword filters before setting guests
      const filteredGuests = applyKeywordFilters(guestsWithDecisions);
      setGuests(filteredGuests);
      
      // Start enrichment process
      await startEnrichment(parsedGuests);
    } catch (error) {
      console.error('Error processing CSV:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startEnrichment = async (guestList: EnrichedGuest[]) => {
    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guests: guestList }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const enrichedData = JSON.parse(line);
            setGuests(prev => 
              prev.map(guest => 
                guest.api_id === enrichedData.api_id 
                  ? { ...guest, enriched: enrichedData }
                  : guest
              )
            );
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Error during enrichment:', error);
    }
  };

  const handleProfileDecision = (decision: 'approved' | 'denied') => {
    setGuests(prev => 
      prev.map((guest, index) => 
        index === currentProfileIndex 
          ? { ...guest, userDecision: decision }
          : guest
      )
    );
    
    // Find next pending profile
    const nextPendingIndex = guests.findIndex((guest, index) => 
      index > currentProfileIndex && guest.userDecision === null
    );
    
    if (nextPendingIndex !== -1) {
      setCurrentProfileIndex(nextPendingIndex);
    } else {
      // No more pending profiles, find first pending overall
      const firstPendingIndex = guests.findIndex(guest => guest.userDecision === null);
      if (firstPendingIndex !== -1) {
        setCurrentProfileIndex(firstPendingIndex);
      }
    }
  };

  // Get only pending guests for the profile view
  const pendingGuests = guests.filter(guest => guest.userDecision === null);
  
  // Get current guest (ensure it's pending)
  const currentGuest = guests[currentProfileIndex];
  const isCurrentGuestPending = currentGuest && currentGuest.userDecision === null;
  
  // If current guest doesn't exist, find first pending (only when we have no current guest)
  useEffect(() => {
    if (guests.length > 0 && !currentGuest) {
      const firstPendingIndex = guests.findIndex(guest => guest.userDecision === null);
      if (firstPendingIndex !== -1) {
        setCurrentProfileIndex(firstPendingIndex);
      }
    }
  }, [guests, currentGuest]);

  if (!csvContent) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Luma Guest Enricher</h1>
            <p className="text-gray-600">Upload a CSV of Luma guests to get enriched profiles</p>
          </div>

          <Card className="rounded-xs border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
            <CardContent className="p-8">
              <div 
                {...getRootProps()} 
                className="cursor-pointer text-center"
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop the CSV here' : 'Drag & drop a CSV file here'}
                  </p>
                  <p className="text-sm text-gray-500">or click to select a file</p>
                  <p className="text-xs text-gray-400">CSV files only</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (csvColumns.length > 0 && guests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="rounded-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Configure CSV Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedin-column">LinkedIn Column (optional)</Label>
                <Select 
                  value={config.linkedinColumnName || 'none'} 
                  onValueChange={(value) => setConfig({ ...config, linkedinColumnName: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger className="rounded-xs">
                    <SelectValue placeholder="Select LinkedIn column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {csvColumns.map(column => (
                      <SelectItem key={column} value={column}>{column}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleProcessCSV} 
                disabled={isProcessing}
                className="w-full rounded-xs"
              >
                {isProcessing ? 'Processing...' : 'Process CSV'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Left Half - Tinder Style Profile Card */}
        <div className="w-1/2 p-8 flex items-center justify-center">
          {currentGuest ? (
            <ProfileCard 
              guest={currentGuest}
              onDecision={isCurrentGuestPending ? handleProfileDecision : undefined}
              isReadOnly={!isCurrentGuestPending}
            />
          ) : (
            <div className="text-center text-gray-500">
              <div className="space-y-2">
                <p className="text-xl font-semibold">All profiles reviewed! 🎉</p>
                <p className="text-sm">
                  {pendingGuests.length === 0 
                    ? `Reviewed ${guests.length} total profiles`
                    : `${pendingGuests.length} profiles still pending`
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Half - Keyword Filters & Guest Table */}
        <div className="w-1/2 border-l border-gray-200 flex flex-col">
          {/* Keyword Filters Section */}
          <div className="border-b border-gray-200 p-4 bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Auto-Reject Keywords</h3>
            
            {/* Add keyword input */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Enter keyword to auto-reject guests..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeywordFilter()}
                className="flex-1"
              />
              <Button 
                onClick={addKeywordFilter}
                disabled={!newKeyword.trim()}
                size="sm"
              >
                Add Filter
              </Button>
            </div>
            
            {/* Current filters */}
            {keywordFilters.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Active filters:</p>
                <div className="flex flex-wrap gap-2">
                  {keywordFilters.map((keyword) => (
                    <div
                      key={keyword}
                      className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{keyword}</span>
                      <button
                        onClick={() => removeKeywordFilter(keyword)}
                        className="ml-1 text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Guest Table */}
          <div className="flex-1 min-h-0 p-8">
            <GuestTable 
              guests={guests}
              currentProfileIndex={currentProfileIndex}
              onSelectProfile={setCurrentProfileIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

