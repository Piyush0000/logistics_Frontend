'use client';

import { CheckCircle2, ChevronRight, Package, Truck } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { PickupAddress } from '@/lib/data/pickup-addresses/types';
import { createShipmentAction, type CreateShipmentFormState } from '../actions';

const INITIAL_STATE: CreateShipmentFormState = {
  ok: false,
};

/** `idempotencyKey` is made once per page load, so retries of this form reuse it. */
export function CreateShipmentForm({
  idempotencyKey,
  savedAddresses = [],
}: {
  idempotencyKey: string;
  /** Saved pickup addresses, offered to fill the origin. Empty when none or not available. */
  savedAddresses?: PickupAddress[];
}) {
  const [state, formAction, pending] = useActionState(createShipmentAction, INITIAL_STATE);
  const [paymentType, setPaymentType] = useState<'COD' | 'PREPAID'>('PREPAID');
  const [savedId, setSavedId] = useState('');
  const saved = savedAddresses.find((entry) => entry.id === savedId);

  // A submitted form resets its fields, so the fields start from what was sent.
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;

  if (state.ok) {
    return (
      <div
        data-testid="create-success"
        className="mx-auto max-w-xl rounded-card border border-success/30 bg-surface p-card text-center shadow-sm"
      >
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-bold text-on-surface">
          Shipment Booked Successfully!
        </h2>
        <p className="mt-1 text-sm text-on-surface/70">
          {state.createdAwb
            ? "Your shipment manifest has been generated (Sample Simulation)."
            : "The booking request was accepted."}
        </p>

        <div className="my-6 rounded-control border border-secondary bg-tertiary p-4">
          <span className="text-xs text-on-surface/60">Air Waybill Number (AWB)</span>
          {state.createdAwb ? (
            <div className="mt-1 break-all font-mono text-2xl font-bold text-primary">
              {state.createdAwb}
            </div>
          ) : (
            <p data-testid="awb-pending" className="mt-1 text-sm font-medium text-on-surface">
              AWB will appear once the courier confirms.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={state.createdAwb ? `/orders/${state.createdAwb}` : "/orders"}
            prefetch={false}
            className="inline-flex h-control min-h-[44px] items-center gap-1.5 rounded-control bg-primary px-5 text-sm font-medium text-tertiary hover:bg-primary/90"
          >
            <span>{state.createdAwb ? "View Shipment Details" : "View All Shipments"}</span>
            <ChevronRight className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-control min-h-[44px] items-center rounded-control border border-secondary bg-surface px-4 text-sm font-medium text-on-surface hover:border-primary"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  const getError = (path: string) => state.fieldErrors?.[path];

  return (
    <form action={formAction} data-testid="create-shipment-form" className="grid gap-6">
      <input type="hidden" name="idempotency_key" value={idempotencyKey} readOnly data-testid="idempotency-key" />
      {state.message && !state.ok ? (
        <div className="rounded-control border border-error/40 bg-error/10 p-3 text-sm text-error">
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Origin / Pickup Address */}
        <div className="rounded-card border border-secondary bg-surface p-card">
          <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
            <Truck className="size-5 text-primary" />
            <h2>Pickup Details (Origin)</h2>
          </div>

          <div className="mt-4 grid gap-3 text-sm">
            {savedAddresses.length > 0 ? (
              <div>
                <label htmlFor="saved_address" className="block text-xs font-medium text-on-surface/70">
                  Use saved address
                </label>
                <select
                  id="saved_address"
                  value={savedId}
                  onChange={(event) => setSavedId(event.target.value)}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-base focus:border-primary focus:outline-none lg:text-sm"
                >
                  <option value="">Type the address below</option>
                  {savedAddresses.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}, {entry.address.city}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div key={savedId} className="grid gap-3">
            <div>
              <label htmlFor="origin_name" className="block text-xs font-medium text-on-surface/70">
                Sender / Warehouse Name *
              </label>
              <input
                id="origin_name"
                name="origin_name"
                required
                defaultValue={saved ? saved.address.name : v("origin_name", "Bengaluru Central Hub")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              />
              {getError('origin.name') ? (
                <p className="mt-1 text-xs text-error">{getError('origin.name')}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="origin_phone" className="block text-xs font-medium text-on-surface/70">
                  Phone (10-15 digits) *
                </label>
                <input
                  id="origin_phone"
                  name="origin_phone"
                  type="tel"
                  required
                  defaultValue={saved ? saved.address.phone : v("origin_phone", "9876543210")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
                {getError('origin.phone') ? (
                  <p className="mt-1 text-xs text-error">{getError('origin.phone')}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="origin_pincode" className="block text-xs font-medium text-on-surface/70">
                  Pincode (6 digits) *
                </label>
                <input
                  id="origin_pincode"
                  name="origin_pincode"
                  required
                  maxLength={6}
                  defaultValue={saved ? saved.address.pincode : v("origin_pincode", "560100")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
                {getError('origin.pincode') ? (
                  <p className="mt-1 text-xs text-error">{getError('origin.pincode')}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor="origin_line1" className="block text-xs font-medium text-on-surface/70">
                Address Line 1 *
              </label>
              <input
                id="origin_line1"
                name="origin_line1"
                required
                defaultValue={saved ? saved.address.line1 : v("origin_line1", "Plot 42, Electronic City Phase 1")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              />
              {getError('origin.line1') ? (
                <p className="mt-1 text-xs text-error">{getError('origin.line1')}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="origin_city" className="block text-xs font-medium text-on-surface/70">
                  City *
                </label>
                <input
                  id="origin_city"
                  name="origin_city"
                  required
                  defaultValue={saved ? saved.address.city : v("origin_city", "Bengaluru")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="origin_state" className="block text-xs font-medium text-on-surface/70">
                  State *
                </label>
                <input
                  id="origin_state"
                  name="origin_state"
                  required
                  defaultValue={saved ? saved.address.state : v("origin_state", "Karnataka")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Destination / Delivery Address */}
        <div className="rounded-card border border-secondary bg-surface p-card">
          <div className="flex items-center gap-2 border-b border-secondary pb-3 font-heading text-base font-semibold">
            <Package className="size-5 text-accent" />
            <h2>Delivery Details (Destination)</h2>
          </div>

          <div className="mt-4 grid gap-3 text-sm">
            <div>
              <label htmlFor="destination_name" className="block text-xs font-medium text-on-surface/70">
                Customer Name *
              </label>
              <input
                id="destination_name"
                name="destination_name"
                required
                placeholder="e.g. Rahul Sharma"
                defaultValue={v("destination_name", "Amit Patel")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              />
              {getError('destination.name') ? (
                <p className="mt-1 text-xs text-error">{getError('destination.name')}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="destination_phone" className="block text-xs font-medium text-on-surface/70">
                  Phone (10-15 digits) *
                </label>
                <input
                  id="destination_phone"
                  name="destination_phone"
                  type="tel"
                  required
                  placeholder="9876543210"
                  defaultValue={v("destination_phone", "9823456789")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
                {getError('destination.phone') ? (
                  <p className="mt-1 text-xs text-error">{getError('destination.phone')}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="destination_pincode" className="block text-xs font-medium text-on-surface/70">
                  Pincode (6 digits) *
                </label>
                <input
                  id="destination_pincode"
                  name="destination_pincode"
                  required
                  maxLength={6}
                  placeholder="400001"
                  defaultValue={v("destination_pincode", "400050")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
                {getError('destination.pincode') ? (
                  <p className="mt-1 text-xs text-error">{getError('destination.pincode')}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor="destination_line1" className="block text-xs font-medium text-on-surface/70">
                Address Line 1 *
              </label>
              <input
                id="destination_line1"
                name="destination_line1"
                required
                placeholder="House / Flat, Street name"
                defaultValue={v("destination_line1", "102 Bandra West Hill Road")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              />
              {getError('destination.line1') ? (
                <p className="mt-1 text-xs text-error">{getError('destination.line1')}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="destination_city" className="block text-xs font-medium text-on-surface/70">
                  City *
                </label>
                <input
                  id="destination_city"
                  name="destination_city"
                  required
                  defaultValue={v("destination_city", "Mumbai")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="destination_state" className="block text-xs font-medium text-on-surface/70">
                  State *
                </label>
                <input
                  id="destination_state"
                  name="destination_state"
                  required
                  defaultValue={v("destination_state", "Maharashtra")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Package & Payment Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Package Specifications */}
        <div className="rounded-card border border-secondary bg-surface p-card">
          <h2 className="border-b border-secondary pb-3 font-heading text-base font-semibold">
            Package Dimensions & Weight
          </h2>

          <div className="mt-4 grid gap-3 text-sm">
            <div>
              <label htmlFor="weight_kg" className="block text-xs font-medium text-on-surface/70">
                Total Weight (kg) *
              </label>
              <input
                id="weight_kg"
                name="weight_kg"
                type="number"
                step="0.01"
                min="0.05"
                required
                defaultValue={v("weight_kg", "0.5")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              />
              {getError('weight_kg') ? (
                <p className="mt-1 text-xs text-error">{getError('weight_kg')}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="length_cm" className="block text-xs font-medium text-on-surface/70">
                  Length (cm) *
                </label>
                <input
                  id="length_cm"
                  name="length_cm"
                  type="number"
                  step="0.1"
                  required
                  defaultValue={v("length_cm", "15")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="width_cm" className="block text-xs font-medium text-on-surface/70">
                  Width (cm) *
                </label>
                <input
                  id="width_cm"
                  name="width_cm"
                  type="number"
                  step="0.1"
                  required
                  defaultValue={v("width_cm", "10")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="height_cm" className="block text-xs font-medium text-on-surface/70">
                  Height (cm) *
                </label>
                <input
                  id="height_cm"
                  name="height_cm"
                  type="number"
                  step="0.1"
                  required
                  defaultValue={v("height_cm", "5")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Item details */}
            <div className="mt-2 border-t border-secondary pt-3">
              <span className="block text-xs font-semibold text-on-surface">Primary Item Details</span>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <input
                    name="item_name"
                    required
                    placeholder="Product Name *"
                    defaultValue={v("item_name", "Wireless Headphones")}
                    className="h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <input
                    name="item_quantity"
                    type="number"
                    min="1"
                    required
                    defaultValue={v("item_quantity", "1")}
                    placeholder="Qty"
                    className="h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2">
                <input
                  name="item_unit_price"
                  type="number"
                  min="0"
                  required
                  defaultValue={v("item_unit_price", "1999")}
                  placeholder="Unit Price (INR) *"
                  className="h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Carrier Preference */}
        <div className="rounded-card border border-secondary bg-surface p-card">
          <h2 className="border-b border-secondary pb-3 font-heading text-base font-semibold">
            Payment & Carrier Selection
          </h2>

          <div className="mt-4 grid gap-4 text-sm">
            <div>
              <span className="block text-xs font-medium text-on-surface/70">Payment Type *</span>
              <div className="mt-2 flex gap-4">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="payment_type"
                    value="PREPAID"
                    checked={paymentType === 'PREPAID'}
                    onChange={() => setPaymentType('PREPAID')}
                    className="size-4 text-primary"
                  />
                  <span className="font-medium">Prepaid</span>
                </label>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="payment_type"
                    value="COD"
                    checked={paymentType === 'COD'}
                    onChange={() => setPaymentType('COD')}
                    className="size-4 text-primary"
                  />
                  <span className="font-medium">Cash on Delivery (COD)</span>
                </label>
              </div>
            </div>

            {paymentType === 'COD' ? (
              <div>
                <label htmlFor="cod_amount" className="block text-xs font-medium text-on-surface/70">
                  COD Collectable Amount (INR) *
                </label>
                <input
                  id="cod_amount"
                  name="cod_amount"
                  type="number"
                  min="1"
                  required
                  defaultValue={v("cod_amount", "1999")}
                  className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                />
                {getError('cod_amount') ? (
                  <p className="mt-1 text-xs text-error">{getError('cod_amount')}</p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label htmlFor="preferred_carrier" className="block text-xs font-medium text-on-surface/70">
                Preferred Carrier (Optional)
              </label>
              <select
                id="preferred_carrier"
                name="preferred_carrier"
                defaultValue={v("preferred_carrier", "delhivery")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="delhivery">Delhivery</option>
                <option value="ekart">Ekart</option>
                <option value="shadowfax">Shadowfax</option>
                <option value="bluedart">Blue Dart</option>
                <option value="dhl">DHL</option>
              </select>
            </div>

            <div>
              <label htmlFor="reference_id" className="block text-xs font-medium text-on-surface/70">
                Merchant Reference ID (Optional)
              </label>
              <input
                id="reference_id"
                name="reference_id"
                placeholder="e.g. ORDER-99482"
                defaultValue={v("reference_id", "ORD-SAMPLE-101")}
                className="mt-1 h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Submit Row */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-secondary pt-4">
        <Link
          href="/orders"
          className="inline-flex h-control min-h-[44px] items-center rounded-control border border-secondary bg-surface px-5 text-sm font-medium text-on-surface hover:bg-tertiary"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          data-testid="submit-shipment"
          className="inline-flex h-control min-h-[44px] items-center rounded-control bg-primary px-6 text-sm font-medium text-tertiary shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Booking Shipment...' : 'Book Shipment'}
        </button>
      </div>
    </form>
  );
}

