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

type Matrix = NotificationSettings['matrix'];

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative mx-auto flex h-11 w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span
        aria-hidden="true"
        className="flex h-5 w-9 shrink-0 items-center rounded-full bg-secondary p-0.5 peer-checked:justify-end peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      >
        <span className="size-4 rounded-full bg-surface" />
      </span>
    </label>
  );
}

/** One switch for each shipment event and channel: is a buyer message sent when the parcel reaches that state? */
export function ChannelMatrix({
  matrix,
  onToggle,
}: {
  matrix: Matrix;
  onToggle: (event: NotifyEvent, channel: NotifyChannel, on: boolean) => void;
}) {
  return (
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">Which channels send a message for each shipment event</caption>
      <thead>
        <tr className="border-b border-secondary text-left">
          <th scope="col" className="w-[40%] py-2 pr-2 font-medium sm:w-1/2">
            Shipment event
          </th>
          {NOTIFY_CHANNELS.map((channel) => (
            <th key={channel} scope="col" className="px-1 py-2 text-center font-medium">
              <span className="[overflow-wrap:anywhere]">{CHANNEL_LABELS[channel]}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {NOTIFY_EVENTS.map((event) => (
          <tr key={event} className="border-b border-secondary last:border-0">
            <th scope="row" className="py-1 pr-2 text-left font-normal break-words">
              {statusLabel(event)}
            </th>
            {NOTIFY_CHANNELS.map((channel) => (
              <td key={channel} className="px-1 py-1">
                <Switch
                  label={`${statusLabel(event)} by ${CHANNEL_LABELS[channel]}`}
                  checked={matrix[event][channel]}
                  onChange={(on) => onToggle(event, channel, on)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
