'use client';

import { Check, ChevronRight, Copy, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatusBadge } from '@/components/orders/status-badge';
import type { OrderSummary } from '@/lib/data/orders/types';
import { awbLabel, orderHref, trackHref } from '@/lib/format/awb';
import { formatDate } from '@/lib/format/date';

interface OrdersCardsProps {
  orders: OrderSummary[];
}

/** Width of the actions revealed by swiping a card left. */
const REVEAL = 152;
/** A drag shorter than this is a tap, not a swipe. */
const TAP_SLOP = 8;

const ACTION =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-control px-3 text-xs font-semibold transition-colors duration-150';

function useCopy(text: string) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 1600);
    return () => clearTimeout(timer);
  }, [state]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };
  return { state, copy };
}

function OrderCard({ order, index }: { order: OrderSummary; index: number }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; base: number } | null>(null);
  const moved = useRef(false);
  const { state, copy } = useCopy(order.awb);
  const awb = awbLabel(order.awb);
  const open = offset !== 0;

  // Swipe left to reveal Track and Copy AWB (touch and pen only; a mouse uses the visible buttons).
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!order.awb || event.pointerType === 'mouse') return;
    start.current = { x: event.clientX, base: offset };
    moved.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    if (!moved.current && Math.abs(dx) < TAP_SLOP) return;
    moved.current = true;
    setDragging(true);
    setOffset(Math.min(0, Math.max(-REVEAL, start.current.base + dx)));
  };
  const onPointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    setOffset((current) => (current < -REVEAL / 2 ? -REVEAL : 0));
  };

  const copyLabel = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy AWB';
  const CopyIcon = state === 'copied' ? Check : Copy;

  return (
    <div
      data-testid="order-card"
      style={{ '--i': index } as CSSProperties}
      className="relative min-h-[44px] overflow-hidden rounded-card border border-secondary bg-surface"
    >
      {order.awb ? (
        // Revealed by the swipe; out of the tab order and hidden from screen readers until then.
        <div
          aria-hidden={!open}
          inert={!open}
          className="absolute inset-y-0 right-0 flex items-center gap-1.5 bg-muted px-2"
          style={{ width: REVEAL }}
        >
          <Link href={trackHref(order.awb)} className={`${ACTION} flex-1 bg-primary text-on-primary`}>
            <Navigation aria-hidden="true" className="size-4" />
            Track
          </Link>
          <button type="button" onClick={copy} className={`${ACTION} flex-1 bg-surface text-primary`}>
            <CopyIcon aria-hidden="true" className="size-4" />
            {state === 'copied' ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          // A swipe that ends over the link must not also open it.
          if (moved.current) {
            event.preventDefault();
            event.stopPropagation();
            moved.current = false;
          }
        }}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        className={`relative bg-surface [touch-action:pan-y] ${
          dragging ? '' : 'transition-transform duration-250 ease-[var(--ease-evoc)]'
        }`}
      >
        <Link
          href={orderHref(order)}
          className="flex min-h-[44px] flex-col gap-2.5 p-4 pb-3 transition-colors duration-150 active:bg-tertiary"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span
                className={`font-mono text-sm font-bold [overflow-wrap:anywhere] ${
                  order.awb ? 'text-primary' : 'text-on-surface/60'
                }`}
              >
                {awb}
              </span>
              <div className="text-xs text-on-surface/60 [overflow-wrap:anywhere]">
                Ref: {order.reference_id || 'N/A'}
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-on-surface/70">
            <CarrierBadge carrier={order.carrier} />
            <div className="flex items-center gap-1">
              <span>{formatDate(order.created_at)}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-on-surface/40" />
            </div>
          </div>
        </Link>

        {order.awb ? (
          <div className="flex items-center gap-2 border-t border-secondary/60 px-4 py-2">
            <Link
              href={trackHref(order.awb)}
              aria-label={`Track ${order.awb}`}
              className={`${ACTION} bg-muted text-primary hover:bg-muted/70`}
            >
              <Navigation aria-hidden="true" className="size-4" />
              Track
            </Link>
            <button
              type="button"
              onClick={copy}
              aria-label={`${copyLabel} ${order.awb}`}
              className={`${ACTION} border border-secondary text-on-surface hover:border-primary hover:text-primary`}
            >
              <CopyIcon aria-hidden="true" className="size-4" />
              {copyLabel}
            </button>
            <span className="ml-auto hidden text-[11px] text-on-surface/45 min-[380px]:inline">Swipe for actions</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OrdersCards({ orders }: OrdersCardsProps) {
  return (
    <div className="motion-stagger grid gap-3 lg:hidden">
      {orders.map((order, index) => (
        <OrderCard key={order.shipment_id} order={order} index={index} />
      ))}
    </div>
  );
}
