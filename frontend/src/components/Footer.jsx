import { ServerIcon, ShieldCheckIcon, BookOpenIcon, ScaleIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function Footer() {
  // Determine environment mode for display (Vite uses import.meta.env)
  const envMode = typeof import.meta !== 'undefined' ? (import.meta.env.MODE || 'development') : 'development';

  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Constitutional Foundation */}
          <div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <ScaleIcon className="h-4 w-4" />
              Constitutional Foundation
            </h3>
            <ul className="text-xs space-y-1">
              <li>• Constitution of Kenya 2010 (Art 47)</li>
              <li>• County Government Act 2012</li>
              <li>• National Vision 2030</li>
              <li>• National ICT Master Plan</li>
              <li>• Data Protection Act 2019</li>
            </ul>
          </div>

          {/* Policy Alignment */}
          <div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4" />
              Policy Alignment
            </h3>
            <ul className="text-xs space-y-1">
              <li>• AU Agenda 2063 (Digital Marketplace)</li>
              <li>• Bottom-Up Economic Transformation (BETA)</li>
              <li>• Konza Technopolis Phase 1</li>
              <li>• Jitume Digital Hubs Initiative</li>
              <li>• Digital Economy Blueprint</li>
            </ul>
          </div>

          {/* Service Standards */}
          <div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Government SLAs
            </h3>
            <ul className="text-xs space-y-1">
              <li>• User Support: 30 minutes</li>
              <li>• Email Account: 30 minutes</li>
              <li>• Network Diagnosis: Site-dependent</li>
              <li>• Hardware Repair: 10 working days</li>
              <li>• Major Escalation: 6 weeks</li>
            </ul>
          </div>

          {/* External Dependencies */}
          <div>
            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
              <ServerIcon className="h-4 w-4" />
              National Infrastructure
            </h3>
            <ul className="text-xs space-y-1">
              <li>• 100,000 km fiber backbone</li>
              <li>• 1,491 public Wi-Fi hotspots</li>
              <li>• 1,450 digital hubs planned</li>
              <li>• Konza National Data Centre</li>
              <li>• Universal Service Fund (USF)</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-6 pt-4 text-center text-xs">
          <p>
            © {new Date().getFullYear()} National Treasury ICT Support & Governance System.
            Powered by {envMode} mode.
          </p>
          <p className="mt-1">
            This system supports the <strong>Bottom-Up Economic Transformation Agenda (BETA)</strong> and aligns with{' '}
            <strong>AU Agenda 2063</strong> digital marketplace vision.
          </p>
        </div>
      </div>
    </footer>
  );
}
