'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, AlertCircle } from 'lucide-react';

function GoogleMockConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectUri = searchParams.get('redirect_uri') || '';
  const state = searchParams.get('state') || '';
  const [loading, setLoading] = useState(false);

  const handleAllow = () => {
    setLoading(true);
    setTimeout(() => {
      // Redirect to redirectUri with mock code and state
      const target = `${redirectUri}?code=mock_google_oauth_code_12345&state=${encodeURIComponent(state)}`;
      router.push(target);
    }, 1000);
  };

  const handleCancel = () => {
    router.push('/settings');
  };

  return (
    <div className="w-full max-w-md bg-white border border-neutral-300 rounded-lg p-6 shadow-md flex flex-col space-y-6">
      
      {/* Header Google Logo Mock */}
      <div className="flex flex-col items-center justify-center border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-1.5 font-bold text-lg mb-1">
          <span className="text-blue-500">G</span>
          <span className="text-red-500">o</span>
          <span className="text-yellow-500">o</span>
          <span className="text-blue-500">g</span>
          <span className="text-green-500">l</span>
          <span className="text-red-500">e</span>
        </div>
        <h2 className="text-base font-semibold text-neutral-900">Sign in with Google</h2>
        <p className="text-[11px] text-neutral-500 mt-1">to continue to <span className="font-semibold text-neutral-700">Saraban CRM</span></p>
      </div>

      {/* Developer Sandbox Notice Banner */}
      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex gap-2.5 items-start">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={14} />
        <div>
          <span className="font-bold block">Developer Credentials Fallback</span>
          <span className="text-[10px] text-neutral-600">
            `GOOGLE_CLIENT_ID` is not defined in environment variables. We are running in OAuth simulation sandbox mode. Clicking Allow will connect a mock google calendar.
          </span>
        </div>
      </div>

      {/* Permissions details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-neutral-900 text-sm">Saraban CRM wants access to your Google Account</h3>
        
        <div className="flex gap-3 items-start bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
          <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <span className="font-bold text-neutral-900 block">See, edit, share, and permanently delete calendar events</span>
            <span className="text-[10px] text-neutral-500">
              This will let Saraban CRM write follow-up activities into your Google Calendar and keep them updated.
            </span>
          </div>
        </div>
      </div>

      {/* Action button row */}
      <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
        <button
          onClick={handleCancel}
          className="text-neutral-600 hover:text-neutral-900 font-semibold px-4 py-2 hover:bg-neutral-100 rounded transition-colors"
        >
          Cancel
        </button>
        
        <button
          disabled={loading}
          onClick={handleAllow}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Allow'
          )}
        </button>
      </div>

      {/* Footer info */}
      <p className="text-[10px] text-neutral-400 text-center">
        By clicking Allow, you grant permission to access scopes listed above. You can revoke access at any time in Google settings.
      </p>
    </div>
  );
}

export default function GoogleMockConsentPage() {
  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 text-xs text-neutral-800 font-sans">
      <Suspense fallback={
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      }>
        <GoogleMockConsentContent />
      </Suspense>
    </div>
  );
}
