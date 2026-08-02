'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import type { DiscordConfig, ModelId } from '@/lib/types';
import { AVAILABLE_MODELS } from '@/lib/types';
import { Menu } from 'lucide-react';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [model, setModel] = useState<ModelId>(AVAILABLE_MODELS[0].id);
  const [discordConfig, setDiscordConfig] = useState<DiscordConfig>({
    botToken: '',
    channelId: '',
    applicantName: '',
    applicantEmail: ''
  });
  const [discordEnabled, setDiscordEnabled] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        model={model}
        onModelChange={setModel}
        discordConfig={discordConfig}
        onDiscordConfigChange={setDiscordConfig}
        discordEnabled={discordEnabled}
        onDiscordEnabledChange={setDiscordEnabled}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-slate-100"
            aria-label="Open settings"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold">AI Company Research Assistant</span>
        </header>

        <ChatInterface
          model={model}
          discordEnabled={discordEnabled}
          discordConfig={discordConfig}
        />
      </div>
    </div>
  );
}
