'use client';

import { EnrichedGuest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

// Helper function to ensure URLs have proper protocol
const ensureHttps = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

interface GuestTableProps {
  guests: EnrichedGuest[];
  currentProfileIndex: number;
  onSelectProfile: (index: number) => void;
}

export default function GuestTable({ guests, currentProfileIndex, onSelectProfile }: GuestTableProps) {
  // Sort guests: approved first, then pending, then denied (grayed out)
  const sortedGuests = [...guests].sort((a, b) => {
    const order = { approved: 0, null: 1, denied: 2 };
    const aOrder = order[a.userDecision as keyof typeof order] ?? 1;
    const bOrder = order[b.userDecision as keyof typeof order] ?? 1;
    return aOrder - bOrder;
  });

  const getStatusIcon = (decision: 'approved' | 'denied' | null) => {
    switch (decision) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (decision: 'approved' | 'denied' | null) => {
    switch (decision) {
      case 'approved':
        return <Badge className="rounded-xs bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'denied':
        return <Badge className="rounded-xs bg-red-100 text-red-800 hover:bg-red-100">Denied</Badge>;
      default:
        return <Badge variant="outline" className="rounded-xs">Pending</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col max-h-full">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Guest List</h2>
        <div className="flex gap-4 text-sm text-gray-600">
          <span>
            <span className="font-medium text-green-600">
              {guests.filter(g => g.userDecision === 'approved').length}
            </span> approved
          </span>
          <span>
            <span className="font-medium text-gray-500">
              {guests.filter(g => g.userDecision === null).length}
            </span> pending
          </span>
          <span>
            <span className="font-medium text-red-600">
              {guests.filter(g => g.userDecision === 'denied').length}
            </span> denied
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {sortedGuests.map((guest, index) => {
              const originalIndex = guests.findIndex(g => g.api_id === guest.api_id);
              const isCurrentProfile = originalIndex === currentProfileIndex;
              const isDenied = guest.userDecision === 'denied';
              
              return (
                <TableRow 
                  key={guest.api_id}
                  className={`
                    ${isCurrentProfile ? 'bg-blue-50 border-blue-200' : ''}
                    ${isDenied ? 'opacity-50 bg-gray-50' : ''}
                    cursor-pointer hover:bg-gray-50 transition-colors
                  `}
                  onClick={() => onSelectProfile(originalIndex)}
                >
                  <TableCell>
                    {getStatusIcon(guest.userDecision ?? null)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{guest.name}</p>
                      <p className="text-xs text-gray-500">{guest.email}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      {guest.enriched?.company ? (
                        <>
                          <p className="text-sm font-medium">{guest.enriched.company}</p>
                          {guest.enriched.company_website && (
                            <a 
                              href={ensureHttps(guest.enriched.company_website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Website
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {guest.enriched === undefined ? 'Loading...' : 'Unknown'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {guest.enriched?.job_title ? (
                      <p className="text-sm">{guest.enriched.job_title}</p>
                    ) : (
                      <span className="text-sm text-gray-400">
                        {guest.enriched === undefined ? 'Loading...' : 'Unknown'}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(guest.userDecision ?? null)}
                      {guest.enriched?.linkedin_url && (
                        <a 
                          href={ensureHttps(guest.enriched.linkedin_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs rounded-xs"
                          >
                            LinkedIn
                          </Button>
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      </div>
    </div>
  );
}

