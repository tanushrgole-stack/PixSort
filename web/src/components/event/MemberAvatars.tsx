'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { EventMember } from '@/types/event-ui';

const GRADIENTS = [
  'from-[#FF6B4A] to-[#FFB703]',
  'from-[#B76E79] to-[#FFD9CC]',
  'from-[#6C63FF] to-[#FF3CAC]',
  'from-[#7FB77E] to-[#FFB703]',
  'from-[#FF3CAC] to-[#FFB703]',
  'from-[#2B4C6F] to-[#6C63FF]',
];

function avatarGradient(name: string) {
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_LABEL: Record<string, string> = { host: '👑 Host', uploader: '📷 Uploader', guest: 'Guest' };

interface MemberAvatarsProps {
  members: EventMember[];
  max?: number;
  total?: number;
}

export function MemberAvatars({ members, max = 6, total }: MemberAvatarsProps) {
  const visible = members.slice(0, max);
  const overflow = (total ?? members.length) - visible.length;

  return (
    <div className="flex items-center">
      {visible.map((member, i) => (
        <motion.div
          key={member.userId}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 25 }}
          className="relative group"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: visible.length - i }}
        >
          <div className={clsx(
            'w-9 h-9 rounded-full border-2 border-[var(--surface)] flex items-center justify-center text-xs font-bold text-white select-none cursor-default',
            !member.avatarUrl && `bg-gradient-to-br ${avatarGradient(member.name)}`
          )}>
            {member.avatarUrl
              ? <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
              : initials(member.name)
            }
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
            <div className="bg-[var(--surface)] shadow-card border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-center">
              <p className="text-xs font-semibold text-[var(--text)]">{member.name}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{ROLE_LABEL[member.role] ?? 'Guest'}</p>
            </div>
          </div>
        </motion.div>
      ))}
      {overflow > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: visible.length * 0.06 + 0.05 }}
          className="w-9 h-9 rounded-full border-2 border-[var(--surface)] bg-[var(--muted)]/30 flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]"
          style={{ marginLeft: -10 }}
        >
          +{overflow}
        </motion.div>
      )}
    </div>
  );
}
