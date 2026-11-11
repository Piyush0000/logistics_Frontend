import type { Address } from '@logicore/contracts';
import type { DataResult } from '../source';

export interface PickupAddress {
  id: string;
  label: string;
  address: Address;
  isDefault: boolean;
}

export interface PickupAddressService {
  list(): Promise<DataResult<PickupAddress[]>>;
  save(a: Omit<PickupAddress, 'id'> & { id?: string }): Promise<DataResult<PickupAddress>>;
  remove(id: string): Promise<DataResult<null>>;
  /** Makes one address the default and clears the others, as a single step. */
  makeDefault(id: string): Promise<DataResult<PickupAddress>>;
}

export const MAX_PICKUP_ADDRESSES = 25;
export const MAX_LABEL_LENGTH = 40;
