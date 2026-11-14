'use client';

import { statusLabel } from '@/lib/format/status';
import {
  CHANNEL_LABELS,
  NOTIFY_CHANNELS,
  NOTIFY_EVENTS,
  type NotificationSettings,
  type NotifyChannel,
  type NotifyEvent,
} from '@/lib/data/notifications/types';
import { SwitchTrack } from '../switch';

type Matrix = NotificationSettings['matrix'];

function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative mx-auto flex h-11 w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <SwitchTrack />
    </label>
  );
}

/** One switch for each shipment event and channel: is a buyer message sent when the parcel reaches that state? */
export function ChannelMatrix({
  matrix,
  onToggle,
  disabled,
}: {
  matrix: Matrix;
  disabled: boolean;
  onToggle: (event: NotifyEvent, channel: NotifyChannel, on: boolean) => void;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-control border border-secondary">
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">Which channels send a message for each shipment event</caption>
      <thead>
        <tr className="border-b border-secondary bg-tertiary/60 text-left">
          <th scope="col" className="w-[29%] py-2.5 pr-2 pl-2 text-xs font-semibold tracking-wide text-on-surface/60 uppercase sm:w-1/2 sm:pl-3">
            Shipment event
          </th>
          {NOTIFY_CHANNELS.map((channel) => (
            <th key={channel} scope="col" className="px-0 py-2.5 text-center text-xs font-semibold tracking-wide text-on-surface/60 uppercase sm:px-1">
              <span className="[overflow-wrap:anywhere]">{CHANNEL_LABELS[channel]}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {NOTIFY_EVENTS.map((event) => (
          <tr key={event} className="border-b border-secondary/70 transition-colors duration-150 last:border-0 hover:bg-muted/60">
            <th scope="row" className="py-1 pr-2 pl-2 text-left text-xs font-medium break-words sm:pl-3 sm:text-sm">
              {statusLabel(event)}
            </th>
            {NOTIFY_CHANNELS.map((channel) => (
              <td key={channel} className="px-1 py-1">
                <Switch
                  label={`${statusLabel(event)} by ${CHANNEL_LABELS[channel]}`}
                  checked={matrix[event][channel]}
                  disabled={disabled}
                  onChange={(on) => onToggle(event, channel, on)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
